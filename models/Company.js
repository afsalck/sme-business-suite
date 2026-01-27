const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const Company = sequelize.define('Company', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    defaultValue: 1
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'BizEase UAE'
  },
  shopName: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  trn: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  website: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  logo: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  enabledModules: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    get() {
      const value = this.getDataValue('enabledModules');
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch (e) {
        return null;
      }
    },
    set(value) {
      if (value === null || value === undefined) {
        this.setDataValue('enabledModules', null);
      } else {
        this.setDataValue('enabledModules', JSON.stringify(value));
      }
    }
  }
}, {
  tableName: 'companies',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = Company;
