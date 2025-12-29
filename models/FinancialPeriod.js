const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const FinancialPeriod = sequelize.define('FinancialPeriod', {
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
    type: DataTypes.STRING(100),
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'open',
    validate: {
      isIn: [['open', 'closed', 'locked']]
    }
  },
  closedBy: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  closedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'financial_periods',
  schema: 'dbo',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    { fields: ['startDate'] },
    { fields: ['endDate'] },
    { fields: ['status'] },
    { fields: ['companyId'] }
  ]
});

module.exports = FinancialPeriod;

