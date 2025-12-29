const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const ScheduledReport = sequelize.define('ScheduledReport', {
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
  reportId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  scheduleType: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly'),
    allowNull: false
  },
  scheduleDay: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  scheduleTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  scheduleMonth: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  deliveryMethod: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'email'
  },
  recipients: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('recipients');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('recipients', value ? JSON.stringify(value) : null);
    }
  },
  format: {
    type: DataTypes.ENUM('pdf', 'excel', 'csv', 'json'),
    allowNull: false,
    defaultValue: 'pdf'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  lastRunAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  nextRunAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  runCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  errorCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  lastError: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  tableName: 'scheduled_reports',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = ScheduledReport;

