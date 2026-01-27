const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const JournalEntryLine = sequelize.define('JournalEntryLine', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  journalEntryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'journal_entries',
      key: 'id'
    }
  },
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'chart_of_accounts',
      key: 'id'
    }
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
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Company/tenant ID for multi-tenancy'
  }
}, {
  tableName: 'journal_entry_lines',
  schema: 'dbo',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    { fields: ['journalEntryId'] },
    { fields: ['accountId'] },
    { fields: ['companyId'] }
  ]
});

module.exports = JournalEntryLine;

