const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Basic Information
  fullName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  nationality: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Identity Documents
  emiratesId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  passportNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Document Expiry Dates
  passportExpiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  visaExpiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  insuranceExpiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Status Fields
  visaStatus: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'active'
  },
  insuranceStatus: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'active'
  },
  // Employment Details
  designation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contractType: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'full-time' // full-time, part-time, contract, temporary
  },
  // Salary Information
  basicSalary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  allowance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  joiningDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Document URLs
  passportUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  emiratesIdUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  visaUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  insuranceUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Legacy fields (for backward compatibility) - computed after fetch
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Audit fields
  createdByUid: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'createdByUid'
  },
  createdByDisplayName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'createdByDisplayName'
  },
  createdByEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'createdByEmail'
  }
}, {
  tableName: 'employees',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = Employee;
