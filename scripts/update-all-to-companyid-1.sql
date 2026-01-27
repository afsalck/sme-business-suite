-- SQL Script: Update All Data to companyId = 1
-- This script updates all existing data to companyId = 1
-- Run this in SQL Server Management Studio (SSMS)

-- Step 1: Update email domain mapping
UPDATE company_email_domains 
SET companyId = 1, isActive = 1
WHERE emailDomain = 'biz.com';

-- If biz.com doesn't exist, insert it
IF NOT EXISTS (SELECT * FROM company_email_domains WHERE emailDomain = 'biz.com')
BEGIN
    INSERT INTO company_email_domains (companyId, emailDomain, isActive)
    VALUES (1, 'biz.com', 1);
END

-- Step 2: Update all invoices to companyId = 1
UPDATE invoices 
SET companyId = 1
WHERE companyId != 1;

-- Step 3: Update all inventory items to companyId = 1
UPDATE inventoryItems 
SET companyId = 1
WHERE companyId != 1;

-- Step 4: Update all sales to companyId = 1
UPDATE sales 
SET companyId = 1
WHERE companyId != 1;

-- Step 5: Update all expenses to companyId = 1 (if table exists)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'expenses') AND type in (N'U'))
BEGIN
    UPDATE expenses 
    SET companyId = 1
    WHERE companyId != 1 OR companyId IS NULL;
END

-- Step 6: Update all employees to companyId = 1 (if table exists)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'employees') AND type in (N'U'))
BEGIN
    UPDATE employees 
    SET companyId = 1
    WHERE companyId != 1 OR companyId IS NULL;
END

-- Step 7: Update all payments to companyId = 1 (if table exists)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'payments') AND type in (N'U'))
BEGIN
    UPDATE payments 
    SET companyId = 1
    WHERE companyId != 1 OR companyId IS NULL;
END

-- Step 8: Update all journal entries to companyId = 1 (if table exists)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'journal_entries') AND type in (N'U'))
BEGIN
    UPDATE journal_entries 
    SET companyId = 1
    WHERE companyId != 1 OR companyId IS NULL;
END

-- Step 9: Update all general ledger entries to companyId = 1 (if table exists)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'general_ledger') AND type in (N'U'))
BEGIN
    UPDATE general_ledger 
    SET companyId = 1
    WHERE companyId != 1 OR companyId IS NULL;
END

-- Step 10: Verify updates
PRINT '✅ Updates completed!';
PRINT '';
PRINT '📊 Data Summary:';
PRINT '';

SELECT 'Users' AS TableName, companyId, COUNT(*) AS Count
FROM users
GROUP BY companyId
UNION ALL
SELECT 'Invoices', companyId, COUNT(*)
FROM invoices
GROUP BY companyId
UNION ALL
SELECT 'Inventory Items', companyId, COUNT(*)
FROM inventoryItems
GROUP BY companyId
UNION ALL
SELECT 'Sales', companyId, COUNT(*)
FROM sales
GROUP BY companyId
ORDER BY TableName, companyId;

