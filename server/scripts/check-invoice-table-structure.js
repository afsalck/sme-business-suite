const { sequelize, testConnection } = require('../config/database');
const { QueryTypes } = require('sequelize');

/**
 * Check the current structure of the invoices table
 */
async function checkInvoiceTableStructure() {
  try {
    console.log('🔍 Checking invoices table structure...\n');
    
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Cannot connect to SQL Server.');
      process.exit(1);
    }

    // Get all columns
    const columns = await sequelize.query(
      `SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'invoices'
      ORDER BY ORDINAL_POSITION`,
      { type: QueryTypes.SELECT }
    );

    console.log('📋 Current table structure:\n');
    columns.forEach(col => {
      console.log(`   ${col.COLUMN_NAME}:`);
      console.log(`      Type: ${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''}`);
      console.log(`      Nullable: ${col.IS_NULLABLE}`);
      console.log(`      Default: ${col.COLUMN_DEFAULT || 'NULL'}`);
      console.log('');
    });

    // Check constraints
    const constraints = await sequelize.query(
      `SELECT 
        CONSTRAINT_NAME,
        CONSTRAINT_TYPE
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_NAME = 'invoices'`,
      { type: QueryTypes.SELECT }
    );

    if (constraints.length > 0) {
      console.log('🔒 Constraints:\n');
      constraints.forEach(con => {
        console.log(`   ${con.CONSTRAINT_NAME}: ${con.CONSTRAINT_TYPE}`);
      });
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('   Stack:', error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

checkInvoiceTableStructure();

