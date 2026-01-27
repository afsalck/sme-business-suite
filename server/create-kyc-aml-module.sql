-- KYC/AML Module
-- Creates tables for client onboarding, document management, and AML screening

-- Clients Table (separate from invoice customers for KYC purposes)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[clients]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[clients] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [companyId] INT NOT NULL DEFAULT 1,
    
    -- Basic Information
    [clientType] NVARCHAR(20) NOT NULL DEFAULT 'individual', -- individual, company
    [fullName] NVARCHAR(255) NOT NULL,
    [email] NVARCHAR(255) NULL,
    [phone] NVARCHAR(50) NULL,
    [dateOfBirth] DATE NULL,
    [nationality] NVARCHAR(100) NULL,
    
    -- Company Information (if clientType = 'company')
    [companyName] NVARCHAR(255) NULL,
    [tradeLicenseNumber] NVARCHAR(100) NULL,
    [companyRegistrationDate] DATE NULL,
    
    -- Identification
    [emiratesId] NVARCHAR(50) NULL,
    [passportNumber] NVARCHAR(50) NULL,
    [passportCountry] NVARCHAR(100) NULL,
    [passportExpiry] DATE NULL,
    [trn] NVARCHAR(50) NULL, -- Tax Registration Number
    
    -- Address
    [address] NVARCHAR(MAX) NULL,
    [city] NVARCHAR(100) NULL,
    [state] NVARCHAR(100) NULL,
    [country] NVARCHAR(100) NULL DEFAULT 'UAE',
    [postalCode] NVARCHAR(20) NULL,
    
    -- KYC Status
    [kycStatus] NVARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, in_review, approved, rejected, expired
    [kycLevel] NVARCHAR(20) NOT NULL DEFAULT 'basic', -- basic, enhanced, simplified
    [riskScore] INT NOT NULL DEFAULT 0, -- 0-100, higher = more risk
    [riskCategory] NVARCHAR(20) NOT NULL DEFAULT 'low', -- low, medium, high
    
    -- AML Screening
    [amlStatus] NVARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, cleared, flagged, blocked
    [amlScreenedAt] DATETIME NULL,
    [amlScreenedBy] NVARCHAR(255) NULL,
    [amlMatchFound] BIT NOT NULL DEFAULT 0,
    [amlMatchDetails] NVARCHAR(MAX) NULL,
    
    -- Verification
    [identityVerified] BIT NOT NULL DEFAULT 0,
    [identityVerifiedAt] DATETIME NULL,
    [identityVerifiedBy] NVARCHAR(255) NULL,
    [identityVerificationMethod] NVARCHAR(50) NULL, -- manual, uae_pass, third_party
    
    -- Compliance
    [pepStatus] NVARCHAR(20) NULL, -- politically_exposed_person, family_member, close_associate, none
    [sanctionsCheck] BIT NOT NULL DEFAULT 0,
    [sanctionsMatch] BIT NOT NULL DEFAULT 0,
    
    -- Metadata
    [notes] NVARCHAR(MAX) NULL,
    [onboardedBy] NVARCHAR(255) NOT NULL,
    [onboardedAt] DATETIME NOT NULL DEFAULT GETDATE(),
    [lastReviewedAt] DATETIME NULL,
    [lastReviewedBy] NVARCHAR(255) NULL,
    [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
    [updatedAt] DATETIME NOT NULL DEFAULT GETDATE()
);
END

