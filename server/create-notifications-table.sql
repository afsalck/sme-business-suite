-- Create notifications table for BizEase UAE
-- Run this script in your SQL Server database

USE [Biz];
GO

-- Create notifications table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[notifications]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[notifications] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [userId] NVARCHAR(255) NOT NULL,
        [type] NVARCHAR(50) NOT NULL CHECK ([type] IN ('passport_expiry', 'visa_expiry', 'contract_expiry', 'license_expiry', 'vat_due', 'invoice_due')),
        [title] NVARCHAR(255) NOT NULL,
        [message] NVARCHAR(MAX) NOT NULL,
        [dueDate] DATETIME NULL,
        [link] NVARCHAR(500) NULL,
        [status] NVARCHAR(20) NOT NULL DEFAULT 'unread' CHECK ([status] IN ('unread', 'read')),
        [notificationKey] NVARCHAR(500) NOT NULL UNIQUE,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE()
    );

    -- Create indexes for better performance
    CREATE INDEX [IX_notifications_userId] ON [dbo].[notifications]([userId]);
    CREATE INDEX [IX_notifications_status] ON [dbo].[notifications]([status]);
    CREATE INDEX [IX_notifications_type] ON [dbo].[notifications]([type]);
    CREATE UNIQUE INDEX [IX_notifications_notificationKey] ON [dbo].[notifications]([notificationKey]);

    PRINT 'Notifications table created successfully';
END
ELSE
BEGIN
    PRINT 'Notifications table already exists';
END
GO

