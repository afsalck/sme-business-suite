const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const CompanyVatSettings = sequelize.define('CompanyVatSettings', {
  companyId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    defaultValue: 1
  },
  trn: {
    type: DataTypes.STRING,
    allowNull: true
  },
  vatEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  filingFrequency: {
    type: DataTypes.ENUM('monthly', 'quarterly'),
    defaultValue: 'monthly'
  },
  filingDay: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 28,
    validate: {
      min: 1,
      max: 31
    }
  },
  lastFiledAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'company_vat_settings',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = CompanyVatSettings;

