const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const KycAuditLog = sequelize.define('KycAuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  clientId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  // Action Details
  action: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  actionType: {
    type: DataTypes.ENUM('create', 'update', 'delete', 'verify', 'screen', 'approve', 'reject'),
    allowNull: false
  },
  entityType: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  // Changes
  oldValue: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  newValue: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Metadata
  performedBy: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  performedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  ipAddress: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  userAgent: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
}, {
  tableName: 'kyc_audit_log',
  timestamps: false // Uses performedAt instead
});

module.exports = KycAuditLog;

