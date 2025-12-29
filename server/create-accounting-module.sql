-- Accounting Module Database Migration
-- Run this script in your SQL Server database
-- This creates the foundation for double-entry bookkeeping

USE [Biz];
GO

-- ============================================
-- 1. CHART OF ACCOUNTS
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[chart_of_accounts]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[chart_of_accounts] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [companyId] INT NOT NULL DEFAULT 1,
        [accountCode] NVARCHAR(50) NOT NULL UNIQUE,
        [accountName] NVARCHAR(255) NOT NULL,
        [accountType] NVARCHAR(50) NOT NULL CHECK ([accountType] IN (
            'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'
        )),
        [parentAccountId] INT NULL,
        [isActive] BIT NOT NULL DEFAULT 1,
        [openingBalance] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [currentBalance] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [description] NVARCHAR(MAX) NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        FOREIGN KEY ([parentAccountId]) REFERENCES [dbo].[chart_of_accounts]([id]),
        INDEX [IX_chart_of_accounts_accountCode] ([accountCode]),
        INDEX [IX_chart_of_accounts_accountType] ([accountType]),
        INDEX [IX_chart_of_accounts_companyId] ([companyId])
    );
    PRINT 'Chart of Accounts table created successfully';
END
ELSE
BEGIN
    PRINT 'Chart of Accounts table already exists';
END
GO

-- ============================================
-- 2. JOURNAL ENTRIES
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[journal_entries]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[journal_entries] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [companyId] INT NOT NULL DEFAULT 1,
        [entryNumber] NVARCHAR(50) NOT NULL UNIQUE,
        [entryDate] DATETIME NOT NULL,
        [description] NVARCHAR(MAX) NOT NULL,
        [reference] NVARCHAR(255) NULL,
        [referenceType] NVARCHAR(50) NULL, -- 'invoice', 'expense', 'payment', 'manual', etc.
        [referenceId] INT NULL,
        [status] NVARCHAR(20) NOT NULL DEFAULT 'draft' CHECK ([status] IN ('draft', 'posted', 'reversed')),
        [reversedEntryId] INT NULL,
        [createdBy] NVARCHAR(255) NOT NULL,
        [postedBy] NVARCHAR(255) NULL,
        [postedAt] DATETIME NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        INDEX [IX_journal_entries_entryNumber] ([entryNumber]),
        INDEX [IX_journal_entries_entryDate] ([entryDate]),
        INDEX [IX_journal_entries_status] ([status]),
        INDEX [IX_journal_entries_reference] ([referenceType], [referenceId]),
        INDEX [IX_journal_entries_companyId] ([companyId])
    );
    PRINT 'Journal Entries table created successfully';
END
ELSE
BEGIN
    PRINT 'Journal Entries table already exists';
END
GO

