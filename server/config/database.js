const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({
  path: path.resolve(__dirname, "..", "..", ".env")
});

// SQL Server connection configuration
const sequelize = new Sequelize(
  process.env.DB_NAME || 'bizease',
  process.env.DB_USER || 'sa',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433'),
    dialect: 'mssql',
    dialectOptions: {
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true', // Use true for Azure SQL, false for local
        trustServerCertificate: process.env.DB_TRUST_CERT === 'true' || true, // For local SQL Server
        enableArithAbort: true,
        requestTimeout: 30000, // 30 seconds
        connectionTimeout: 30000,
        dateFormat: 'ymd', // SQL Server date format
        useUTC: false // Use local time instead of UTC
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  }
);

// Test connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ SQL Server connection established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to SQL Server:', error.message);
    return false;
  }
}

module.exports = { sequelize, testConnection };
