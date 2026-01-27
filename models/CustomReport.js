const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const CustomReport = sequelize.define('CustomReport', {
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
  templateId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  reportName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  reportType: {
    type: DataTypes.ENUM('financial', 'sales', 'expenses', 'payroll', 'compliance', 'custom'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  config: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      const value = this.getDataValue('config');
      return value ? JSON.parse(value) : {};
    },
    set(value) {
      this.setDataValue('config', JSON.stringify(value));
    }
  },
  filters: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('filters');
      return value ? JSON.parse(value) : null;
    },
    set(value) {
      this.setDataValue('filters', value ? JSON.stringify(value) : null);
    }
  },
  dateRange: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  lastRunAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastRunBy: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  resultCount: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  executionTime: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  isFavorite: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  createdBy: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  tableName: 'custom_reports',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = CustomReport;

