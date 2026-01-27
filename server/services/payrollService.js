/**
 * Payroll Processing Service
 * Handles payroll calculation, processing, and management
 */

const { sequelize } = require('../config/database');
const dayjs = require('dayjs');
const {
  PayrollPeriod,
  PayrollRecord,
  EmployeeSalaryStructure,
  EmployeeLeaveRecord,
  EmployeeAttendance
} = require('../../models/payrollAssociations');
const Employee = require('../../models/Employee');
const uaeLaborLaw = require('./uaeLaborLawService');

/**
 * Create a new payroll period
 * Uses raw SQL to avoid Sequelize date handling issues with SQL Server
 */
async function createPayrollPeriod({ periodName, periodType, startDate, endDate, payDate, companyId = 1 }) {
  try {
    console.log('[Payroll] Creating payroll period:', { periodName, periodType, startDate, endDate, payDate, companyId });
    
    // Format dates for SQL Server (YYYY-MM-DD HH:mm:ss)
    const dayjs = require('dayjs');
    const formatDate = (date) => {
      if (!date) return null;
      return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
    };
    
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    const formattedPayDate = formatDate(payDate);
    const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');
    
    // Use raw SQL to insert, similar to accounting module
    const [result] = await sequelize.query(`
      INSERT INTO [dbo].[payroll_periods]
        ([companyId], [periodName], [periodType], [startDate], [endDate], [payDate], [status], [createdAt], [updatedAt])
      OUTPUT INSERTED.id, INSERTED.companyId, INSERTED.periodName, INSERTED.periodType, INSERTED.startDate, INSERTED.endDate, INSERTED.payDate, INSERTED.status, INSERTED.processedBy, INSERTED.processedAt, INSERTED.createdAt, INSERTED.updatedAt
      VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `, {
      replacements: [
        companyId,
        periodName,
        periodType || 'monthly',
        formattedStartDate,
        formattedEndDate,
        formattedPayDate,
        formattedNow,
        formattedNow
      ],
      type: sequelize.QueryTypes.SELECT
    });

    // Extract the inserted row
    const rows = Array.isArray(result) ? result : [result];
    const insertedRow = rows[0];
    
    if (!insertedRow || !insertedRow.id) {
      console.error('[Payroll] Unexpected insert result structure:', result);
      throw new Error('Failed to create payroll period - invalid result structure');
    }

    console.log('[Payroll] ✓ Payroll period created successfully:', insertedRow.id);
    return insertedRow;
  } catch (error) {
    console.error('[Payroll] ✗ Error creating payroll period:', error);
    console.error('[Payroll] Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    });
    throw error;
  }
}

/**
 * Get all payroll periods
 */
async function getPayrollPeriods({ companyId = 1, status = null } = {}) {
  const where = { companyId };
  if (status) {
    where.status = status;
  }

  const periods = await PayrollPeriod.findAll({
    where,
    order: [['startDate', 'DESC']],
    include: [{
      model: PayrollRecord,
      as: 'payrollRecords',
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['id', 'fullName', 'email', 'designation']
      }]
    }]
  });

  return periods.map(p => p.get({ plain: true }));
}

/**
 * Process payroll for a specific period
 * This is the main payroll processing function
 */
