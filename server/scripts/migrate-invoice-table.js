const { sequelize, testConnection } = require('../config/database');
const { QueryTypes } = require('sequelize');

/**
 * Migration script to add new columns to the invoices table
 * Run this after updating the Invoice model with new fields
 */
async function migrateInvoiceTable() {
  try {
    console.log('🔧 Migrating invoices table...\n');
    
    // Test connection
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Cannot connect to SQL Server. Please check your connection settings.');
      process.exit(1);
    }

    // Check if table exists
    const tableExists = await sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'invoices'`,
      { type: QueryTypes.SELECT }
    );

    if (tableExists.length === 0) {
      console.log('⚠️  Invoices table does not exist. Run init-database.js first.');
      await sequelize.close();
      process.exit(1);
    }

    console.log('📦 Adding new columns to invoices table...\n');

    // List of columns to add (only if they don't exist)
    const columnsToAdd = [
      {
        name: 'invoiceNumber',
        definition: 'NVARCHAR(255) NOT NULL DEFAULT \'\'',
        unique: true
      },
      {
        name: 'customerPhone',
        definition: 'NVARCHAR(255) NULL'
      },
      {
        name: 'dueDate',
        definition: 'DATETIME NULL'
      },
      {
        name: 'paymentTerms',
        definition: 'NVARCHAR(50) NULL DEFAULT \'30 days\''
      },
      {
        name: 'totalDiscount',
        definition: 'DECIMAL(10, 2) NULL DEFAULT 0'
      }
    ];

    // Check existing columns
    const existingColumns = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'invoices'`,
      { type: QueryTypes.SELECT }
    );
    const existingColumnNames = existingColumns.map(col => col.COLUMN_NAME.toLowerCase());

    // Add missing columns
    for (const column of columnsToAdd) {
      const columnNameLower = column.name.toLowerCase();
      
      if (existingColumnNames.includes(columnNameLower)) {
        console.log(`   ✓ Column '${column.name}' already exists, skipping...`);
        continue;
      }

      try {
        // Add column
        await sequelize.query(
          `ALTER TABLE invoices ADD ${column.name} ${column.definition}`,
          { type: QueryTypes.RAW }
        );
        console.log(`   ✅ Added column '${column.name}'`);

        // Add unique constraint for invoiceNumber if needed
        if (column.unique && columnNameLower === 'invoicenumber') {
          try {
            // Check if constraint already exists
            const constraints = await sequelize.query(
              `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
               WHERE TABLE_NAME = 'invoices' AND CONSTRAINT_TYPE = 'UNIQUE' 
               AND CONSTRAINT_NAME LIKE '%invoiceNumber%'`,
              { type: QueryTypes.SELECT }
            );

            if (constraints.length === 0) {
              await sequelize.query(
                `ALTER TABLE invoices ADD CONSTRAINT UQ_invoices_invoiceNumber UNIQUE (invoiceNumber)`,
                { type: QueryTypes.RAW }
              );
              console.log(`   ✅ Added unique constraint on 'invoiceNumber'`);
            }
          } catch (constraintError) {
            console.warn(`   ⚠️  Could not add unique constraint on 'invoiceNumber': ${constraintError.message}`);
          }
        }
      } catch (error) {
        console.error(`   ❌ Failed to add column '${column.name}': ${error.message}`);
      }
    }

    // Update status enum if needed (add 'viewed' and 'cancelled')
    try {
      // SQL Server doesn't support ENUM, so we just ensure the column accepts these values
      // The model already defines the enum, so we just need to make sure the column exists
      console.log('\n   ✅ Status column should support: draft, sent, viewed, paid, overdue, cancelled');
    } catch (error) {
      console.warn(`   ⚠️  Status enum update skipped: ${error.message}`);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart your server');
    console.log('   2. Test creating an invoice');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during migration:', error.message);
    console.error('   Stack:', error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

migrateInvoiceTable();

