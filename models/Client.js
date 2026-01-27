const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const Client = sequelize.define('Client', {
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
  // Basic Information
  clientType: {
    type: DataTypes.ENUM('individual', 'company'),
    allowNull: false,
    defaultValue: 'individual'
  },
  fullName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  nationality: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  // Company Information
  companyName: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  tradeLicenseNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  companyRegistrationDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  // Identification
  emiratesId: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  passportNumber: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  passportCountry: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  passportExpiry: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  trn: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  // Address
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'UAE'
  },
  postalCode: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  // KYC Status
  kycStatus: {
    type: DataTypes.ENUM('pending', 'in_review', 'approved', 'rejected', 'expired'),
    allowNull: false,
    defaultValue: 'pending'
  },
  kycLevel: {
    type: DataTypes.ENUM('basic', 'enhanced', 'simplified'),
    allowNull: false,
    defaultValue: 'basic'
  },
  riskScore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  riskCategory: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    allowNull: false,
    defaultValue: 'low'
  },
  // AML Screening
  amlStatus: {
    type: DataTypes.ENUM('pending', 'cleared', 'flagged', 'blocked'),
    allowNull: false,
    defaultValue: 'pending'
  },
  amlScreenedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  amlScreenedBy: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  amlMatchFound: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  amlMatchDetails: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Verification
  identityVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  identityVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  identityVerifiedBy: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  identityVerificationMethod: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  // Compliance
  pepStatus: {
    type: DataTypes.ENUM('politically_exposed_person', 'family_member', 'close_associate', 'none'),
    allowNull: true
  },
  sanctionsCheck: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  sanctionsMatch: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  // Metadata
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  onboardedBy: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  onboardedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  lastReviewedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastReviewedBy: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'clients',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = Client;

