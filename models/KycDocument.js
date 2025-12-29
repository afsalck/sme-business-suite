const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const KycDocument = sequelize.define('KycDocument', {
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
  // Document Information
  documentType: {
    type: DataTypes.ENUM('passport', 'emirates_id', 'trade_license', 'proof_of_address', 'bank_statement', 'other'),
    allowNull: false
  },
  documentName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  documentNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  issueDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  expiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  issuingAuthority: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  issuingCountry: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  // File Storage
  filePath: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  fileSize: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  // Verification
  verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  verifiedBy: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  verificationNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Status
  status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected', 'expired'),
    allowNull: false,
    defaultValue: 'pending'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Metadata
  uploadedBy: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  uploadedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'kyc_documents',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = KycDocument;

