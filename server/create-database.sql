-- SQL Script to create the database
-- Run this in SQL Server Management Studio (SSMS) or sqlcmd

-- Create database if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'Biz')
BEGIN
    CREATE DATABASE Biz;
    PRINT 'Database "Biz" created successfully.';
END
ELSE
BEGIN
    PRINT 'Database "Biz" already exists.';
END
GO

-- Use the database
USE Biz;
GO

PRINT 'Database "Biz" is ready to use.';
GO

