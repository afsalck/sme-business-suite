const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  attachmentUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // New fields for upgraded module
  supplier: {
    type: DataTypes.STRING,
    allowNull: true
  },
  paymentType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  receiptUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  vatApplicable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  vatAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  deletedAt: {
    type: DataTypes.DATE,
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
  },
  updatedByUid: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'updatedByUid'
  },
  updatedByDisplayName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'updatedByDisplayName'
  },
  updatedByEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'updatedByEmail'
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Company/tenant ID for multi-tenancy'
  }
}, {
  tableName: 'expenses',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  paranoid: false // We'll handle soft delete manually with deletedAt
});

module.exports = Expense;
