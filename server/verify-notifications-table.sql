-- Verify notifications table exists
USE [Biz];
GO

-- Check if table exists
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[notifications]') AND type in (N'U'))
BEGIN
    PRINT '✅ Table [dbo].[notifications] EXISTS';
    
    -- Count rows
    DECLARE @count INT;
    SELECT @count = COUNT(*) FROM [dbo].[notifications];
    PRINT '   Row count: ' + CAST(@count AS VARCHAR(10));
    
    -- Show table structure
    SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'notifications'
    ORDER BY ORDINAL_POSITION;
END
ELSE
BEGIN
    PRINT '❌ Table [dbo].[notifications] DOES NOT EXIST';
    PRINT '   Run: server/create-notifications-table.sql';
END
GO

