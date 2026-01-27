const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const VatFiling = sequelize.define('VatFiling', {
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
  filingPeriod: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  filingType: {
    type: DataTypes.ENUM('monthly', 'quarterly'),
    allowNull: false,
    defaultValue: 'monthly'
  },
  periodStartDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  periodEndDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  // Filing Data
  taxableSales: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  zeroRatedSales: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  exemptSales: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  totalVatCollected: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  vatAdjustments: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  netVatPayable: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  totalInvoices: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  // FTA Submission
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'accepted', 'rejected', 'corrected'),
    allowNull: false,
    defaultValue: 'draft'
  },
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  submittedBy: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  ftaReferenceNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  ftaSubmissionId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Files
  ftaXmlFile: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  ftaPdfFile: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  // Metadata
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  tableName: 'vat_filings',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = VatFiling;

