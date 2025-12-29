-- Advanced Reports & Analytics Module
-- Creates tables for custom reports, scheduled reports, and report templates

-- Report Templates (predefined report configurations)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[report_templates]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[report_templates] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [companyId] INT NOT NULL DEFAULT 1,
    
    -- Template Information
    [templateName] NVARCHAR(255) NOT NULL,
    [templateType] NVARCHAR(50) NOT NULL, -- financial, sales, expenses, payroll, compliance, custom
    [description] NVARCHAR(MAX) NULL,
    [category] NVARCHAR(50) NULL, -- summary, detailed, comparative, predictive
    
    -- Report Configuration (JSON)
    [config] NVARCHAR(MAX) NOT NULL, -- JSON configuration for report structure
    [filters] NVARCHAR(MAX) NULL, -- JSON filters configuration
    [columns] NVARCHAR(MAX) NULL, -- JSON columns configuration
    [grouping] NVARCHAR(MAX) NULL, -- JSON grouping configuration
    [sorting] NVARCHAR(MAX) NULL, -- JSON sorting configuration
    
    -- Visualization
    [chartType] NVARCHAR(50) NULL, -- line, bar, pie, area, table
    [chartConfig] NVARCHAR(MAX) NULL, -- JSON chart configuration
    
    -- Metadata
    [isDefault] BIT NOT NULL DEFAULT 0,
    [isPublic] BIT NOT NULL DEFAULT 0, -- Can be used by all users
    [createdBy] NVARCHAR(255) NOT NULL,
    [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
    [updatedAt] DATETIME NOT NULL DEFAULT GETDATE()
);
END

-- Custom Reports (user-created reports)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[custom_reports]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[custom_reports] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [companyId] INT NOT NULL DEFAULT 1,
    [templateId] INT NULL, -- Reference to template if based on one
    
    -- Report Information
    [reportName] NVARCHAR(255) NOT NULL,
    [reportType] NVARCHAR(50) NOT NULL,
    [description] NVARCHAR(MAX) NULL,
    
    -- Report Configuration
    [config] NVARCHAR(MAX) NOT NULL, -- JSON configuration
    [filters] NVARCHAR(MAX) NULL, -- JSON filters
    [dateRange] NVARCHAR(50) NULL, -- last_month, last_quarter, last_year, custom
    [startDate] DATE NULL,
    [endDate] DATE NULL,
    
    -- Results Cache
    [lastRunAt] DATETIME NULL,
    [lastRunBy] NVARCHAR(255) NULL,
    [resultCount] INT NULL,
    [executionTime] INT NULL, -- milliseconds
    
    -- Metadata
    [isFavorite] BIT NOT NULL DEFAULT 0,
    [createdBy] NVARCHAR(255) NOT NULL,
    [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
    [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT [FK_custom_reports_template] FOREIGN KEY ([templateId]) 
        REFERENCES [dbo].[report_templates]([id]) ON DELETE SET NULL
);
END

-- Scheduled Reports (automated report generation)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[scheduled_reports]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[scheduled_reports] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [companyId] INT NOT NULL DEFAULT 1,
    [reportId] INT NOT NULL, -- Reference to custom_report or template
    
    -- Schedule Configuration
    [scheduleType] NVARCHAR(20) NOT NULL, -- daily, weekly, monthly, quarterly, yearly
    [scheduleDay] INT NULL, -- Day of week (1-7) or day of month (1-31)
    [scheduleTime] TIME NULL, -- Time to run (HH:mm:ss)
    [scheduleMonth] INT NULL, -- Month for yearly schedule (1-12)
    
    -- Delivery
    [deliveryMethod] NVARCHAR(50) NOT NULL DEFAULT 'email', -- email, download, dashboard
    [recipients] NVARCHAR(MAX) NULL, -- JSON array of email addresses
    [format] NVARCHAR(20) NOT NULL DEFAULT 'pdf', -- pdf, excel, csv, json
    
    -- Status
    [isActive] BIT NOT NULL DEFAULT 1,
    [lastRunAt] DATETIME NULL,
    [nextRunAt] DATETIME NULL,
    [runCount] INT NOT NULL DEFAULT 0,
    [errorCount] INT NOT NULL DEFAULT 0,
    [lastError] NVARCHAR(MAX) NULL,
    
    -- Metadata
    [createdBy] NVARCHAR(255) NOT NULL,
    [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
    [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT [FK_scheduled_reports_report] FOREIGN KEY ([reportId]) 
        REFERENCES [dbo].[custom_reports]([id]) ON DELETE CASCADE
);
END

-- Report Execution History
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[report_executions]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[report_executions] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [companyId] INT NOT NULL DEFAULT 1,
    [reportId] INT NULL, -- Reference to custom_report
    [scheduledReportId] INT NULL, -- Reference to scheduled_report if automated
    
    -- Execution Details
    [executionType] NVARCHAR(20) NOT NULL, -- manual, scheduled, api
    [status] NVARCHAR(20) NOT NULL, -- running, completed, failed, cancelled
    [startedAt] DATETIME NOT NULL DEFAULT GETDATE(),
    [completedAt] DATETIME NULL,
    [executionTime] INT NULL, -- milliseconds
    
    -- Results
    [resultCount] INT NULL,
    [filePath] NVARCHAR(500) NULL, -- Path to generated file
    [fileSize] BIGINT NULL,
    [errorMessage] NVARCHAR(MAX) NULL,
    
    -- Metadata
    [executedBy] NVARCHAR(255) NOT NULL,
    [parameters] NVARCHAR(MAX) NULL, -- JSON parameters used
    [createdAt] DATETIME NOT NULL DEFAULT GETDATE()
);
END

-- Indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_report_templates_companyId')
CREATE INDEX [IX_report_templates_companyId] ON [dbo].[report_templates]([companyId]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_custom_reports_companyId')
CREATE INDEX [IX_custom_reports_companyId] ON [dbo].[custom_reports]([companyId]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_scheduled_reports_companyId')
CREATE INDEX [IX_scheduled_reports_companyId] ON [dbo].[scheduled_reports]([companyId]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_scheduled_reports_nextRunAt')
CREATE INDEX [IX_scheduled_reports_nextRunAt] ON [dbo].[scheduled_reports]([nextRunAt]) WHERE [isActive] = 1;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_report_executions_companyId')
CREATE INDEX [IX_report_executions_companyId] ON [dbo].[report_executions]([companyId]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_report_executions_reportId')
CREATE INDEX [IX_report_executions_reportId] ON [dbo].[report_executions]([reportId]);

PRINT 'Advanced Reports & Analytics module tables created successfully';

