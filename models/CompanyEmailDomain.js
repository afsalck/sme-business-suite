/**
 * Company Email Domain Model
 * 
 * Maps email domains to companies for multi-tenancy.
 * Allows multiple domains per company (e.g., customera.com and customera-ae.com → Company 1)
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const CompanyEmailDomain = sequelize.define('CompanyEmailDomain', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Company ID this domain maps to'
  },
  emailDomain: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    comment: 'Email domain (e.g., "gmail.com", "customera.com")'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether this domain mapping is active'
  }
}, {
  tableName: 'company_email_domains',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      fields: ['emailDomain'],
      unique: true
    },
    {
      fields: ['companyId']
    },
    {
      fields: ['isActive']
    }
  ]
});

module.exports = CompanyEmailDomain;

