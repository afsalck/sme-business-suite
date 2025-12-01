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
    type: DataTypes.ENUM(
      'passport_expiry',
      'visa_expiry',
      'contract_expiry',
      'license_expiry',
      'vat_due',
      'invoice_due'
    ),
    allowNull: false
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
    type: DataTypes.ENUM('unread', 'read'),
    defaultValue: 'unread'
  },
  notificationKey: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'notificationKey',
    comment: 'Unique key to prevent duplicate notifications'
  }
}, {
  tableName: 'notifications',
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
    }
  ]
});

module.exports = Notification;

