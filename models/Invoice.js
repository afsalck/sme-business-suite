const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  supplierTRN: {
    type: DataTypes.STRING,
    allowNull: true
  },
  customerTRN: {
    type: DataTypes.STRING,
    allowNull: true
  },
  vatType: {
    type: DataTypes.ENUM('standard', 'zero', 'exempt'),
    allowNull: false,
    defaultValue: 'standard'
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  vatAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  totalWithVAT: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  taxableSubtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  zeroRatedSubtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  exemptSubtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  discountTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  invoiceNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  customerEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  customerPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  issueDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paymentTerms: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '30 days'
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'AED'
  },
  language: {
    type: DataTypes.ENUM('en', 'ar'),
    defaultValue: 'en'
  },
  items: {
    type: DataTypes.TEXT, // Use TEXT for JSON in SQL Server
    allowNull: false,
    get() {
      const value = this.getDataValue('items');
      return typeof value === 'string' ? JSON.parse(value) : value;
    },
    set(value) {
      this.setDataValue('items', typeof value === 'string' ? value : JSON.stringify(value));
    }
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  totalDiscount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  vatAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'),
    defaultValue: 'draft'
  },
  paidAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  outstandingAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
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
  tableName: 'invoices',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = Invoice;
