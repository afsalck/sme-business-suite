const { sequelize, testConnection } = require('../config/database');
const { QueryTypes } = require('sequelize');

/**
 * Fix invoice date columns - change datetimeoffset to datetime for SQL Server compatibility
 */
async function fixInvoiceDateColumns() {
  try {
    console.log('🔧 Fixing invoice date columns...\n');
    
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Cannot connect to SQL Server.');
      process.exit(1);
    }

    // Check current column types
    const columns = await sequelize.query(
      `SELECT 
        COLUMN_NAME,
        DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'invoices' 
        AND COLUMN_NAME IN ('issueDate', 'dueDate', 'createdAt', 'updatedAt')`,
      { type: QueryTypes.SELECT }
    );

    console.log('📋 Current date column types:');
    columns.forEach(col => {
      console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE}`);
    });
    console.log('');

    // Fix issueDate if it's datetimeoffset
    const issueDateCol = columns.find(c => c.COLUMN_NAME === 'issueDate');
    if (issueDateCol && issueDateCol.DATA_TYPE === 'datetimeoffset') {
      console.log('🔧 Converting issueDate from datetimeoffset to datetime...');
      try {
        // SQL Server: Convert datetimeoffset to datetime
        await sequelize.query(
          `ALTER TABLE invoices ALTER COLUMN issueDate DATETIME NOT NULL`,
          { type: QueryTypes.RAW }
        );
        console.log('   ✅ issueDate converted to datetime\n');
      } catch (error) {
        console.error(`   ❌ Failed to convert issueDate: ${error.message}`);
        // Try alternative approach - create new column, copy data, drop old, rename
        console.log('   Trying alternative approach...');
        try {
          await sequelize.query(`
            ALTER TABLE invoices ADD issueDate_new DATETIME;
            UPDATE invoices SET issueDate_new = CAST(issueDate AS DATETIME);
            ALTER TABLE invoices DROP COLUMN issueDate;
            EXEC sp_rename 'invoices.issueDate_new', 'issueDate', 'COLUMN';
            ALTER TABLE invoices ALTER COLUMN issueDate DATETIME NOT NULL;
          `, { type: QueryTypes.RAW });
          console.log('   ✅ issueDate converted using alternative method\n');
        } catch (altError) {
          console.error(`   ❌ Alternative method also failed: ${altError.message}\n`);
        }
      }
    } else {
      console.log('   ✓ issueDate is already datetime\n');
    }

    // Fix createdAt and updatedAt if they're datetimeoffset
    const createdAtCol = columns.find(c => c.COLUMN_NAME === 'createdAt');
    if (createdAtCol && createdAtCol.DATA_TYPE === 'datetimeoffset') {
      console.log('🔧 Converting createdAt from datetimeoffset to datetime...');
      try {
        await sequelize.query(
          `ALTER TABLE invoices ALTER COLUMN createdAt DATETIME NOT NULL`,
          { type: QueryTypes.RAW }
        );
        console.log('   ✅ createdAt converted to datetime\n');
      } catch (error) {
        console.warn(`   ⚠️  Could not convert createdAt: ${error.message}\n`);
      }
    }

    const updatedAtCol = columns.find(c => c.COLUMN_NAME === 'updatedAt');
    if (updatedAtCol && updatedAtCol.DATA_TYPE === 'datetimeoffset') {
      console.log('🔧 Converting updatedAt from datetimeoffset to datetime...');
      try {
        await sequelize.query(
          `ALTER TABLE invoices ALTER COLUMN updatedAt DATETIME NOT NULL`,
          { type: QueryTypes.RAW }
        );
        console.log('   ✅ updatedAt converted to datetime\n');
      } catch (error) {
        console.warn(`   ⚠️  Could not convert updatedAt: ${error.message}\n`);
      }
    }

    console.log('✅ Date column fixes completed!');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('   Stack:', error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

fixInvoiceDateColumns();

