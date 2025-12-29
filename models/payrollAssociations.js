// Payroll Module Associations
// Centralized to avoid circular dependencies

const PayrollPeriod = require('./PayrollPeriod');
const PayrollRecord = require('./PayrollRecord');
const EmployeeSalaryStructure = require('./EmployeeSalaryStructure');
const EmployeeLeaveRecord = require('./EmployeeLeaveRecord');
const EmployeeAttendance = require('./EmployeeAttendance');
const Employee = require('./Employee');

// Payroll Period -> Payroll Records (One-to-Many)
PayrollPeriod.hasMany(PayrollRecord, {
  foreignKey: 'payrollPeriodId',
  as: 'payrollRecords'
});
PayrollRecord.belongsTo(PayrollPeriod, {
  foreignKey: 'payrollPeriodId',
  as: 'period'
});

// Employee -> Payroll Records (One-to-Many)
Employee.hasMany(PayrollRecord, {
  foreignKey: 'employeeId',
  as: 'payrollRecords'
});
PayrollRecord.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee'
});

// Employee -> Salary Structure (One-to-One)
Employee.hasOne(EmployeeSalaryStructure, {
  foreignKey: 'employeeId',
  as: 'salaryStructure'
});
EmployeeSalaryStructure.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee'
});

// Employee -> Leave Records (One-to-Many)
Employee.hasMany(EmployeeLeaveRecord, {
  foreignKey: 'employeeId',
  as: 'leaveRecords'
});
EmployeeLeaveRecord.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee'
});

// Employee -> Attendance Records (One-to-Many)
Employee.hasMany(EmployeeAttendance, {
  foreignKey: 'employeeId',
  as: 'attendanceRecords'
});
EmployeeAttendance.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee'
});

module.exports = {
  PayrollPeriod,
  PayrollRecord,
  EmployeeSalaryStructure,
  EmployeeLeaveRecord,
  EmployeeAttendance
};

