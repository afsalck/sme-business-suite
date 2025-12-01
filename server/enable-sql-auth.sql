-- SQL Script to Enable SQL Server Authentication and 'sa' Account
-- Run this in SQL Server Management Studio (SSMS) using Windows Authentication

-- Step 1: Enable SQL Server Authentication Mode
-- (This must be done through SSMS GUI: Server Properties → Security → Mixed Mode)
-- Or restart SQL Server after changing the setting

-- Step 2: Enable 'sa' account
USE master;
GO

-- Enable 'sa' login
ALTER LOGIN sa ENABLE;
GO

-- Unlock 'sa' account (if locked)
ALTER LOGIN sa WITH PASSWORD = 'YourCurrentPassword' UNLOCK;
GO

-- Grant server-level permissions (sa already has these, but just in case)
ALTER SERVER ROLE sysadmin ADD MEMBER sa;
GO

PRINT 'sa account has been enabled.';
PRINT 'Note: If you changed the password above, update your .env file.';
GO

