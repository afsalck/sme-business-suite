-- Check employees with upcoming expiries
-- Run this in SQL Server Management Studio to see which employees have expiries

USE [Biz];
GO

-- Check passport expiries (next 60 days)
SELECT 
    id,
    fullName,
    passportExpiry,
    DATEDIFF(day, GETDATE(), passportExpiry) AS daysUntilPassportExpiry
FROM employees
WHERE passportExpiry IS NOT NULL
    AND passportExpiry >= GETDATE()
    AND passportExpiry <= DATEADD(day, 60, GETDATE())
ORDER BY passportExpiry ASC;

-- Check visa expiries (next 60 days)
SELECT 
    id,
    fullName,
    visaExpiry,
    DATEDIFF(day, GETDATE(), visaExpiry) AS daysUntilVisaExpiry
FROM employees
WHERE visaExpiry IS NOT NULL
    AND visaExpiry >= GETDATE()
    AND visaExpiry <= DATEADD(day, 60, GETDATE())
ORDER BY visaExpiry ASC;

-- Check all employees with any expiry in next 60 days
SELECT 
    id,
    fullName,
    passportExpiry,
    DATEDIFF(day, GETDATE(), passportExpiry) AS daysUntilPassportExpiry,
    visaExpiry,
    DATEDIFF(day, GETDATE(), visaExpiry) AS daysUntilVisaExpiry
FROM employees
WHERE (passportExpiry IS NOT NULL AND passportExpiry >= GETDATE() AND passportExpiry <= DATEADD(day, 60, GETDATE()))
    OR (visaExpiry IS NOT NULL AND visaExpiry >= GETDATE() AND visaExpiry <= DATEADD(day, 60, GETDATE()))
ORDER BY 
    CASE 
        WHEN passportExpiry IS NOT NULL AND visaExpiry IS NOT NULL 
        THEN CASE WHEN passportExpiry < visaExpiry THEN passportExpiry ELSE visaExpiry END
        WHEN passportExpiry IS NOT NULL THEN passportExpiry
        ELSE visaExpiry
    END ASC;

-- Check if notifications table exists
IF OBJECT_ID('dbo.notifications', 'U') IS NOT NULL
BEGIN
    SELECT COUNT(*) AS totalNotifications FROM notifications;
    SELECT TOP 10 * FROM notifications ORDER BY createdAt DESC;
END
ELSE
BEGIN
    PRINT 'Notifications table does NOT exist. Run server/create-notifications-table.sql';
END
GO

