const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const ChartOfAccount = sequelize.define('ChartOfAccount', {
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
  accountCode: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  accountName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  accountType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']]
    }
  },
  parentAccountId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'chart_of_accounts',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  openingBalance: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  currentBalance: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'chart_of_accounts',
  schema: 'dbo',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    { fields: ['accountCode'] },
    { fields: ['accountType'] },
    { fields: ['companyId'] },
    { fields: ['parentAccountId'] }
  ]
});

// Self-referential relationship for parent accounts
ChartOfAccount.hasMany(ChartOfAccount, {
  as: 'childAccounts',
  foreignKey: 'parentAccountId'
});

ChartOfAccount.belongsTo(ChartOfAccount, {
  as: 'parentAccount',
  foreignKey: 'parentAccountId'
});

module.exports = ChartOfAccount;

