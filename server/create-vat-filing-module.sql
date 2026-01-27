-- VAT Filing Module
-- Creates tables for tracking VAT filing submissions to FTA

-- VAT Filing Records
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[vat_filings]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[vat_filings] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [companyId] INT NOT NULL DEFAULT 1,
    [filingPeriod] NVARCHAR(20) NOT NULL, -- e.g., "2025-01" for January 2025
    [filingType] NVARCHAR(20) NOT NULL DEFAULT 'monthly', -- monthly, quarterly
    [periodStartDate] DATE NOT NULL,
    [periodEndDate] DATE NOT NULL,
    [dueDate] DATE NOT NULL,
    
    -- Filing Data
    [taxableSales] DECIMAL(18, 2) NOT NULL DEFAULT 0,
    [zeroRatedSales] DECIMAL(18, 2) NOT NULL DEFAULT 0,
    [exemptSales] DECIMAL(18, 2) NOT NULL DEFAULT 0,
    [totalVatCollected] DECIMAL(18, 2) NOT NULL DEFAULT 0,
    [vatAdjustments] DECIMAL(18, 2) NOT NULL DEFAULT 0,
    [netVatPayable] DECIMAL(18, 2) NOT NULL DEFAULT 0,
    [totalInvoices] INT NOT NULL DEFAULT 0,
    
    -- FTA Submission
    [status] NVARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, submitted, accepted, rejected, corrected
    [submittedAt] DATETIME NULL,
    [submittedBy] NVARCHAR(255) NULL,
    [ftaReferenceNumber] NVARCHAR(100) NULL,
    [ftaSubmissionId] NVARCHAR(100) NULL,
    [rejectionReason] NVARCHAR(MAX) NULL,
    
    -- Files
    [ftaXmlFile] NVARCHAR(500) NULL, -- Path to generated XML file
    [ftaPdfFile] NVARCHAR(500) NULL, -- Path to generated PDF file
    
    -- Metadata
    [notes] NVARCHAR(MAX) NULL,
    [createdBy] NVARCHAR(255) NOT NULL,
    [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
    [updatedAt] DATETIME NOT NULL DEFAULT GETDATE()
);
END

-- VAT Filing Line Items (detailed breakdown)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[vat_filing_items]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[vat_filing_items] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [vatFilingId] INT NOT NULL,
    [invoiceId] INT NULL, -- Reference to invoice if applicable
    [itemType] NVARCHAR(20) NOT NULL, -- invoice, adjustment, other
    [invoiceNumber] NVARCHAR(100) NULL,
    [invoiceDate] DATE NULL,
    [customerName] NVARCHAR(255) NULL,
    [customerTRN] NVARCHAR(50) NULL,
    [taxableAmount] DECIMAL(18, 2) NOT NULL DEFAULT 0,
    [zeroRatedAmount] DECIMAL(18, 2) NOT NULL DEFAULT 0,
    [exemptAmount] DECIMAL(18, 2) NOT NULL DEFAULT 0,
    [vatAmount] DECIMAL(18, 2) NOT NULL DEFAULT 0,
    [totalAmount] DECIMAL(18, 2) NOT NULL DEFAULT 0,
    [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT [FK_vat_filing_items_vat_filing] FOREIGN KEY ([vatFilingId]) 
        REFERENCES [dbo].[vat_filings]([id]) ON DELETE CASCADE
);
END

-- Indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_vat_filings_companyId_period')
CREATE INDEX [IX_vat_filings_companyId_period] ON [dbo].[vat_filings]([companyId], [filingPeriod]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_vat_filings_status')
CREATE INDEX [IX_vat_filings_status] ON [dbo].[vat_filings]([status]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_vat_filing_items_filingId')
CREATE INDEX [IX_vat_filing_items_filingId] ON [dbo].[vat_filing_items]([vatFilingId]);

PRINT 'VAT Filing module tables created successfully';

