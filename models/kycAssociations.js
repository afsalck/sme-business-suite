/**
 * KYC/AML Model Associations
 * Centralizes associations to avoid circular dependencies
 */

const Client = require('./Client');
const KycDocument = require('./KycDocument');
const AmlScreening = require('./AmlScreening');
const KycAuditLog = require('./KycAuditLog');

// Client has many KycDocuments
Client.hasMany(KycDocument, {
  foreignKey: 'clientId',
  as: 'documents',
  onDelete: 'CASCADE'
});

// KycDocument belongs to Client
KycDocument.belongsTo(Client, {
  foreignKey: 'clientId',
  as: 'client'
});

// Client has many AmlScreenings
Client.hasMany(AmlScreening, {
  foreignKey: 'clientId',
  as: 'amlScreenings',
  onDelete: 'CASCADE'
});

// AmlScreening belongs to Client
AmlScreening.belongsTo(Client, {
  foreignKey: 'clientId',
  as: 'client'
});

// Client has many KycAuditLogs
Client.hasMany(KycAuditLog, {
  foreignKey: 'clientId',
  as: 'auditLogs',
  onDelete: 'CASCADE'
});

// KycAuditLog belongs to Client
KycAuditLog.belongsTo(Client, {
  foreignKey: 'clientId',
  as: 'client'
});

module.exports = {
  Client,
  KycDocument,
  AmlScreening,
  KycAuditLog
};

