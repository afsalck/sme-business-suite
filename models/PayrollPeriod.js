const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const PayrollPeriod = sequelize.define('PayrollPeriod', {
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
  periodName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  periodType: {
    type: DataTypes.ENUM('monthly', 'bi-weekly', 'weekly'),
    allowNull: false,
    defaultValue: 'monthly'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  payDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'processing', 'completed', 'locked'),
    allowNull: false,
    defaultValue: 'draft'
  },
  processedBy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'payroll_periods',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = PayrollPeriod;

