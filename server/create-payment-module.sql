-- ============================================
-- PAYMENT TRACKING MODULE - Database Schema
-- Tracks payments against invoices
-- ============================================

-- ============================================
-- 1. PAYMENTS TABLE
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[payments]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[payments] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [companyId] INT NOT NULL DEFAULT 1,
        [invoiceId] INT NOT NULL,
        
        -- Payment Details
        [paymentNumber] NVARCHAR(50) NOT NULL UNIQUE,
        [paymentDate] DATETIME NOT NULL,
        [paymentAmount] DECIMAL(18,2) NOT NULL,
        [paymentMethod] NVARCHAR(50) NOT NULL DEFAULT 'bank_transfer' CHECK ([paymentMethod] IN ('cash', 'bank_transfer', 'cheque', 'credit_card', 'debit_card', 'online', 'other')),
        [currency] NVARCHAR(10) NOT NULL DEFAULT 'AED',
        
        -- Payment Reference
        [referenceNumber] NVARCHAR(100) NULL, -- Bank reference, cheque number, etc.
        [transactionId] NVARCHAR(100) NULL, -- Online payment transaction ID
        [bankName] NVARCHAR(255) NULL,
        [bankAccount] NVARCHAR(100) NULL,
        
        -- Status
        [status] NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK ([status] IN ('pending', 'confirmed', 'failed', 'cancelled', 'refunded')),
        [confirmedAt] DATETIME NULL,
        [confirmedBy] NVARCHAR(255) NULL,
        
        -- Notes and Attachments
        [notes] NVARCHAR(MAX) NULL,
        [receiptUrl] NVARCHAR(500) NULL, -- Link to payment receipt/document
        
        -- Accounting Integration
        [journalEntryId] INT NULL, -- Link to accounting journal entry
        
        -- Audit fields
        [createdBy] NVARCHAR(255) NOT NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        FOREIGN KEY ([invoiceId]) REFERENCES [dbo].[invoices]([id]),
        INDEX [IX_payments_companyId] ([companyId]),
        INDEX [IX_payments_invoiceId] ([invoiceId]),
        INDEX [IX_payments_paymentNumber] ([paymentNumber]),
        INDEX [IX_payments_paymentDate] ([paymentDate]),
        INDEX [IX_payments_status] ([status])
    );
    PRINT 'Payments table created successfully';
END
ELSE
BEGIN
    PRINT 'Payments table already exists';
END
GO

-- ============================================
-- 2. PAYMENT ALLOCATIONS (for partial payments)
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[payment_allocations]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[payment_allocations] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [paymentId] INT NOT NULL,
        [invoiceId] INT NOT NULL,
        [allocatedAmount] DECIMAL(18,2) NOT NULL,
        [allocatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        FOREIGN KEY ([paymentId]) REFERENCES [dbo].[payments]([id]) ON DELETE CASCADE,
        FOREIGN KEY ([invoiceId]) REFERENCES [dbo].[invoices]([id]),
        INDEX [IX_payment_allocations_paymentId] ([paymentId]),
        INDEX [IX_payment_allocations_invoiceId] ([invoiceId])
    );
    PRINT 'Payment Allocations table created successfully';
END
ELSE
BEGIN
    PRINT 'Payment Allocations table already exists';
END
GO

-- ============================================
-- 3. ADD PAYMENT FIELDS TO INVOICES (if not exists)
-- ============================================
-- Check if paidAmount column exists, if not add it
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[invoices]') AND name = 'paidAmount')
BEGIN
    ALTER TABLE [dbo].[invoices]
    ADD [paidAmount] DECIMAL(18,2) NOT NULL DEFAULT 0;
    PRINT 'Added paidAmount column to invoices table';
END
ELSE
BEGIN
    PRINT 'paidAmount column already exists in invoices table';
END
GO

-- Check if outstandingAmount column exists, if not add it
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[invoices]') AND name = 'outstandingAmount')
BEGIN
    ALTER TABLE [dbo].[invoices]
    ADD [outstandingAmount] DECIMAL(18,2) NOT NULL DEFAULT 0;
    PRINT 'Added outstandingAmount column to invoices table';
END
ELSE
BEGIN
    PRINT 'outstandingAmount column already exists in invoices table';
END
GO

-- Update existing invoices to calculate outstanding amount
UPDATE [dbo].[invoices]
SET [paidAmount] = ISNULL([paidAmount], 0),
    [outstandingAmount] = [totalWithVAT] - ISNULL([paidAmount], 0)
WHERE [outstandingAmount] IS NULL OR [outstandingAmount] = 0;

PRINT 'Updated existing invoices with payment amounts';

PRINT '============================================';
PRINT 'Payment Module Database Schema Created!';
PRINT '============================================';
PRINT '';
PRINT 'Next Steps:';
PRINT '1. Create Sequelize models for Payment and PaymentAllocation';
PRINT '2. Build payment processing service';
PRINT '3. Integrate with accounting (update AR when payment received)';
PRINT '4. Create API routes and frontend pages';
PRINT '';

