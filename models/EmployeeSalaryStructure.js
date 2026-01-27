const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const EmployeeSalaryStructure = sequelize.define('EmployeeSalaryStructure', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  employeeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  // Salary Components
  basicSalary: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  housingAllowance: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  transportAllowance: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  foodAllowance: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  medicalAllowance: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  otherAllowances: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  // Deduction Settings
  incomeTaxRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0
  },
  socialSecurityRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0
  },
  // UAE Labor Law Settings
  gratuityEligible: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  annualLeaveDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30
  },
  overtimeEligible: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  overtimeRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 1.25
  },
  // Bank Details
  bankName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bankAccountNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  iban: {
    type: DataTypes.STRING,
    allowNull: true
  },
  swiftCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Status
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  effectiveFrom: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  effectiveTo: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'employee_salary_structure',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = EmployeeSalaryStructure;

