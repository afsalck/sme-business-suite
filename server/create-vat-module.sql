-- VAT Module Migration Script
-- Run this against the Biz database (or update DB name accordingly)

USE [Biz];
GO

PRINT '== Updating invoices table ==';
IF COL_LENGTH('dbo.invoices', 'supplierTRN') IS NULL
BEGIN
  ALTER TABLE dbo.invoices ADD supplierTRN NVARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.invoices', 'customerTRN') IS NULL
BEGIN
  ALTER TABLE dbo.invoices ADD customerTRN NVARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.invoices', 'vatType') IS NULL
BEGIN
  ALTER TABLE dbo.invoices ADD vatType NVARCHAR(20) NOT NULL CONSTRAINT DF_invoices_vatType DEFAULT ('standard');
END;

IF COL_LENGTH('dbo.invoices', 'vatAmount') IS NULL
BEGIN
  ALTER TABLE dbo.invoices ADD vatAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_invoices_vatAmount DEFAULT (0);
END;

IF COL_LENGTH('dbo.invoices', 'subtotal') IS NULL
BEGIN
  ALTER TABLE dbo.invoices ADD subtotal DECIMAL(18,2) NOT NULL CONSTRAINT DF_invoices_subtotal DEFAULT (0);
END;

IF COL_LENGTH('dbo.invoices', 'totalWithVAT') IS NULL
BEGIN
  ALTER TABLE dbo.invoices ADD totalWithVAT DECIMAL(18,2) NOT NULL CONSTRAINT DF_invoices_totalWithVAT DEFAULT (0);
END;

IF COL_LENGTH('dbo.invoices', 'taxableSubtotal') IS NULL
BEGIN
  ALTER TABLE dbo.invoices ADD taxableSubtotal DECIMAL(18,2) NOT NULL CONSTRAINT DF_invoices_taxableSubtotal DEFAULT (0);
END;

IF COL_LENGTH('dbo.invoices', 'zeroRatedSubtotal') IS NULL
BEGIN
  ALTER TABLE dbo.invoices ADD zeroRatedSubtotal DECIMAL(18,2) NOT NULL CONSTRAINT DF_invoices_zeroRatedSubtotal DEFAULT (0);
END;

IF COL_LENGTH('dbo.invoices', 'exemptSubtotal') IS NULL
BEGIN
  ALTER TABLE dbo.invoices ADD exemptSubtotal DECIMAL(18,2) NOT NULL CONSTRAINT DF_invoices_exemptSubtotal DEFAULT (0);
END;

IF COL_LENGTH('dbo.invoices', 'discountTotal') IS NULL
BEGIN
  ALTER TABLE dbo.invoices ADD discountTotal DECIMAL(18,2) NOT NULL CONSTRAINT DF_invoices_discountTotal DEFAULT (0);
END;

PRINT '== Updating invoice_items table ==';
IF COL_LENGTH('dbo.invoice_items', 'vatType') IS NULL
BEGIN
  ALTER TABLE dbo.invoice_items ADD vatType NVARCHAR(20) NOT NULL CONSTRAINT DF_invoice_items_vatType DEFAULT ('standard');
END;

IF COL_LENGTH('dbo.invoice_items', 'vatAmount') IS NULL
BEGIN
  ALTER TABLE dbo.invoice_items ADD vatAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_invoice_items_vatAmount DEFAULT (0);
END;

PRINT '== Creating company_vat_settings table ==';
IF OBJECT_ID('dbo.company_vat_settings', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.company_vat_settings (
    companyId INT NOT NULL PRIMARY KEY,
    trn NVARCHAR(50) NULL,
    vatEnabled BIT NOT NULL DEFAULT (0),
    filingFrequency NVARCHAR(20) NOT NULL DEFAULT ('monthly'), -- monthly | quarterly
    filingDay INT NOT NULL DEFAULT (28), -- Day of month
    lastFiledAt DATETIME NULL,
    createdAt DATETIME NOT NULL DEFAULT (GETUTCDATE()),
    updatedAt DATETIME NOT NULL DEFAULT (GETUTCDATE())
  );

  INSERT INTO dbo.company_vat_settings (companyId, trn, vatEnabled, filingFrequency, filingDay)
  VALUES (1, NULL, 0, 'monthly', 28);
END;

PRINT '== Creating vat_adjustments table ==';
IF OBJECT_ID('dbo.vat_adjustments', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.vat_adjustments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    companyId INT NOT NULL DEFAULT (1),
    type NVARCHAR(20) NOT NULL, -- credit | debit
    amount DECIMAL(18,2) NOT NULL,
    vatImpact DECIMAL(18,2) NOT NULL,
    referenceNumber NVARCHAR(100) NULL,
    reason NVARCHAR(255) NULL,
    supportingDocument NVARCHAR(255) NULL,
    createdByUid NVARCHAR(128) NULL,
    createdByDisplayName NVARCHAR(255) NULL,
    createdByEmail NVARCHAR(255) NULL,
    createdAt DATETIME NOT NULL DEFAULT (GETUTCDATE()),
    updatedAt DATETIME NOT NULL DEFAULT (GETUTCDATE())
  );
END;

PRINT '== Migration complete ==';
GO

