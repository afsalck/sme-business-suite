-- SQL Script to Add companyId Columns
-- Run this script in SQL Server Management Studio (SSMS) or your SQL client
-- This will add companyId column to all necessary tables

USE [YourDatabaseName]; -- Replace with your actual database name
GO

-- Add companyId to users table
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'users') AND name = 'companyId'
)
BEGIN
    ALTER TABLE users ADD companyId INT NOT NULL DEFAULT 1;
    CREATE INDEX IX_Users_CompanyId ON users(companyId);
    PRINT '✅ Added companyId to users table';
END
ELSE
    PRINT '⏭️  companyId already exists in users table';
GO

-- Add companyId to invoices table
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'invoices') AND name = 'companyId'
)
BEGIN
    ALTER TABLE invoices ADD companyId INT NOT NULL DEFAULT 1;
    CREATE INDEX IX_Invoices_CompanyId ON invoices(companyId);
    PRINT '✅ Added companyId to invoices table';
END
ELSE
    PRINT '⏭️  companyId already exists in invoices table';
GO

-- Add companyId to inventoryItems table
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'inventoryItems') AND name = 'companyId'
)
BEGIN
    ALTER TABLE inventoryItems ADD companyId INT NOT NULL DEFAULT 1;
    CREATE INDEX IX_InventoryItems_CompanyId ON inventoryItems(companyId);
    PRINT '✅ Added companyId to inventoryItems table';
END
ELSE
    PRINT '⏭️  companyId already exists in inventoryItems table';
GO

-- Add companyId to sales table
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'sales') AND name = 'companyId'
)
BEGIN
    ALTER TABLE sales ADD companyId INT NOT NULL DEFAULT 1;
    CREATE INDEX IX_Sales_CompanyId ON sales(companyId);
    PRINT '✅ Added companyId to sales table';
END
ELSE
    PRINT '⏭️  companyId already exists in sales table';
GO

PRINT '';
PRINT '✅ Migration completed! All tables now have companyId column.';
PRINT '📋 Next step: Run node scripts/assign-companyid-to-existing-data.js';
GO

