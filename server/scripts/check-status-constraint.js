const { sequelize, testConnection } = require('../config/database');
const { QueryTypes } = require('sequelize');

/**
 * Check the status CHECK constraint values
 */
async function checkStatusConstraint() {
  try {
    console.log('🔍 Checking status constraint...\n');
    
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Cannot connect to SQL Server.');
      process.exit(1);
    }

    // Get CHECK constraint definition
    const constraints = await sequelize.query(
      `SELECT 
        cc.CHECK_CLAUSE
      FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
      JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu 
        ON cc.CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
      WHERE ccu.TABLE_NAME = 'invoices' 
        AND ccu.COLUMN_NAME = 'status'`,
      { type: QueryTypes.SELECT }
    );

    if (constraints.length > 0) {
      console.log('📋 Status CHECK constraint:');
      constraints.forEach(con => {
        console.log(`   ${con.CHECK_CLAUSE}`);
      });
    } else {
      console.log('⚠️  No CHECK constraint found for status column');
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

checkStatusConstraint();

