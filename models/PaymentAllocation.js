const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const PaymentAllocation = sequelize.define('PaymentAllocation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  paymentId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  invoiceId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  allocatedAmount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false
  },
  allocatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Company/tenant ID for multi-tenancy'
  }
}, {
  tableName: 'payment_allocations',
  timestamps: false
});

module.exports = PaymentAllocation;

