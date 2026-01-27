-- ============================================
-- PAYROLL MODULE - Database Schema
-- UAE Labor Law Compliant
-- ============================================

-- ============================================
-- 1. PAYROLL PERIODS
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[payroll_periods]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[payroll_periods] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [companyId] INT NOT NULL DEFAULT 1,
        [periodName] NVARCHAR(100) NOT NULL,
        [periodType] NVARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK ([periodType] IN ('monthly', 'bi-weekly', 'weekly')),
        [startDate] DATETIME NOT NULL,
        [endDate] DATETIME NOT NULL,
        [payDate] DATETIME NOT NULL,
        [status] NVARCHAR(20) NOT NULL DEFAULT 'draft' CHECK ([status] IN ('draft', 'processing', 'completed', 'locked')),
        [processedBy] NVARCHAR(255) NULL,
        [processedAt] DATETIME NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        INDEX [IX_payroll_periods_companyId] ([companyId]),
        INDEX [IX_payroll_periods_startDate] ([startDate]),
        INDEX [IX_payroll_periods_endDate] ([endDate]),
        INDEX [IX_payroll_periods_status] ([status])
    );
    PRINT 'Payroll Periods table created successfully';
END
ELSE
BEGIN
    PRINT 'Payroll Periods table already exists';
END
GO

