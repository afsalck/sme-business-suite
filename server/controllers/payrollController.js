const payrollService = require('../services/payrollService');
const { generatePayslipPdf } = require('../services/pdfService');
const { sequelize } = require('../config/database');
const {
  PayrollRecord,
  PayrollPeriod,
  EmployeeSalaryStructure
} = require('../../models/payrollAssociations');
const Employee = require('../../models/Employee');

/**
 * Create Payroll Period
 */
async function createPayrollPeriod(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { periodName, periodType, startDate, endDate, payDate } = req.body;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    console.log('[Payroll Controller] Received request to create period:', {
      periodName,
      periodType,
      startDate,
      endDate,
      payDate
    });

    if (!periodName || !startDate || !endDate || !payDate) {
      return res.status(400).json({ message: 'Period name, start date, end date, and pay date are required' });
    }

    const period = await payrollService.createPayrollPeriod({
      periodName,
      periodType: periodType || 'monthly',
      startDate,
      endDate,
      payDate,
      companyId
    });

    console.log('[Payroll Controller] ✓ Period created successfully, returning response');
    res.status(201).json(period);
  } catch (error) {
    console.error('[Payroll Controller] ✗ Create period error:', error);
    console.error('[Payroll Controller] Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to create payroll period', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Get Payroll Periods
 */
async function getPayrollPeriods(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { status } = req.query;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const periods = await payrollService.getPayrollPeriods({ companyId, status });
    res.json(periods);
  } catch (error) {
    console.error('[Payroll] Get periods error:', error);
    res.status(500).json({ message: 'Failed to fetch payroll periods', error: error.message });
  }
}

/**
 * Process Payroll
 */
async function processPayroll(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { payrollPeriodId, employeeIds } = req.body;
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const processedBy = req.user?.email || req.user?.uid || 'unknown';

    console.log('[Payroll Controller] Processing payroll request:', {
      payrollPeriodId,
      employeeIds,
      employeeIdsType: Array.isArray(employeeIds) ? 'array' : typeof employeeIds,
      employeeIdsLength: Array.isArray(employeeIds) ? employeeIds.length : 'N/A'
    });

    if (!payrollPeriodId) {
      return res.status(400).json({ message: 'Payroll period ID is required' });
    }

    // Normalize employeeIds - ensure it's an array or null
    let normalizedEmployeeIds = null;
    if (employeeIds) {
      if (Array.isArray(employeeIds)) {
        normalizedEmployeeIds = employeeIds.length > 0 ? employeeIds : null;
      } else if (typeof employeeIds === 'string') {
        // Handle comma-separated string
        normalizedEmployeeIds = employeeIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        if (normalizedEmployeeIds.length === 0) normalizedEmployeeIds = null;
      } else {
        // Single number
        const id = parseInt(employeeIds);
        if (!isNaN(id)) {
          normalizedEmployeeIds = [id];
        }
      }
    }

    console.log('[Payroll Controller] Normalized employee IDs:', normalizedEmployeeIds);

    const result = await payrollService.processPayroll({
      payrollPeriodId: parseInt(payrollPeriodId),
      employeeIds: normalizedEmployeeIds,
      companyId,
      processedBy
    });

    res.json(result);
  } catch (error) {
    console.error('[Payroll] Process payroll error:', error);
    console.error('[Payroll] Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to process payroll', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Get Payroll Records
 */
async function getPayrollRecords(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { payrollPeriodId, employeeId } = req.query;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const records = await payrollService.getPayrollRecords({
      payrollPeriodId: payrollPeriodId ? parseInt(payrollPeriodId) : null,
      employeeId: employeeId ? parseInt(employeeId) : null,
      companyId
    });

    res.json(records);
  } catch (error) {
    console.error('[Payroll] Get records error:', error);
    res.status(500).json({ message: 'Failed to fetch payroll records', error: error.message });
  }
}

/**
 * Approve Payroll Record
 */
async function approvePayrollRecord(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { id } = req.params;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    console.log('[Payroll Controller] Approving payroll record:', { id, companyId });

    const record = await payrollService.approvePayrollRecord({
      payrollRecordId: parseInt(id),
      companyId
    });

    console.log('[Payroll Controller] ✓ Approval successful:', { id, status: record.status });
    res.json(record);
  } catch (error) {
    console.error('[Payroll Controller] ✗ Approve record error:', error);
    console.error('[Payroll Controller] Error stack:', error.stack);
    
    // Provide more specific error messages
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ 
      message: error.message || 'Failed to approve payroll record', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Mark Payroll as Paid
 */
async function markPayrollAsPaid(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { id } = req.params;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    console.log('[Payroll Controller] Marking payroll record as paid:', { id, companyId });

    const record = await payrollService.markPayrollAsPaid({
      payrollRecordId: parseInt(id),
      companyId
    });

    console.log('[Payroll Controller] ✓ Mark as paid successful:', { id, status: record.status });
    res.json(record);
  } catch (error) {
    console.error('[Payroll Controller] ✗ Mark as paid error:', error);
    console.error('[Payroll Controller] Error stack:', error.stack);
    
    // Provide more specific error messages
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ 
      message: error.message || 'Failed to mark payroll as paid', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Generate Payslip PDF
 */
async function generatePayslip(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { id } = req.params;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    console.log('[Payroll] Generating payslip for record:', id);

    const payrollRecord = await PayrollRecord.findOne({
      where: { id: parseInt(id), companyId },
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
      ]
    });

    if (!payrollRecord) {
      console.error('[Payroll] Payroll record not found:', id);
      return res.status(404).json({ message: 'Payroll record not found' });
    }

    console.log('[Payroll] Payroll record found:', {
      id: payrollRecord.id,
      employee: payrollRecord.employee?.fullName,
      period: payrollRecord.period?.periodName
    });

    const payrollData = payrollRecord.get({ plain: true });
    console.log('[Payroll] Generating PDF with data:', {
      employeeId: payrollData.employee?.id,
      periodName: payrollData.period?.periodName,
      grossSalary: payrollData.grossSalary,
      netSalary: payrollData.totalPayable || payrollData.netSalary
    });

    const pdfBuffer = await generatePayslipPdf(payrollData);
    
    if (!pdfBuffer) {
      throw new Error('PDF generation returned null or undefined');
    }

    console.log('[Payroll] PDF generated successfully, buffer size:', pdfBuffer.byteLength || pdfBuffer.length);

    // Mark payslip as generated
    try {
      await payrollRecord.update({
        payslipGenerated: true,
        payslipGeneratedAt: new Date()
      });
    } catch (updateError) {
      console.warn('[Payroll] Failed to mark payslip as generated (non-critical):', updateError.message);
      // Continue anyway - PDF generation succeeded
    }

    // Convert ArrayBuffer to Buffer if needed
    let buffer;
    if (pdfBuffer instanceof ArrayBuffer) {
      buffer = Buffer.from(pdfBuffer);
    } else if (Buffer.isBuffer(pdfBuffer)) {
      buffer = pdfBuffer;
    } else {
      buffer = Buffer.from(pdfBuffer);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payslip-${id}.pdf`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
    
    console.log('[Payroll] ✓ Payslip sent successfully');
  } catch (error) {
    console.error('[Payroll] ✗ Generate payslip error:', error);
    console.error('[Payroll] Error stack:', error.stack);
    console.error('[Payroll] Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    
    // If headers already sent, we can't send JSON response
    if (res.headersSent) {
      console.error('[Payroll] Headers already sent, cannot send error response');
      return;
    }
    
    res.status(500).json({ 
      message: 'Failed to generate payslip', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Get Employee Salary Structure
 */
async function getEmployeeSalaryStructure(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { employeeId } = req.params;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const structure = await payrollService.getEmployeeSalaryStructure({
      employeeId: parseInt(employeeId),
      companyId
    });

    if (!structure) {
      return res.status(404).json({ message: 'Salary structure not found' });
    }

    res.json(structure);
  } catch (error) {
    console.error('[Payroll] Get salary structure error:', error);
    res.status(500).json({ message: 'Failed to fetch salary structure', error: error.message });
  }
}

/**
 * Save Employee Salary Structure
 */
async function saveEmployeeSalaryStructure(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { employeeId } = req.params;
    const salaryData = req.body;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const structure = await payrollService.saveEmployeeSalaryStructure({
      employeeId: parseInt(employeeId),
      salaryData,
      companyId
    });

    res.json(structure);
  } catch (error) {
    console.error('[Payroll] Save salary structure error:', error);
    res.status(500).json({ message: 'Failed to save salary structure', error: error.message });
  }
}

module.exports = {
  createPayrollPeriod,
  getPayrollPeriods,
  processPayroll,
  getPayrollRecords,
  approvePayrollRecord,
  markPayrollAsPaid,
  generatePayslip,
  getEmployeeSalaryStructure,
  saveEmployeeSalaryStructure
};