-- KYC Documents Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[kyc_documents]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[kyc_documents] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [clientId] INT NOT NULL,
    [companyId] INT NOT NULL DEFAULT 1,
    
    -- Document Information
    [documentType] NVARCHAR(50) NOT NULL, -- passport, emirates_id, trade_license, proof_of_address, bank_statement, other
    [documentName] NVARCHAR(255) NOT NULL,
    [documentNumber] NVARCHAR(100) NULL,
    [issueDate] DATE NULL,
    [expiryDate] DATE NULL,
    [issuingAuthority] NVARCHAR(255) NULL,
    [issuingCountry] NVARCHAR(100) NULL,
    
    -- File Storage
    [filePath] NVARCHAR(500) NOT NULL,
    [fileName] NVARCHAR(255) NOT NULL,
    [fileSize] BIGINT NULL,
    [mimeType] NVARCHAR(100) NULL,
    
    -- Verification
    [verified] BIT NOT NULL DEFAULT 0,
    [verifiedAt] DATETIME NULL,
    [verifiedBy] NVARCHAR(255) NULL,
    [verificationNotes] NVARCHAR(MAX) NULL,
    
    -- Status
    [status] NVARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, verified, rejected, expired
    [rejectionReason] NVARCHAR(MAX) NULL,
    
    -- Metadata
    [uploadedBy] NVARCHAR(255) NOT NULL,
    [uploadedAt] DATETIME NOT NULL DEFAULT GETDATE(),
    [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
    [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT [FK_kyc_documents_client] FOREIGN KEY ([clientId]) 
        REFERENCES [dbo].[clients]([id]) ON DELETE CASCADE
);
END

-- AML Screening Records
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[aml_screenings]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[aml_screenings] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [clientId] INT NOT NULL,
    [companyId] INT NOT NULL DEFAULT 1,
    
    -- Screening Details
    [screeningType] NVARCHAR(50) NOT NULL DEFAULT 'sanctions', -- sanctions, pep, adverse_media, watchlist
    [screeningSource] NVARCHAR(100) NULL, -- manual, api_integration, third_party
    [screeningDate] DATETIME NOT NULL DEFAULT GETDATE(),
    
    -- Results
    [matchFound] BIT NOT NULL DEFAULT 0,
    [matchScore] DECIMAL(5, 2) NULL, -- 0-100, confidence level
    [matchDetails] NVARCHAR(MAX) NULL,
    [matchedLists] NVARCHAR(MAX) NULL, -- JSON array of matched list names
    
    -- Decision
    [decision] NVARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, cleared, flagged, blocked
    [decisionNotes] NVARCHAR(MAX) NULL,
    [decidedBy] NVARCHAR(255) NULL,
    [decidedAt] DATETIME NULL,
    
    -- Metadata
    [screenedBy] NVARCHAR(255) NOT NULL,
    [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
    [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT [FK_aml_screenings_client] FOREIGN KEY ([clientId]) 
        REFERENCES [dbo].[clients]([id]) ON DELETE CASCADE
);
END

-- KYC Audit Trail
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[kyc_audit_log]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[kyc_audit_log] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [clientId] INT NOT NULL,
    [companyId] INT NOT NULL DEFAULT 1,
    
    -- Action Details
    [action] NVARCHAR(50) NOT NULL, -- created, updated, status_changed, document_uploaded, document_verified, aml_screened, etc.
    [actionType] NVARCHAR(50) NOT NULL, -- create, update, delete, verify, screen
    [entityType] NVARCHAR(50) NULL, -- client, document, screening
    
    -- Changes
    [oldValue] NVARCHAR(MAX) NULL,
    [newValue] NVARCHAR(MAX) NULL,
    [description] NVARCHAR(MAX) NULL,
    
    -- Metadata
    [performedBy] NVARCHAR(255) NOT NULL,
    [performedAt] DATETIME NOT NULL DEFAULT GETDATE(),
    [ipAddress] NVARCHAR(50) NULL,
    [userAgent] NVARCHAR(500) NULL,
    
    CONSTRAINT [FK_kyc_audit_log_client] FOREIGN KEY ([clientId]) 
        REFERENCES [dbo].[clients]([id]) ON DELETE CASCADE
);
END

-- Indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_clients_companyId')
CREATE INDEX [IX_clients_companyId] ON [dbo].[clients]([companyId]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_clients_kycStatus')
CREATE INDEX [IX_clients_kycStatus] ON [dbo].[clients]([kycStatus]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_clients_amlStatus')
CREATE INDEX [IX_clients_amlStatus] ON [dbo].[clients]([amlStatus]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_clients_emiratesId')
CREATE INDEX [IX_clients_emiratesId] ON [dbo].[clients]([emiratesId]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_clients_passportNumber')
CREATE INDEX [IX_clients_passportNumber] ON [dbo].[clients]([passportNumber]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_kyc_documents_clientId')
CREATE INDEX [IX_kyc_documents_clientId] ON [dbo].[kyc_documents]([clientId]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_aml_screenings_clientId')
CREATE INDEX [IX_aml_screenings_clientId] ON [dbo].[aml_screenings]([clientId]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_kyc_audit_log_clientId')
CREATE INDEX [IX_kyc_audit_log_clientId] ON [dbo].[kyc_audit_log]([clientId]);

PRINT 'KYC/AML module tables created successfully';

