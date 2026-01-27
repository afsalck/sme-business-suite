const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const LeaveRequest = sequelize.define('LeaveRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  employeeId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  leaveType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'annual', // annual, sick, personal, emergency, unpaid
    validate: {
      isIn: [['annual', 'sick', 'personal', 'emergency', 'unpaid']]
    }
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  totalDays: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending', // pending, approved, rejected, cancelled
    validate: {
      isIn: [['pending', 'approved', 'rejected', 'cancelled']]
    }
  },
  approvedBy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Audit fields
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
  tableName: 'leaveRequests',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = LeaveRequest;

