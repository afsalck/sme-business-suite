const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const ReportTemplate = sequelize.define('ReportTemplate', {
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
  templateName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  templateType: {
    type: DataTypes.ENUM('financial', 'sales', 'expenses', 'payroll', 'compliance', 'custom'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING(50),
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
  columns: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('columns');
      return value ? JSON.parse(value) : null;
    },
    set(value) {
      this.setDataValue('columns', value ? JSON.stringify(value) : null);
    }
  },
  grouping: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('grouping');
      return value ? JSON.parse(value) : null;
    },
    set(value) {
      this.setDataValue('grouping', value ? JSON.stringify(value) : null);
    }
  },
  sorting: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('sorting');
      return value ? JSON.parse(value) : null;
    },
    set(value) {
      this.setDataValue('sorting', value ? JSON.stringify(value) : null);
    }
  },
  chartType: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  chartConfig: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('chartConfig');
      return value ? JSON.parse(value) : null;
    },
    set(value) {
      this.setDataValue('chartConfig', value ? JSON.stringify(value) : null);
    }
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  createdBy: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  tableName: 'report_templates',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = ReportTemplate;

