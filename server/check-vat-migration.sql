-- VAT Migration Check Script
-- Run this to verify if the VAT migration has been applied

USE [Biz];
GO

PRINT '=== Checking VAT Migration Status ===';
PRINT '';

-- Check invoices table columns
PRINT '1. Checking invoices table columns:';
PRINT '';

DECLARE @MissingColumns NVARCHAR(MAX) = '';

IF COL_LENGTH('dbo.invoices', 'supplierTRN') IS NULL
    SET @MissingColumns = @MissingColumns + '  - supplierTRN' + CHAR(13);
ELSE
    PRINT '  ✓ supplierTRN exists';

IF COL_LENGTH('dbo.invoices', 'customerTRN') IS NULL
    SET @MissingColumns = @MissingColumns + '  - customerTRN' + CHAR(13);
ELSE
    PRINT '  ✓ customerTRN exists';

IF COL_LENGTH('dbo.invoices', 'vatType') IS NULL
    SET @MissingColumns = @MissingColumns + '  - vatType' + CHAR(13);
ELSE
    PRINT '  ✓ vatType exists';

IF COL_LENGTH('dbo.invoices', 'vatAmount') IS NULL
    SET @MissingColumns = @MissingColumns + '  - vatAmount' + CHAR(13);
ELSE
    PRINT '  ✓ vatAmount exists';

IF COL_LENGTH('dbo.invoices', 'subtotal') IS NULL
    SET @MissingColumns = @MissingColumns + '  - subtotal' + CHAR(13);
ELSE
    PRINT '  ✓ subtotal exists';

IF COL_LENGTH('dbo.invoices', 'totalWithVAT') IS NULL
    SET @MissingColumns = @MissingColumns + '  - totalWithVAT' + CHAR(13);
ELSE
    PRINT '  ✓ totalWithVAT exists';

IF COL_LENGTH('dbo.invoices', 'taxableSubtotal') IS NULL
    SET @MissingColumns = @MissingColumns + '  - taxableSubtotal' + CHAR(13);
ELSE
    PRINT '  ✓ taxableSubtotal exists';

IF COL_LENGTH('dbo.invoices', 'zeroRatedSubtotal') IS NULL
    SET @MissingColumns = @MissingColumns + '  - zeroRatedSubtotal' + CHAR(13);
ELSE
    PRINT '  ✓ zeroRatedSubtotal exists';

IF COL_LENGTH('dbo.invoices', 'exemptSubtotal') IS NULL
    SET @MissingColumns = @MissingColumns + '  - exemptSubtotal' + CHAR(13);
ELSE
    PRINT '  ✓ exemptSubtotal exists';

IF COL_LENGTH('dbo.invoices', 'discountTotal') IS NULL
    SET @MissingColumns = @MissingColumns + '  - discountTotal' + CHAR(13);
ELSE
    PRINT '  ✓ discountTotal exists';

PRINT '';
PRINT '2. Checking VAT tables:';
PRINT '';

-- Check company_vat_settings table
IF OBJECT_ID('dbo.company_vat_settings', 'U') IS NULL
    PRINT '  ✗ company_vat_settings table does NOT exist';
ELSE
BEGIN
    PRINT '  ✓ company_vat_settings table exists';
    -- Show current settings
    SELECT 
        companyId,
        trn,
        vatEnabled,
        filingFrequency,
        filingDay,
        lastFiledAt
    FROM dbo.company_vat_settings;
END;

PRINT '';

-- Check vat_adjustments table
IF OBJECT_ID('dbo.vat_adjustments', 'U') IS NULL
    PRINT '  ✗ vat_adjustments table does NOT exist';
ELSE
BEGIN
    PRINT '  ✓ vat_adjustments table exists';
    -- Show count of adjustments
    DECLARE @AdjustmentCount INT;
    SELECT @AdjustmentCount = COUNT(*) FROM dbo.vat_adjustments;
    PRINT '    - Total adjustments: ' + CAST(@AdjustmentCount AS NVARCHAR(10));
END;

PRINT '';
PRINT '=== Summary ===';

IF @MissingColumns <> '' OR OBJECT_ID('dbo.company_vat_settings', 'U') IS NULL OR OBJECT_ID('dbo.vat_adjustments', 'U') IS NULL
BEGIN
    PRINT '❌ MIGRATION NOT COMPLETE';
    PRINT '';
    PRINT 'Missing components:';
    IF @MissingColumns <> ''
    BEGIN
        PRINT 'Missing columns in invoices table:';
        PRINT @MissingColumns;
    END;
    IF OBJECT_ID('dbo.company_vat_settings', 'U') IS NULL
        PRINT '  - company_vat_settings table';
    IF OBJECT_ID('dbo.vat_adjustments', 'U') IS NULL
        PRINT '  - vat_adjustments table';
    PRINT '';
    PRINT 'ACTION REQUIRED: Run server/create-vat-module.sql to complete the migration.';
END
ELSE
BEGIN
    PRINT '✅ MIGRATION COMPLETE';
    PRINT '';
    PRINT 'All VAT tables and columns are present.';
    PRINT 'You can now use the VAT module features.';
END;

GO