-- ============================================
-- 2. PAYROLL RECORDS (Main payroll data)
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[payroll_records]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[payroll_records] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [companyId] INT NOT NULL DEFAULT 1,
        [payrollPeriodId] INT NOT NULL,
        [employeeId] INT NOT NULL,
        
        -- Salary Components
        [basicSalary] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [housingAllowance] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [transportAllowance] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [otherAllowances] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [totalAllowances] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [grossSalary] DECIMAL(18,2) NOT NULL DEFAULT 0,
        
        -- Deductions
        [incomeTax] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [socialSecurity] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [otherDeductions] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [totalDeductions] DECIMAL(18,2) NOT NULL DEFAULT 0,
        
        -- UAE Labor Law Calculations
        [gratuityAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [annualLeaveDays] DECIMAL(5,2) NOT NULL DEFAULT 0,
        [annualLeaveAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [overtimeHours] DECIMAL(5,2) NOT NULL DEFAULT 0,
        [overtimeAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        
        -- Final Amounts
        [netSalary] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [totalPayable] DECIMAL(18,2) NOT NULL DEFAULT 0,
        
        -- Status and Notes
        [status] NVARCHAR(20) NOT NULL DEFAULT 'draft' CHECK ([status] IN ('draft', 'approved', 'paid', 'cancelled')),
        [notes] NVARCHAR(MAX) NULL,
        [payslipGenerated] BIT NOT NULL DEFAULT 0,
        [payslipGeneratedAt] DATETIME NULL,
        
        -- Audit fields
        [createdBy] NVARCHAR(255) NOT NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        FOREIGN KEY ([payrollPeriodId]) REFERENCES [dbo].[payroll_periods]([id]),
        FOREIGN KEY ([employeeId]) REFERENCES [dbo].[employees]([id]),
        INDEX [IX_payroll_records_companyId] ([companyId]),
        INDEX [IX_payroll_records_periodId] ([payrollPeriodId]),
        INDEX [IX_payroll_records_employeeId] ([employeeId]),
        INDEX [IX_payroll_records_status] ([status])
    );
    PRINT 'Payroll Records table created successfully';
END
ELSE
BEGIN
    PRINT 'Payroll Records table already exists';
END
GO

-- ============================================
-- 3. PAYROLL ALLOWANCES (Detailed breakdown)
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[payroll_allowances]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[payroll_allowances] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [payrollRecordId] INT NOT NULL,
        [allowanceType] NVARCHAR(50) NOT NULL, -- housing, transport, food, medical, etc.
        [amount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [description] NVARCHAR(255) NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        FOREIGN KEY ([payrollRecordId]) REFERENCES [dbo].[payroll_records]([id]) ON DELETE CASCADE,
        INDEX [IX_payroll_allowances_recordId] ([payrollRecordId])
    );
    PRINT 'Payroll Allowances table created successfully';
END
ELSE
BEGIN
    PRINT 'Payroll Allowances table already exists';
END
GO

-- ============================================
-- 4. PAYROLL DEDUCTIONS (Detailed breakdown)
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[payroll_deductions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[payroll_deductions] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [payrollRecordId] INT NOT NULL,
        [deductionType] NVARCHAR(50) NOT NULL, -- tax, loan, advance, penalty, etc.
        [amount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [description] NVARCHAR(255) NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        FOREIGN KEY ([payrollRecordId]) REFERENCES [dbo].[payroll_records]([id]) ON DELETE CASCADE,
        INDEX [IX_payroll_deductions_recordId] ([payrollRecordId])
    );
    PRINT 'Payroll Deductions table created successfully';
END
ELSE
BEGIN
    PRINT 'Payroll Deductions table already exists';
END
GO

-- ============================================
-- 5. EMPLOYEE SALARY STRUCTURE (Template)
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[employee_salary_structure]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[employee_salary_structure] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [companyId] INT NOT NULL DEFAULT 1,
        [employeeId] INT NOT NULL UNIQUE,
        
        -- Salary Components
        [basicSalary] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [housingAllowance] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [transportAllowance] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [foodAllowance] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [medicalAllowance] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [otherAllowances] DECIMAL(18,2) NOT NULL DEFAULT 0,
        
        -- Deduction Settings
        [incomeTaxRate] DECIMAL(5,2) NOT NULL DEFAULT 0,
        [socialSecurityRate] DECIMAL(5,2) NOT NULL DEFAULT 0,
        
        -- UAE Labor Law Settings
        [gratuityEligible] BIT NOT NULL DEFAULT 1,
        [annualLeaveDays] INT NOT NULL DEFAULT 30, -- Standard UAE annual leave
        [overtimeEligible] BIT NOT NULL DEFAULT 1,
        [overtimeRate] DECIMAL(5,2) NOT NULL DEFAULT 1.25, -- 1.25x for overtime
        
        -- Bank Details for Salary Transfer
        [bankName] NVARCHAR(255) NULL,
        [bankAccountNumber] NVARCHAR(100) NULL,
        [iban] NVARCHAR(50) NULL,
        [swiftCode] NVARCHAR(20) NULL,
        
        -- Status
        [isActive] BIT NOT NULL DEFAULT 1,
        [effectiveFrom] DATETIME NOT NULL DEFAULT GETDATE(),
        [effectiveTo] DATETIME NULL,
        
        -- Audit
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        FOREIGN KEY ([employeeId]) REFERENCES [dbo].[employees]([id]),
        INDEX [IX_employee_salary_structure_companyId] ([companyId]),
        INDEX [IX_employee_salary_structure_employeeId] ([employeeId])
    );
    PRINT 'Employee Salary Structure table created successfully';
END
ELSE
BEGIN
    PRINT 'Employee Salary Structure table already exists';
END
GO

-- ============================================
-- 6. LEAVE RECORDS (For annual leave calculation)
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[employee_leave_records]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[employee_leave_records] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [companyId] INT NOT NULL DEFAULT 1,
        [employeeId] INT NOT NULL,
        [leaveType] NVARCHAR(50) NOT NULL DEFAULT 'annual' CHECK ([leaveType] IN ('annual', 'sick', 'unpaid', 'maternity', 'paternity')),
        [startDate] DATETIME NOT NULL,
        [endDate] DATETIME NOT NULL,
        [days] DECIMAL(5,2) NOT NULL,
        [status] NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK ([status] IN ('pending', 'approved', 'rejected', 'cancelled')),
        [approvedBy] NVARCHAR(255) NULL,
        [approvedAt] DATETIME NULL,
        [notes] NVARCHAR(MAX) NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        FOREIGN KEY ([employeeId]) REFERENCES [dbo].[employees]([id]),
        INDEX [IX_employee_leave_records_companyId] ([companyId]),
        INDEX [IX_employee_leave_records_employeeId] ([employeeId]),
        INDEX [IX_employee_leave_records_dates] ([startDate], [endDate])
    );
    PRINT 'Employee Leave Records table created successfully';
END
ELSE
BEGIN
    PRINT 'Employee Leave Records table already exists';
END
GO

-- ============================================
-- 7. ATTENDANCE RECORDS (For overtime calculation)
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[employee_attendance]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[employee_attendance] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [companyId] INT NOT NULL DEFAULT 1,
        [employeeId] INT NOT NULL,
        [date] DATE NOT NULL,
        [checkIn] DATETIME NULL,
        [checkOut] DATETIME NULL,
        [totalHours] DECIMAL(5,2) NOT NULL DEFAULT 0,
        [overtimeHours] DECIMAL(5,2) NOT NULL DEFAULT 0,
        [status] NVARCHAR(20) NOT NULL DEFAULT 'present' CHECK ([status] IN ('present', 'absent', 'late', 'half-day', 'leave')),
        [notes] NVARCHAR(255) NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        FOREIGN KEY ([employeeId]) REFERENCES [dbo].[employees]([id]),
        UNIQUE ([employeeId], [date]),
        INDEX [IX_employee_attendance_companyId] ([companyId]),
        INDEX [IX_employee_attendance_employeeId] ([employeeId]),
        INDEX [IX_employee_attendance_date] ([date])
    );
    PRINT 'Employee Attendance table created successfully';
END
ELSE
BEGIN
    PRINT 'Employee Attendance table already exists';
END
GO

PRINT '============================================';
PRINT 'Payroll Module Database Schema Created!';
PRINT '============================================';
PRINT '';
PRINT 'Next Steps:';
PRINT '1. Create Sequelize models for all tables';
PRINT '2. Implement UAE labor law calculation service';
PRINT '3. Build payroll processing service';
PRINT '4. Create payslip generation';
PRINT '5. Build API routes and frontend pages';
PRINT '';

