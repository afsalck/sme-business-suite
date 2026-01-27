/**
 * Simple Migration Script: Add companyId Columns
 * 
 * This script adds companyId column to all necessary tables using raw SQL.
 * Use this if the Sequelize migration doesn't work.
 * 
 * Usage:
 *   node scripts/add-companyid-migration-simple.js
 */

const { sequelize } = require('../server/config/database');

async function addCompanyIdColumns() {
  try {
    console.log('🔄 Starting companyId migration...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const queries = [
      // Add companyId to users table
      `IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'users') AND name = 'companyId'
      )
      BEGIN
        ALTER TABLE users ADD companyId INT NOT NULL DEFAULT 1;
        CREATE INDEX IX_Users_CompanyId ON users(companyId);
        PRINT 'Added companyId to users table';
      END`,

      // Add companyId to invoices table
      `IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'invoices') AND name = 'companyId'
      )
      BEGIN
        ALTER TABLE invoices ADD companyId INT NOT NULL DEFAULT 1;
        CREATE INDEX IX_Invoices_CompanyId ON invoices(companyId);
        PRINT 'Added companyId to invoices table';
      END`,

      // Add companyId to inventoryItems table
      `IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'inventoryItems') AND name = 'companyId'
      )
      BEGIN
        ALTER TABLE inventoryItems ADD companyId INT NOT NULL DEFAULT 1;
        CREATE INDEX IX_InventoryItems_CompanyId ON inventoryItems(companyId);
        PRINT 'Added companyId to inventoryItems table';
      END`,

      // Add companyId to sales table
      `IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'sales') AND name = 'companyId'
      )
      BEGIN
        ALTER TABLE sales ADD companyId INT NOT NULL DEFAULT 1;
        CREATE INDEX IX_Sales_CompanyId ON sales(companyId);
        PRINT 'Added companyId to sales table';
      END`
    ];

    for (let i = 0; i < queries.length; i++) {
      try {
        console.log(`\n📋 Executing query ${i + 1}/${queries.length}...`);
        await sequelize.query(queries[i]);
        console.log(`✅ Query ${i + 1} executed successfully`);
      } catch (error) {
        // Check if error is because column already exists
        if (error.message && error.message.includes('already exists')) {
          console.log(`⏭️  Column already exists, skipping...`);
        } else {
          console.error(`❌ Error executing query ${i + 1}:`, error.message);
          throw error;
        }
      }
    }

    // Verify columns were added
    console.log('\n🔍 Verifying columns were added...');
    const verifyQuery = `
      SELECT 
          TABLE_NAME,
          COLUMN_NAME,
          DATA_TYPE,
          IS_NULLABLE,
          COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE COLUMN_NAME = 'companyId'
      ORDER BY TABLE_NAME;
    `;
    
    const results = await sequelize.query(verifyQuery, {
      type: sequelize.QueryTypes.SELECT
    });

    if (results.length > 0) {
      console.log('\n✅ Verification successful! Found companyId in:');
      results.forEach(row => {
        console.log(`   - ${row.TABLE_NAME} (${row.DATA_TYPE}, Default: ${row.COLUMN_DEFAULT})`);
      });
    } else {
      console.log('\n⚠️  Warning: No companyId columns found. Migration may have failed.');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: node scripts/assign-companyid-to-existing-data.js');
    console.log('2. Configure email domain mapping in server/middleware/authMiddleware.js');
    console.log('3. Test login and verify data isolation');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 Alternative: Run the SQL script directly in SSMS:');
    console.error('   scripts/add-companyid-columns.sql');
    console.error('\nError details:', error);
    process.exit(1);
  }
}

// Run migration
addCompanyIdColumns();