async function processPayroll({ payrollPeriodId, employeeIds = null, companyId = 1, processedBy = 'system' }) {
  const transaction = await sequelize.transaction();

  try {
    console.log('[Payroll] Starting payroll processing:', { payrollPeriodId, employeeIds, companyId, processedBy });
    
    // Get payroll period
    const period = await PayrollPeriod.findByPk(payrollPeriodId, { transaction });
    if (!period) {
      throw new Error('Payroll period not found');
    }

    console.log('[Payroll] Period found:', period.periodName, 'Status:', period.status);

    if (period.status === 'completed' || period.status === 'locked') {
      throw new Error('Payroll period is already completed or locked');
    }

    // Format processedAt date for SQL Server
    const dayjs = require('dayjs');
    const formattedProcessedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const formattedNowForUpdate = dayjs().format('YYYY-MM-DD HH:mm:ss');
    
    // Update period status to processing using raw SQL to avoid date issues
    try {
      await sequelize.query(`
        UPDATE [dbo].[payroll_periods]
        SET [status] = 'processing', [processedBy] = ?, [processedAt] = ?, [updatedAt] = ?
        WHERE [id] = ?
      `, {
        replacements: [processedBy, formattedProcessedAt, formattedNowForUpdate, payrollPeriodId],
        transaction
      });
      console.log('[Payroll] Period status updated to processing');
    } catch (updateError) {
      console.error('[Payroll] ✗ Error updating period status:', updateError);
      throw updateError;
    }

    // Get active employees
    let employees;
    try {
      console.log('[Payroll] Fetching employees...');
      if (employeeIds && employeeIds.length > 0) {
        console.log('[Payroll] Fetching specific employees:', employeeIds);
        // Convert employeeIds to integers if they're strings
        const employeeIdArray = employeeIds.map(id => parseInt(id)).filter(id => !isNaN(id));
        employees = await Employee.findAll({
          where: {
            id: employeeIdArray
          },
          transaction
        });
      } else {
        console.log('[Payroll] Fetching all employees');
        // Get all employees (Employee model doesn't have companyId field)
        employees = await Employee.findAll({
          transaction
        });
      }
      console.log(`[Payroll] ✓ Found ${employees.length} employees to process`);
      
      if (employees.length > 0) {
        console.log('[Payroll] Employee IDs:', employees.map(e => e.id).join(', '));
      }
    } catch (employeeError) {
      console.error('[Payroll] ✗ Error fetching employees:', employeeError);
      console.error('[Payroll] Employee error details:', {
        message: employeeError.message,
        name: employeeError.name,
        stack: employeeError.stack?.split('\n').slice(0, 5).join('\n')
      });
      throw employeeError;
    }

    if (employees.length === 0) {
      const errorMsg = 'No employees found to process payroll';
      console.error(`[Payroll] ✗ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const payrollRecords = [];

    for (const employee of employees) {
      try {
        console.log(`[Payroll] Processing employee ${employee.id}: ${employee.fullName || employee.name || 'N/A'}`);
        
        // Get or create salary structure
        let salaryStructure = await EmployeeSalaryStructure.findOne({
          where: { employeeId: employee.id, isActive: true },
          transaction
        });

      // If no salary structure, create one from employee's basic salary
      if (!salaryStructure) {
        const basicSalary = parseFloat(employee.basicSalary || employee.salary || 0);
        console.log(`[Payroll] No salary structure found for employee ${employee.id}, creating from basic salary:`, basicSalary);
        
        if (basicSalary > 0) {
          try {
            // Use raw SQL to avoid date issues
            const dayjs = require('dayjs');
            const effectiveFrom = employee.joiningDate 
              ? dayjs(employee.joiningDate).format('YYYY-MM-DD HH:mm:ss')
              : dayjs().format('YYYY-MM-DD HH:mm:ss');
            const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');
            
            const [structureResult] = await sequelize.query(`
              INSERT INTO [dbo].[employee_salary_structure]
                ([companyId], [employeeId], [basicSalary], [housingAllowance], [transportAllowance], [foodAllowance], [medicalAllowance], [otherAllowances], [incomeTaxRate], [socialSecurityRate], [gratuityEligible], [annualLeaveDays], [overtimeEligible], [overtimeRate], [isActive], [effectiveFrom], [createdAt], [updatedAt])
              OUTPUT INSERTED.id, INSERTED.companyId, INSERTED.employeeId, INSERTED.basicSalary, INSERTED.housingAllowance, INSERTED.transportAllowance, INSERTED.foodAllowance, INSERTED.medicalAllowance, INSERTED.otherAllowances, INSERTED.incomeTaxRate, INSERTED.socialSecurityRate, INSERTED.gratuityEligible, INSERTED.annualLeaveDays, INSERTED.overtimeEligible, INSERTED.overtimeRate, INSERTED.isActive, INSERTED.effectiveFrom, INSERTED.createdAt, INSERTED.updatedAt
              VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 1, 30, 1, 1.25, 1, ?, ?, ?)
            `, {
              replacements: [
                companyId,
                employee.id,
                basicSalary,
                parseFloat(employee.allowance || employee.housingAllowance || 0),
                parseFloat(employee.transportAllowance || 0),
                effectiveFrom,
                formattedNow,
                formattedNow
              ],
              transaction,
              type: sequelize.QueryTypes.SELECT
            });
            
            const structureRows = Array.isArray(structureResult) ? structureResult : [structureResult];
            const insertedStructure = structureRows[0];
            
            if (!insertedStructure || !insertedStructure.id) {
              throw new Error('Failed to create salary structure - invalid result');
            }
            
            // Use the inserted structure directly (it's already a plain object)
            salaryStructure = insertedStructure;
            
            console.log(`[Payroll] ✓ Created salary structure for employee ${employee.id}`);
          } catch (structureError) {
            console.error(`[Payroll] ✗ Error creating salary structure for employee ${employee.id}:`, structureError);
            throw structureError;
          }
        } else {
          console.log(`[Payroll] ⚠️ Skipping employee ${employee.id} - no basic salary (${basicSalary})`);
          continue;
        }
      } else {
        console.log(`[Payroll] Using existing salary structure for employee ${employee.id}`);
      }

      // Calculate payroll for this employee
      let payrollData;
      try {
        console.log(`[Payroll] Calculating payroll for employee ${employee.id}...`);
        
        // Ensure we have plain objects
        const employeePlain = employee.get ? employee.get({ plain: true }) : employee;
        const salaryStructurePlain = salaryStructure.get ? salaryStructure.get({ plain: true }) : salaryStructure;
        const periodPlain = period.get ? period.get({ plain: true }) : period;
        
        payrollData = await calculateEmployeePayroll({
          employee: employeePlain,
          salaryStructure: salaryStructurePlain,
          period: periodPlain,
          companyId,
          transaction
        });
        console.log(`[Payroll] ✓ Calculated payroll for employee ${employee.id}, net salary:`, payrollData.totalPayable || payrollData.netSalary);
      } catch (calcError) {
        console.error(`[Payroll] ✗ Error calculating payroll for employee ${employee.id}:`, calcError);
        console.error(`[Payroll] Calculation error details:`, {
          message: calcError.message,
          stack: calcError.stack?.split('\n').slice(0, 3).join('\n')
        });
        throw calcError;
      }

      // Create payroll record using raw SQL to avoid date issues
      try {
        console.log(`[Payroll] Creating payroll record for employee ${employee.id}...`);
        const payrollRecord = await createPayrollRecordRaw(payrollData, transaction);
        console.log(`[Payroll] ✓ Created payroll record for employee ${employee.id}:`, payrollRecord.id);
        payrollRecords.push(payrollRecord);
      } catch (recordError) {
        console.error(`[Payroll] ✗ Error creating payroll record for employee ${employee.id}:`, recordError);
        console.error(`[Payroll] Record error details:`, {
          message: recordError.message,
          stack: recordError.stack?.split('\n').slice(0, 3).join('\n')
        });
        throw recordError;
      }
      } catch (employeeProcessingError) {
        console.error(`[Payroll] ✗ Failed to process employee ${employee.id}:`, employeeProcessingError);
        console.error(`[Payroll] Employee processing error details:`, {
          employeeId: employee.id,
          employeeName: employee.fullName || employee.name,
          message: employeeProcessingError.message,
          stack: employeeProcessingError.stack?.split('\n').slice(0, 5).join('\n')
        });
        // Continue with next employee instead of failing entire payroll
        console.log(`[Payroll] ⚠️ Skipping employee ${employee.id} and continuing with others...`);
        continue;
      }
    }

    // Update period status to completed using raw SQL
    const formattedNowForComplete = dayjs().format('YYYY-MM-DD HH:mm:ss');
    await sequelize.query(`
      UPDATE [dbo].[payroll_periods]
      SET [status] = 'completed', [updatedAt] = ?
      WHERE [id] = ?
    `, {
      replacements: [formattedNowForComplete, payrollPeriodId],
      transaction
    });

    await transaction.commit();
    console.log('[Payroll] ✓ Payroll processing completed successfully');

    // Get period data as plain object
    const periodData = period.get ? period.get({ plain: true }) : period;
    
    return {
      period: periodData,
      records: payrollRecords,
      totalEmployees: payrollRecords.length,
      totalAmount: payrollRecords.reduce((sum, r) => sum + parseFloat(r.totalPayable || 0), 0)
    };
  } catch (error) {
    console.error('[Payroll] ✗ Processing error caught:', error);
    console.error('[Payroll] Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      parent: error.parent?.message,
      sql: error.sql,
      stack: error.stack?.split('\n').slice(0, 15).join('\n')
    });
    
    // Only rollback if transaction is still active
    if (transaction) {
      try {
        // Check if transaction is still active
        if (!transaction.finished) {
          console.log('[Payroll] Attempting to rollback transaction...');
          await transaction.rollback();
          console.log('[Payroll] ✓ Transaction rolled back successfully');
        } else {
          console.log('[Payroll] ⚠️ Transaction already finished, skipping rollback');
        }
      } catch (rollbackError) {
        console.error('[Payroll] ✗ Error during rollback:', rollbackError.message);
        console.error('[Payroll] Rollback error details:', {
          message: rollbackError.message,
          name: rollbackError.name,
          code: rollbackError.code
        });
      }
    } else {
      console.log('[Payroll] ⚠️ No transaction to rollback');
    }
    
    throw error;
  }
}

/**
 * Create payroll record using raw SQL (to avoid date issues)
 */
async function createPayrollRecordRaw(payrollData, transaction) {
  const dayjs = require('dayjs');
  const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
  const [result] = await sequelize.query(`
    INSERT INTO [dbo].[payroll_records]
      ([companyId], [payrollPeriodId], [employeeId], [basicSalary], [housingAllowance], [transportAllowance], [otherAllowances], [totalAllowances], [grossSalary], [incomeTax], [socialSecurity], [otherDeductions], [totalDeductions], [gratuityAmount], [annualLeaveDays], [annualLeaveAmount], [overtimeHours], [overtimeAmount], [netSalary], [totalPayable], [status], [createdBy], [createdAt], [updatedAt])
    OUTPUT INSERTED.id, INSERTED.companyId, INSERTED.payrollPeriodId, INSERTED.employeeId, INSERTED.basicSalary, INSERTED.housingAllowance, INSERTED.transportAllowance, INSERTED.otherAllowances, INSERTED.totalAllowances, INSERTED.grossSalary, INSERTED.incomeTax, INSERTED.socialSecurity, INSERTED.otherDeductions, INSERTED.totalDeductions, INSERTED.gratuityAmount, INSERTED.annualLeaveDays, INSERTED.annualLeaveAmount, INSERTED.overtimeHours, INSERTED.overtimeAmount, INSERTED.netSalary, INSERTED.totalPayable, INSERTED.status, INSERTED.createdBy, INSERTED.createdAt, INSERTED.updatedAt
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, {
    replacements: [
      payrollData.companyId || 1,
      payrollData.payrollPeriodId,
      payrollData.employeeId,
      parseFloat(payrollData.basicSalary || 0),
      parseFloat(payrollData.housingAllowance || 0),
      parseFloat(payrollData.transportAllowance || 0),
      parseFloat(payrollData.otherAllowances || 0),
      parseFloat(payrollData.totalAllowances || 0),
      parseFloat(payrollData.grossSalary || 0),
      parseFloat(payrollData.incomeTax || 0),
      parseFloat(payrollData.socialSecurity || 0),
      parseFloat(payrollData.otherDeductions || 0),
      parseFloat(payrollData.totalDeductions || 0),
      parseFloat(payrollData.gratuityAmount || 0),
      parseFloat(payrollData.annualLeaveDays || 0),
      parseFloat(payrollData.annualLeaveAmount || 0),
      parseFloat(payrollData.overtimeHours || 0),
      parseFloat(payrollData.overtimeAmount || 0),
      parseFloat(payrollData.netSalary || 0),
      parseFloat(payrollData.totalPayable || 0),
      payrollData.status || 'draft',
      payrollData.createdBy || 'system',
      formattedNow,
      formattedNow
    ],
    transaction,
    type: sequelize.QueryTypes.SELECT
  });

  const rows = Array.isArray(result) ? result : [result];
  const insertedRow = rows[0];
  
  if (!insertedRow || !insertedRow.id) {
    console.error('[Payroll] Unexpected insert result structure:', result);
    throw new Error('Failed to create payroll record - invalid result structure');
  }

  return insertedRow;
}

/**
 * Calculate payroll for a single employee
 */
async function calculateEmployeePayroll({ employee, salaryStructure, period, companyId, transaction }) {
  const { startDate, endDate } = period;
  const joiningDate = employee.joiningDate || new Date();

  // Basic salary components
  const basicSalary = parseFloat(salaryStructure.basicSalary || 0);
  const housingAllowance = parseFloat(salaryStructure.housingAllowance || 0);
  const transportAllowance = parseFloat(salaryStructure.transportAllowance || 0);
  const foodAllowance = parseFloat(salaryStructure.foodAllowance || 0);
  const medicalAllowance = parseFloat(salaryStructure.medicalAllowance || 0);
  const otherAllowances = parseFloat(salaryStructure.otherAllowances || 0);

  const totalAllowances = housingAllowance + transportAllowance + foodAllowance + medicalAllowance + otherAllowances;
  const grossSalary = basicSalary + totalAllowances;

  // Calculate overtime
  let attendanceRecords = [];
  try {
    const { Op } = require('sequelize');
    attendanceRecords = await EmployeeAttendance.findAll({
      where: {
        employeeId: employee.id,
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      transaction
    });
  } catch (attendanceError) {
    console.warn(`[Payroll] Could not fetch attendance records for employee ${employee.id}:`, attendanceError.message);
    // Continue without attendance records - overtime will be 0
  }

  const totalOvertimeHours = attendanceRecords.reduce((sum, record) => {
    return sum + parseFloat(record.overtimeHours || 0);
  }, 0);

  let overtimeAmount = 0;
  if (totalOvertimeHours > 0 && salaryStructure.overtimeEligible) {
    const overtimeCalc = uaeLaborLaw.calculateOvertime({
      basicSalary,
      overtimeHours: totalOvertimeHours,
      overtimeType: 'regular'
    });
    overtimeAmount = overtimeCalc.overtimeAmount;
  }

  // Calculate annual leave accrual for the period
  const leaveCalc = uaeLaborLaw.calculateAnnualLeave({
    joiningDate,
    asOfDate: endDate,
    usedLeaveDays: 0 // This should be calculated from leave records
  });

  // Calculate leave used in this period
  let leaveRecords = [];
  try {
    const { Op } = require('sequelize');
    leaveRecords = await EmployeeLeaveRecord.findAll({
      where: {
        employeeId: employee.id,
        status: 'approved',
        startDate: {
          [Op.lte]: endDate
        },
        endDate: {
          [Op.gte]: startDate
        }
      },
      transaction
    });
  } catch (leaveError) {
    console.warn(`[Payroll] Could not fetch leave records for employee ${employee.id}:`, leaveError.message);
    // Continue without leave records - leave deduction will be 0
  }

  let leaveDaysUsed = 0;
  for (const leave of leaveRecords) {
    const leaveStart = dayjs(leave.startDate);
    const leaveEnd = dayjs(leave.endDate);
    const periodStart = dayjs(startDate);
    const periodEnd = dayjs(endDate);

    // Calculate overlapping days
    const overlapStart = leaveStart.isAfter(periodStart) ? leaveStart : periodStart;
    const overlapEnd = leaveEnd.isBefore(periodEnd) ? leaveEnd : periodEnd;
    
    if (overlapStart.isBefore(overlapEnd) || overlapStart.isSame(overlapEnd)) {
      const days = overlapEnd.diff(overlapStart, 'day') + 1;
      leaveDaysUsed += days;
    }
  }

  // Calculate leave encashment if applicable
  const annualLeaveAmount = leaveDaysUsed > 0
    ? uaeLaborLaw.calculateLeaveEncashment({ basicSalary, leaveDays: leaveDaysUsed })
    : 0;

  // Calculate deductions
  const incomeTax = grossSalary * (parseFloat(salaryStructure.incomeTaxRate || 0) / 100);
  const socialSecurity = grossSalary * (parseFloat(salaryStructure.socialSecurityRate || 0) / 100);
  const otherDeductions = 0; // Can be added from other sources
  const totalDeductions = incomeTax + socialSecurity + otherDeductions;

  // Calculate net salary
  const netSalary = grossSalary - totalDeductions;

  // Calculate gratuity (if applicable - usually at end of service, but can be accrued)
  const gratuityAmount = 0; // Gratuity is typically calculated at termination

  // Total payable
  const totalPayable = netSalary + overtimeAmount - annualLeaveAmount;

  return {
    companyId,
    payrollPeriodId: period.id,
    employeeId: employee.id,
    basicSalary,
    housingAllowance,
    transportAllowance,
    otherAllowances: foodAllowance + medicalAllowance + otherAllowances,
    totalAllowances,
    grossSalary,
    incomeTax,
    socialSecurity,
    otherDeductions,
    totalDeductions,
    gratuityAmount,
    annualLeaveDays: leaveDaysUsed,
    annualLeaveAmount,
    overtimeHours: totalOvertimeHours,
    overtimeAmount,
    netSalary,
    totalPayable,
    status: 'draft',
    createdBy: 'system'
  };
}

/**
 * Get payroll records for a period
 */
async function getPayrollRecords({ payrollPeriodId, employeeId = null, companyId = 1 } = {}) {
  const where = { companyId };
  if (payrollPeriodId) {
    where.payrollPeriodId = payrollPeriodId;
  }
  if (employeeId) {
    where.employeeId = employeeId;
  }

  const records = await PayrollRecord.findAll({
    where,
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['id', 'fullName', 'email', 'designation', 'phone']
      },
      {
        model: PayrollPeriod,
        as: 'period',
        attributes: ['id', 'periodName', 'startDate', 'endDate', 'payDate']
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  return records.map(r => r.get({ plain: true }));
}

/**
 * Approve payroll record
 */
async function approvePayrollRecord({ payrollRecordId, companyId = 1 }) {
  console.log('[Payroll] Approving payroll record:', { payrollRecordId, companyId });
  
  const record = await PayrollRecord.findOne({
    where: { id: payrollRecordId, companyId }
  });

  if (!record) {
    console.error('[Payroll] Payroll record not found:', { payrollRecordId, companyId });
    throw new Error(`Payroll record not found for ID: ${payrollRecordId}`);
  }

  console.log('[Payroll] Found record:', {
    id: record.id,
    currentStatus: record.status,
    employeeId: record.employeeId,
    periodId: record.payrollPeriodId
  });

  // Check if already approved
  if (record.status === 'approved') {
    console.log('[Payroll] Record already approved');
    return record.get({ plain: true });
  }

  // Check if can be approved (should be draft)
  if (record.status !== 'draft') {
    const errorMsg = `Cannot approve payroll record with status: ${record.status}. Only 'draft' records can be approved.`;
    console.error('[Payroll]', errorMsg);
    throw new Error(errorMsg);
  }

  try {
    // Use raw SQL to avoid SQL Server date conversion issues
    const formattedDate = dayjs().format('YYYY-MM-DD HH:mm:ss');
    
    await sequelize.query(
      `UPDATE payroll_records 
       SET status = :status, updatedAt = :updatedAt 
       WHERE id = :id AND companyId = :companyId`,
      {
        replacements: {
          status: 'approved',
          updatedAt: formattedDate,
          id: payrollRecordId,
          companyId: companyId
        },
        type: sequelize.QueryTypes.UPDATE
      }
    );
    
    // Reload to get fresh data
    await record.reload();
    
    console.log('[Payroll] ✓ Record approved successfully:', {
      id: record.id,
      newStatus: 'approved'
    });
    
    return record.get({ plain: true });
  } catch (updateError) {
    console.error('[Payroll] ✗ Failed to update record:', updateError);
    console.error('[Payroll] Error details:', {
      name: updateError.name,
      message: updateError.message,
      code: updateError.code,
      stack: updateError.stack
    });
    throw new Error(`Failed to approve payroll record: ${updateError.message}`);
  }
}

/**
 * Mark payroll record as paid
 */
async function markPayrollAsPaid({ payrollRecordId, companyId = 1 }) {
  console.log('[Payroll] Marking payroll record as paid:', { payrollRecordId, companyId });
  
  const record = await PayrollRecord.findOne({
    where: { id: payrollRecordId, companyId }
  });

  if (!record) {
    console.error('[Payroll] Payroll record not found:', { payrollRecordId, companyId });
    throw new Error(`Payroll record not found for ID: ${payrollRecordId}`);
  }

  console.log('[Payroll] Found record:', {
    id: record.id,
    currentStatus: record.status,
    employeeId: record.employeeId
  });

  // Check if already paid
  if (record.status === 'paid') {
    console.log('[Payroll] Record already marked as paid');
    return record.get({ plain: true });
  }

  // Check if can be marked as paid (should be approved)
  if (record.status !== 'approved') {
    const errorMsg = `Cannot mark payroll record as paid with status: ${record.status}. Only 'approved' records can be marked as paid.`;
    console.error('[Payroll]', errorMsg);
    throw new Error(errorMsg);
  }

  try {
    // Use raw SQL to avoid SQL Server date conversion issues
    const formattedDate = dayjs().format('YYYY-MM-DD HH:mm:ss');
    
    await sequelize.query(
      `UPDATE payroll_records 
       SET status = :status, updatedAt = :updatedAt 
       WHERE id = :id AND companyId = :companyId`,
      {
        replacements: {
          status: 'paid',
          updatedAt: formattedDate,
          id: payrollRecordId,
          companyId: companyId
        },
        type: sequelize.QueryTypes.UPDATE
      }
    );
    
    // Reload to get fresh data
    await record.reload();
    
    console.log('[Payroll] ✓ Record marked as paid successfully:', {
      id: record.id,
      newStatus: 'paid'
    });
    
    return record.get({ plain: true });
  } catch (updateError) {
    console.error('[Payroll] ✗ Failed to update record:', updateError);
    console.error('[Payroll] Error details:', {
      name: updateError.name,
      message: updateError.message,
      code: updateError.code
    });
    throw new Error(`Failed to mark payroll record as paid: ${updateError.message}`);
  }
}

/**
 * Get employee salary structure
 */
async function getEmployeeSalaryStructure({ employeeId, companyId = 1 }) {
  const structure = await EmployeeSalaryStructure.findOne({
    where: { employeeId, companyId, isActive: true },
    include: [{
      model: Employee,
      as: 'employee',
      attributes: ['id', 'fullName', 'email', 'designation']
    }]
  });

  return structure ? structure.get({ plain: true }) : null;
}

/**
 * Save or update employee salary structure
 */
async function saveEmployeeSalaryStructure({ employeeId, salaryData, companyId = 1 }) {
  console.log('[Payroll] Saving salary structure:', { employeeId, companyId, salaryData });
  
  try {
    // Validate required fields
    if (!employeeId) {
      throw new Error('Employee ID is required');
    }

    // Normalize numeric fields to ensure they're numbers
    const normalizedData = {
      basicSalary: parseFloat(salaryData.basicSalary || 0),
      housingAllowance: parseFloat(salaryData.housingAllowance || 0),
      transportAllowance: parseFloat(salaryData.transportAllowance || 0),
      foodAllowance: parseFloat(salaryData.foodAllowance || 0),
      medicalAllowance: parseFloat(salaryData.medicalAllowance || 0),
      otherAllowances: parseFloat(salaryData.otherAllowances || 0),
      incomeTaxRate: parseFloat(salaryData.incomeTaxRate || 0),
      socialSecurityRate: parseFloat(salaryData.socialSecurityRate || 0),
      gratuityEligible: salaryData.gratuityEligible !== undefined ? Boolean(salaryData.gratuityEligible) : true,
      annualLeaveDays: parseInt(salaryData.annualLeaveDays || 30),
      overtimeEligible: salaryData.overtimeEligible !== undefined ? Boolean(salaryData.overtimeEligible) : true,
      overtimeRate: parseFloat(salaryData.overtimeRate || 1.25),
      bankName: salaryData.bankName || null,
      bankAccountNumber: salaryData.bankAccountNumber || null,
      iban: salaryData.iban || null,
      swiftCode: salaryData.swiftCode || null
    };

    console.log('[Payroll] Normalized salary data:', normalizedData);

    // Find existing structure (unique constraint on employeeId means only one can exist)
    const existing = await EmployeeSalaryStructure.findOne({
      where: { employeeId, companyId }
    });

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

    if (existing) {
      console.log('[Payroll] Updating existing salary structure:', existing.id);
      // Update existing structure using raw SQL to avoid date formatting issues
      const [result] = await sequelize.query(`
        UPDATE [dbo].[employee_salary_structure]
        SET 
          [basicSalary] = ?,
          [housingAllowance] = ?,
          [transportAllowance] = ?,
          [foodAllowance] = ?,
          [medicalAllowance] = ?,
          [otherAllowances] = ?,
          [incomeTaxRate] = ?,
          [socialSecurityRate] = ?,
          [gratuityEligible] = ?,
          [annualLeaveDays] = ?,
          [overtimeEligible] = ?,
          [overtimeRate] = ?,
          [bankName] = ?,
          [bankAccountNumber] = ?,
          [iban] = ?,
          [swiftCode] = ?,
          [isActive] = 1,
          [effectiveFrom] = ?,
          [effectiveTo] = NULL,
          [updatedAt] = ?
        OUTPUT INSERTED.id, INSERTED.companyId, INSERTED.employeeId, INSERTED.basicSalary, INSERTED.housingAllowance,
               INSERTED.transportAllowance, INSERTED.foodAllowance, INSERTED.medicalAllowance, INSERTED.otherAllowances,
               INSERTED.incomeTaxRate, INSERTED.socialSecurityRate, INSERTED.gratuityEligible, INSERTED.annualLeaveDays,
               INSERTED.overtimeEligible, INSERTED.overtimeRate, INSERTED.bankName, INSERTED.bankAccountNumber,
               INSERTED.iban, INSERTED.swiftCode, INSERTED.isActive, INSERTED.effectiveFrom, INSERTED.effectiveTo,
               INSERTED.createdAt, INSERTED.updatedAt
        WHERE [id] = ?
      `, {
        replacements: [
          normalizedData.basicSalary,
          normalizedData.housingAllowance,
          normalizedData.transportAllowance,
          normalizedData.foodAllowance,
          normalizedData.medicalAllowance,
          normalizedData.otherAllowances,
          normalizedData.incomeTaxRate,
          normalizedData.socialSecurityRate,
          normalizedData.gratuityEligible ? 1 : 0,
          normalizedData.annualLeaveDays,
          normalizedData.overtimeEligible ? 1 : 0,
          normalizedData.overtimeRate,
          normalizedData.bankName,
          normalizedData.bankAccountNumber,
          normalizedData.iban,
          normalizedData.swiftCode,
          now, // effectiveFrom
          now, // updatedAt
          existing.id
        ]
      });

      console.log('[Payroll] ✓ Salary structure updated successfully:', result[0]?.id);
      return result[0];
    } else {
      console.log('[Payroll] Creating new salary structure for employee:', employeeId);
      // Create new structure using raw SQL to avoid Sequelize date formatting issues
      const [result] = await sequelize.query(`
        INSERT INTO [dbo].[employee_salary_structure]
          ([companyId], [employeeId], [basicSalary], [housingAllowance], [transportAllowance], 
           [foodAllowance], [medicalAllowance], [otherAllowances], [incomeTaxRate], [socialSecurityRate],
           [gratuityEligible], [annualLeaveDays], [overtimeEligible], [overtimeRate],
           [bankName], [bankAccountNumber], [iban], [swiftCode], [isActive], [effectiveFrom], [createdAt], [updatedAt])
        OUTPUT INSERTED.id, INSERTED.companyId, INSERTED.employeeId, INSERTED.basicSalary, INSERTED.housingAllowance,
               INSERTED.transportAllowance, INSERTED.foodAllowance, INSERTED.medicalAllowance, INSERTED.otherAllowances,
               INSERTED.incomeTaxRate, INSERTED.socialSecurityRate, INSERTED.gratuityEligible, INSERTED.annualLeaveDays,
               INSERTED.overtimeEligible, INSERTED.overtimeRate, INSERTED.bankName, INSERTED.bankAccountNumber,
               INSERTED.iban, INSERTED.swiftCode, INSERTED.isActive, INSERTED.effectiveFrom, INSERTED.effectiveTo,
               INSERTED.createdAt, INSERTED.updatedAt
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      `, {
        replacements: [
          companyId,
          employeeId,
          normalizedData.basicSalary,
          normalizedData.housingAllowance,
          normalizedData.transportAllowance,
          normalizedData.foodAllowance,
          normalizedData.medicalAllowance,
          normalizedData.otherAllowances,
          normalizedData.incomeTaxRate,
          normalizedData.socialSecurityRate,
          normalizedData.gratuityEligible ? 1 : 0,
          normalizedData.annualLeaveDays,
          normalizedData.overtimeEligible ? 1 : 0,
          normalizedData.overtimeRate,
          normalizedData.bankName,
          normalizedData.bankAccountNumber,
          normalizedData.iban,
          normalizedData.swiftCode,
          now, // effectiveFrom
          now, // createdAt
          now  // updatedAt
        ]
      });

      console.log('[Payroll] ✓ Salary structure created successfully:', result[0]?.id);
      return result[0];
    }
  } catch (error) {
    console.error('[Payroll] ✗ Error saving salary structure:', error);
    console.error('[Payroll] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

module.exports = {
  createPayrollPeriod,
  getPayrollPeriods,
  processPayroll,
  getPayrollRecords,
  approvePayrollRecord,
  markPayrollAsPaid,
  getEmployeeSalaryStructure,
  saveEmployeeSalaryStructure,
  calculateEmployeePayroll
};

