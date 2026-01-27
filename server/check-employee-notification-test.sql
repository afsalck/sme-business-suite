-- Check employees with expiries that should trigger notifications
-- Run this in SQL Server to verify employee data

USE [Biz];
GO

-- Check employees with passport/visa expiries
SELECT 
    id,
    fullName,
    passportExpiry,
    DATEDIFF(day, GETDATE(), passportExpiry) AS daysUntilPassport,
    visaExpiry,
    DATEDIFF(day, GETDATE(), visaExpiry) AS daysUntilVisa,
    CASE 
        WHEN passportExpiry IS NOT NULL AND DATEDIFF(day, GETDATE(), passportExpiry) BETWEEN 0 AND 60 THEN 'Should notify (passport)'
        WHEN visaExpiry IS NOT NULL AND DATEDIFF(day, GETDATE(), visaExpiry) BETWEEN 0 AND 60 THEN 'Should notify (visa)'
        ELSE 'No notification needed'
    END AS notificationStatus
FROM employees
WHERE 
    (passportExpiry IS NOT NULL AND DATEDIFF(day, GETDATE(), passportExpiry) BETWEEN 0 AND 60)
    OR 
    (visaExpiry IS NOT NULL AND DATEDIFF(day, GETDATE(), visaExpiry) BETWEEN 0 AND 60)
ORDER BY 
    CASE 
        WHEN passportExpiry IS NOT NULL THEN passportExpiry 
        ELSE visaExpiry 
    END ASC;

-- Check existing notifications
SELECT 
    id,
    type,
    title,
    status,
    createdAt
FROM notifications
WHERE type IN ('passport_expiry', 'visa_expiry')
ORDER BY createdAt DESC;

GO

