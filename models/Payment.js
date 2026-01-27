const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const Payment = sequelize.define('Payment', {
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
  invoiceId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  paymentNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  paymentDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  paymentAmount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'bank_transfer', 'cheque', 'credit_card', 'debit_card', 'online', 'other'),
    allowNull: false,
    defaultValue: 'bank_transfer'
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'AED'
  },
  referenceNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bankName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bankAccount: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'failed', 'cancelled', 'refunded'),
    allowNull: false,
    defaultValue: 'pending'
  },
  confirmedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  confirmedBy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  receiptUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  journalEntryId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'payments',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = Payment;

