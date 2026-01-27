const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const EmployeeAttendance = sequelize.define('EmployeeAttendance', {
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
  employeeId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  checkIn: {
    type: DataTypes.DATE,
    allowNull: true
  },
  checkOut: {
    type: DataTypes.DATE,
    allowNull: true
  },
  totalHours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0
  },
  overtimeHours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('present', 'absent', 'late', 'half-day', 'leave'),
    allowNull: false,
    defaultValue: 'present'
  },
  notes: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'employee_attendance',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      unique: true,
      fields: ['employeeId', 'date']
    }
  ]
});

module.exports = EmployeeAttendance;

