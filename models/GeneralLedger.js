const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const GeneralLedger = sequelize.define('GeneralLedger', {
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
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'chart_of_accounts',
      key: 'id'
    }
  },
  journalEntryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'journal_entries',
      key: 'id'
    }
  },
  journalEntryLineId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'journal_entry_lines',
      key: 'id'
    }
  },
  entryDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  debitAmount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  creditAmount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  runningBalance: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  reference: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'general_ledger',
  schema: 'dbo',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false, // General ledger entries are immutable
  indexes: [
    { fields: ['accountId'] },
    { fields: ['entryDate'] },
    { fields: ['journalEntryId'] },
    { fields: ['companyId'] }
  ]
});

module.exports = GeneralLedger;

