const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const AmlScreening = sequelize.define('AmlScreening', {
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
  // Screening Details
  screeningType: {
    type: DataTypes.ENUM('sanctions', 'pep', 'adverse_media', 'watchlist'),
    allowNull: false,
    defaultValue: 'sanctions'
  },
  screeningSource: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  screeningDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  // Results
  matchFound: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  matchScore: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  matchDetails: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  matchedLists: {
    type: DataTypes.TEXT, // JSON array
    allowNull: true,
    get() {
      const value = this.getDataValue('matchedLists');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('matchedLists', value ? JSON.stringify(value) : null);
    }
  },
  // Decision
  decision: {
    type: DataTypes.ENUM('pending', 'cleared', 'flagged', 'blocked'),
    allowNull: false,
    defaultValue: 'pending'
  },
  decisionNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  decidedBy: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  decidedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Metadata
  screenedBy: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  tableName: 'aml_screenings',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = AmlScreening;

