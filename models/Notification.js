const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'userId',
    comment: 'Firebase UID of the user'
  },
  type: {
    type: DataTypes.STRING(50), // SQL Server doesn't support ENUM, use STRING with CHECK constraint
    allowNull: false,
    validate: {
      isIn: [['passport_expiry', 'visa_expiry', 'contract_expiry', 'license_expiry', 'vat_due', 'invoice_due']]
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  link: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(20), // SQL Server doesn't support ENUM, use STRING with CHECK constraint
    defaultValue: 'unread',
    validate: {
      isIn: [['unread', 'read']]
    }
  },
  notificationKey: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'notificationKey',
    comment: 'Unique key to prevent duplicate notifications'
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Company/tenant ID for multi-tenancy'
  }
}, {
  tableName: 'notifications',
  schema: 'dbo', // Explicitly specify schema for SQL Server
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['type']
    },
    {
      fields: ['notificationKey'],
      unique: true
    },
    {
      fields: ['companyId']
    }
  ]
});

module.exports = Notification;

