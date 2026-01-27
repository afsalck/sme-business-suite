-- SQL Script to Fix User Role Column Constraint
-- Run this in SQL Server Management Studio if the Node.js script doesn't work

USE Biz;
GO

-- Step 1: Find the CHECK constraint name
SELECT 
    CONSTRAINT_NAME,
    CHECK_CLAUSE
FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS
WHERE CONSTRAINT_NAME LIKE '%role%' OR CHECK_CLAUSE LIKE '%role%';
GO

-- Step 2: Drop the old CHECK constraint (replace 'CK__users__role__4AB81AF0' with actual constraint name)
-- You can find it by running the query above first
ALTER TABLE users DROP CONSTRAINT CK__users__role__4AB81AF0;
GO

-- Step 3: Alter column to NVARCHAR if needed
ALTER TABLE users 
ALTER COLUMN role NVARCHAR(20) NOT NULL;
GO

-- Step 4: Add new CHECK constraint with all roles (optional)
ALTER TABLE users
ADD CONSTRAINT CK_users_role_valid 
CHECK (role IN ('admin', 'staff', 'hr', 'accountant'));
GO

-- Step 5: Verify the change
SELECT TOP 5 uid, email, role FROM users;
GO
