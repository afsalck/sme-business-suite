const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const VatAdjustment = sequelize.define('VatAdjustment', {
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
  type: {
    type: DataTypes.ENUM('credit', 'debit'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false
  },
  vatImpact: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false
  },
  referenceNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  supportingDocument: {
    type: DataTypes.STRING,
    allowNull: true
  },
  createdByUid: {
    type: DataTypes.STRING,
    allowNull: true
  },
  createdByDisplayName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  createdByEmail: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'vat_adjustments',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = VatAdjustment;

