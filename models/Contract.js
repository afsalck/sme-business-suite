const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const Contract = sequelize.define('Contract', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  contractNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  employeeId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  contractType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'full-time'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  basicSalary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  allowance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: false
  },
  terms: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  pdfUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'draft', // draft, active, expired, terminated
    validate: {
      isIn: [['draft', 'active', 'expired', 'terminated']]
    }
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
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Company/tenant ID for multi-tenancy'
  }
}, {
  tableName: 'contracts',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = Contract;

