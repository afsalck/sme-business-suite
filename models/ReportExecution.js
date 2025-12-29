const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const ReportExecution = sequelize.define('ReportExecution', {
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
    allowNull: true
  },
  scheduledReportId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  executionType: {
    type: DataTypes.ENUM('manual', 'scheduled', 'api'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('running', 'completed', 'failed', 'cancelled'),
    allowNull: false,
    defaultValue: 'running'
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  executionTime: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  resultCount: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  filePath: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  fileSize: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  executedBy: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  parameters: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('parameters');
      return value ? JSON.parse(value) : null;
    },
    set(value) {
      this.setDataValue('parameters', value ? JSON.stringify(value) : null);
    }
  }
}, {
  tableName: 'report_executions',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false
});

module.exports = ReportExecution;

