const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const Sale = sequelize.define('Sale', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  summary: {
    type: DataTypes.STRING,
    allowNull: true
  },
  items: {
    type: DataTypes.TEXT, // Use TEXT for JSON in SQL Server
    allowNull: false,
    get() {
      const value = this.getDataValue('items');
      return typeof value === 'string' ? JSON.parse(value) : value;
    },
    set(value) {
      this.setDataValue('items', typeof value === 'string' ? value : JSON.stringify(value));
    }
  },
  totalSales: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  totalVAT: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdByUid: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'createdByUid'
  },
  createdByDisplayName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'createdByDisplayName'
  },
  createdByEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'createdByEmail'
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Company/tenant ID for multi-tenancy'
  }
}, {
  tableName: 'sales',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = Sale;