-- ============================================
-- 3. JOURNAL ENTRY LINE ITEMS
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[journal_entry_lines]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[journal_entry_lines] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [journalEntryId] INT NOT NULL,
        [accountId] INT NOT NULL,
        [debitAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [creditAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [description] NVARCHAR(MAX) NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        FOREIGN KEY ([journalEntryId]) REFERENCES [dbo].[journal_entries]([id]) ON DELETE CASCADE,
        FOREIGN KEY ([accountId]) REFERENCES [dbo].[chart_of_accounts]([id]),
        INDEX [IX_journal_entry_lines_journalEntryId] ([journalEntryId]),
        INDEX [IX_journal_entry_lines_accountId] ([accountId])
    );
    PRINT 'Journal Entry Lines table created successfully';
END
ELSE
BEGIN
    PRINT 'Journal Entry Lines table already exists';
END
GO

-- ============================================
-- 4. GENERAL LEDGER
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[general_ledger]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[general_ledger] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [companyId] INT NOT NULL DEFAULT 1,
        [accountId] INT NOT NULL,
        [journalEntryId] INT NOT NULL,
        [journalEntryLineId] INT NOT NULL,
        [entryDate] DATETIME NOT NULL,
        [debitAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [creditAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [runningBalance] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [description] NVARCHAR(MAX) NULL,
        [reference] NVARCHAR(255) NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        FOREIGN KEY ([accountId]) REFERENCES [dbo].[chart_of_accounts]([id]),
        FOREIGN KEY ([journalEntryId]) REFERENCES [dbo].[journal_entries]([id]),
        FOREIGN KEY ([journalEntryLineId]) REFERENCES [dbo].[journal_entry_lines]([id]),
        INDEX [IX_general_ledger_accountId] ([accountId]),
        INDEX [IX_general_ledger_entryDate] ([entryDate]),
        INDEX [IX_general_ledger_journalEntryId] ([journalEntryId]),
        INDEX [IX_general_ledger_companyId] ([companyId])
    );
    PRINT 'General Ledger table created successfully';
END
ELSE
BEGIN
    PRINT 'General Ledger table already exists';
END
GO

-- ============================================
-- 5. FINANCIAL PERIODS
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[financial_periods]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[financial_periods] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [companyId] INT NOT NULL DEFAULT 1,
        [periodName] NVARCHAR(100) NOT NULL,
        [startDate] DATETIME NOT NULL,
        [endDate] DATETIME NOT NULL,
        [status] NVARCHAR(20) NOT NULL DEFAULT 'open' CHECK ([status] IN ('open', 'closed', 'locked')),
        [closedBy] NVARCHAR(255) NULL,
        [closedAt] DATETIME NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        INDEX [IX_financial_periods_startDate] ([startDate]),
        INDEX [IX_financial_periods_endDate] ([endDate]),
        INDEX [IX_financial_periods_status] ([status]),
        INDEX [IX_financial_periods_companyId] ([companyId])
    );
    PRINT 'Financial Periods table created successfully';
END
ELSE
BEGIN
    PRINT 'Financial Periods table already exists';
END
GO

-- ============================================
-- 6. INSERT DEFAULT CHART OF ACCOUNTS
-- ============================================
-- Only insert if accounts don't exist
IF NOT EXISTS (SELECT * FROM [dbo].[chart_of_accounts] WHERE [accountCode] = '1000')
BEGIN
    PRINT 'Inserting default Chart of Accounts...';
    
    -- ASSETS
    INSERT INTO [dbo].[chart_of_accounts] ([accountCode], [accountName], [accountType], [parentAccountId], [isActive], [description]) VALUES
    ('1000', 'Assets', 'Asset', NULL, 1, 'Main asset category'),
    ('1100', 'Current Assets', 'Asset', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '1000'), 1, 'Current assets'),
    ('1110', 'Cash and Bank', 'Asset', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '1100'), 1, 'Cash and bank accounts'),
    ('1120', 'Accounts Receivable', 'Asset', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '1100'), 1, 'Money owed by customers'),
    ('1130', 'Inventory', 'Asset', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '1100'), 1, 'Inventory stock'),
    ('1200', 'Fixed Assets', 'Asset', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '1000'), 1, 'Fixed assets'),
    ('1210', 'Equipment', 'Asset', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '1200'), 1, 'Office equipment'),
    ('1220', 'Furniture', 'Asset', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '1200'), 1, 'Office furniture');
    
    -- LIABILITIES
    INSERT INTO [dbo].[chart_of_accounts] ([accountCode], [accountName], [accountType], [parentAccountId], [isActive], [description]) VALUES
    ('2000', 'Liabilities', 'Liability', NULL, 1, 'Main liability category'),
    ('2100', 'Current Liabilities', 'Liability', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '2000'), 1, 'Current liabilities'),
    ('2110', 'Accounts Payable', 'Liability', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '2100'), 1, 'Money owed to suppliers'),
    ('2120', 'VAT Payable', 'Liability', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '2100'), 1, 'VAT owed to tax authority'),
    ('2130', 'Accrued Expenses', 'Liability', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '2100'), 1, 'Accrued expenses');
    
    -- EQUITY
    INSERT INTO [dbo].[chart_of_accounts] ([accountCode], [accountName], [accountType], [parentAccountId], [isActive], [description]) VALUES
    ('3000', 'Equity', 'Equity', NULL, 1, 'Main equity category'),
    ('3100', 'Owner Equity', 'Equity', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '3000'), 1, 'Owner equity'),
    ('3200', 'Retained Earnings', 'Equity', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '3000'), 1, 'Retained earnings');
    
    -- REVENUE
    INSERT INTO [dbo].[chart_of_accounts] ([accountCode], [accountName], [accountType], [parentAccountId], [isActive], [description]) VALUES
    ('4000', 'Revenue', 'Revenue', NULL, 1, 'Main revenue category'),
    ('4100', 'Sales Revenue', 'Revenue', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '4000'), 1, 'Sales revenue'),
    ('4110', 'Service Revenue', 'Revenue', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '4000'), 1, 'Service revenue');
    
    -- EXPENSES
    INSERT INTO [dbo].[chart_of_accounts] ([accountCode], [accountName], [accountType], [parentAccountId], [isActive], [description]) VALUES
    ('5000', 'Expenses', 'Expense', NULL, 1, 'Main expense category'),
    ('5100', 'Cost of Goods Sold', 'Expense', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '5000'), 1, 'COGS'),
    ('5200', 'Operating Expenses', 'Expense', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '5000'), 1, 'Operating expenses'),
    ('5210', 'Salaries and Wages', 'Expense', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '5200'), 1, 'Employee salaries'),
    ('5220', 'Rent', 'Expense', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '5200'), 1, 'Office rent'),
    ('5230', 'Utilities', 'Expense', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '5200'), 1, 'Utilities'),
    ('5240', 'Office Supplies', 'Expense', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '5200'), 1, 'Office supplies'),
    ('5250', 'Marketing', 'Expense', (SELECT id FROM [dbo].[chart_of_accounts] WHERE accountCode = '5200'), 1, 'Marketing expenses');
    
    PRINT 'Default Chart of Accounts inserted successfully';
END
ELSE
BEGIN
    PRINT 'Default Chart of Accounts already exists';
END
GO

-- ============================================
-- 7. CREATE CURRENT FINANCIAL PERIOD
-- ============================================
IF NOT EXISTS (SELECT * FROM [dbo].[financial_periods] WHERE YEAR([startDate]) = YEAR(GETDATE()))
BEGIN
    INSERT INTO [dbo].[financial_periods] ([periodName], [startDate], [endDate], [status]) VALUES
    (CONCAT('FY ', YEAR(GETDATE())), DATEFROMPARTS(YEAR(GETDATE()), 1, 1), DATEFROMPARTS(YEAR(GETDATE()), 12, 31), 'open');
    PRINT 'Current financial period created';
END
ELSE
BEGIN
    PRINT 'Financial period for current year already exists';
END
GO

PRINT '========================================';
PRINT 'Accounting Module Migration Complete!';
PRINT '========================================';
GO

