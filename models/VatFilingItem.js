const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const VatFilingItem = sequelize.define('VatFilingItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  vatFilingId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  invoiceId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  itemType: {
    type: DataTypes.ENUM('invoice', 'adjustment', 'other'),
    allowNull: false,
    defaultValue: 'invoice'
  },
  invoiceNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  invoiceDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  customerName: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  customerTRN: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  taxableAmount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  zeroRatedAmount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  exemptAmount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  vatAmount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  totalAmount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Company/tenant ID for multi-tenancy'
  }
}, {
  tableName: 'vat_filing_items',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false
});

module.exports = VatFilingItem;

