/**
 * Database Migration Script: Add companyId to tables
 * 
 * This script adds the companyId column to all tenant-specific tables:
 * - users
 * - invoices
 * - inventoryItems
 * - sales
 * - employees
 * - expenses
 * - leaveRequests
 * - contracts
 * - notifications
 * - journal_entry_lines
 * - vat_filing_items
 * - payment_allocations
 * 
 * Run this script ONCE after deploying the updated models.
 * 
 * Usage:
 *   node scripts/add-companyid-migration.js
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
      END
      ELSE
        PRINT 'companyId already exists in users table';`,

      // Add companyId to invoices table
      `IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'invoices') AND name = 'companyId'
      )
      BEGIN
        ALTER TABLE invoices ADD companyId INT NOT NULL DEFAULT 1;
        CREATE INDEX IX_Invoices_CompanyId ON invoices(companyId);
        PRINT 'Added companyId to invoices table';
      END
      ELSE
        PRINT 'companyId already exists in invoices table';`,

      // Add companyId to inventoryItems table
      `IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'inventoryItems') AND name = 'companyId'
      )
      BEGIN
        ALTER TABLE inventoryItems ADD companyId INT NOT NULL DEFAULT 1;
        CREATE INDEX IX_InventoryItems_CompanyId ON inventoryItems(companyId);
        PRINT 'Added companyId to inventoryItems table';
      END
      ELSE
        PRINT 'companyId already exists in inventoryItems table';`,

      // Add companyId to sales table
      `IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'sales') AND name = 'companyId'
      )
      BEGIN
        ALTER TABLE sales ADD companyId INT NOT NULL DEFAULT 1;
        CREATE INDEX IX_Sales_CompanyId ON sales(companyId);
        PRINT 'Added companyId to sales table';
      END
      ELSE
        PRINT 'companyId already exists in sales table';`,

      // Add companyId to employees table
      `IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'employees') AND name = 'companyId'
      )
      BEGIN
        ALTER TABLE employees ADD companyId INT NOT NULL DEFAULT 1;
        CREATE INDEX IX_Employees_CompanyId ON employees(companyId);
        PRINT 'Added companyId to employees table';
      END
      ELSE
        PRINT 'companyId already exists in employees table';`,

      // Add companyId to expenses table
      `IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'expenses') AND name = 'companyId'
      )
      BEGIN
        ALTER TABLE expenses ADD companyId INT NOT NULL DEFAULT 1;
        CREATE INDEX IX_Expenses_CompanyId ON expenses(companyId);
        PRINT 'Added companyId to expenses table';
      END
      ELSE
        PRINT 'companyId already exists in expenses table';`,

      // Add companyId to leaveRequests table
      `IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'leaveRequests') AND name = 'companyId'
      )
      BEGIN
        ALTER TABLE leaveRequests ADD companyId INT NOT NULL DEFAULT 1;
        CREATE INDEX IX_LeaveRequests_CompanyId ON leaveRequests(companyId);
        PRINT 'Added companyId to leaveRequests table';
      END
      ELSE
        PRINT 'companyId already exists in leaveRequests table';`,

      // Add companyId to contracts table
      `IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'contracts') AND name = 'companyId'
      )
      BEGIN
        ALTER TABLE contracts ADD companyId INT NOT NULL DEFAULT 1;
        CREATE INDEX IX_Contracts_CompanyId ON contracts(companyId);
        PRINT 'Added companyId to contracts table';
      END
      ELSE
        PRINT 'companyId already exists in contracts table';`,

      // Add companyId to notifications table
      `IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'notifications') AND name = 'companyId'
      )
      BEGIN
        ALTER TABLE notifications ADD companyId INT NOT NULL DEFAULT 1;
        CREATE INDEX IX_Notifications_CompanyId ON notifications(companyId);
        PRINT 'Added companyId to notifications table';
      END
      ELSE
        PRINT 'companyId already exists in notifications table';`,

      // Add companyId to journal_entry_lines table
      `IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'journal_entry_lines') AND name = 'companyId'
      )
      BEGIN
        ALTER TABLE journal_entry_lines ADD companyId INT NOT NULL DEFAULT 1;
        CREATE INDEX IX_JournalEntryLines_CompanyId ON journal_entry_lines(companyId);
        PRINT 'Added companyId to journal_entry_lines table';
      END
      ELSE
        PRINT 'companyId already exists in journal_entry_lines table';`,

      // Add companyId to vat_filing_items table
      `IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'vat_filing_items') AND name = 'companyId'
      )
      BEGIN
        ALTER TABLE vat_filing_items ADD companyId INT NOT NULL DEFAULT 1;
        CREATE INDEX IX_VatFilingItems_CompanyId ON vat_filing_items(companyId);
        PRINT 'Added companyId to vat_filing_items table';
      END
      ELSE
        PRINT 'companyId already exists in vat_filing_items table';`,

      // Add companyId to payment_allocations table
      `IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'payment_allocations') AND name = 'companyId'
      )
      BEGIN
        ALTER TABLE payment_allocations ADD companyId INT NOT NULL DEFAULT 1;
        CREATE INDEX IX_PaymentAllocations_CompanyId ON payment_allocations(companyId);
        PRINT 'Added companyId to payment_allocations table';
      END
      ELSE
        PRINT 'companyId already exists in payment_allocations table';`
    ];

    for (const query of queries) {
      try {
        await sequelize.query(query);
        console.log('✅ Query executed successfully');
      } catch (error) {
        console.error('❌ Error executing query:', error.message);
        // Continue with next query even if one fails
      }
    }

    console.log('✅ Migration completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Update email domain mapping in server/middleware/authMiddleware.js');
    console.log('2. Test login with different email domains');
    console.log('3. Verify data isolation between companies');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
addCompanyIdColumns();

