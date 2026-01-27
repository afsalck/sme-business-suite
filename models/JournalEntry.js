const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const JournalEntry = sequelize.define('JournalEntry', {
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
  entryNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  entryDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  reference: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  referenceType: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  referenceId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'draft',
    validate: {
      isIn: [['draft', 'posted', 'reversed']]
    }
  },
  reversedEntryId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  postedBy: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  postedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'journal_entries',
  schema: 'dbo',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    { fields: ['entryNumber'] },
    { fields: ['entryDate'] },
    { fields: ['status'] },
    { fields: ['referenceType', 'referenceId'] },
    { fields: ['companyId'] }
  ]
});

module.exports = JournalEntry;

