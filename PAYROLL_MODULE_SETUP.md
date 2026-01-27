# Payroll Module Setup Guide

## ✅ What's Been Built

### 1. Database Schema
- **File**: `server/create-payroll-module.sql`
- **Tables Created**:
  - `payroll_periods` - Payroll periods (monthly, bi-weekly, weekly)
  - `payroll_records` - Main payroll data for each employee
  - `payroll_allowances` - Detailed allowance breakdown
  - `payroll_deductions` - Detailed deduction breakdown
  - `employee_salary_structure` - Employee salary templates
  - `employee_leave_records` - Leave tracking
  - `employee_attendance` - Attendance and overtime tracking

### 2. Sequelize Models
- `models/PayrollPeriod.js`
- `models/PayrollRecord.js`
- `models/EmployeeSalaryStructure.js`
- `models/EmployeeLeaveRecord.js`
- `models/EmployeeAttendance.js`
- `models/payrollAssociations.js` - Model relationships

### 3. Services
- **UAE Labor Law Service** (`server/services/uaeLaborLawService.js`):
  - Gratuity calculation (UAE compliant)
  - Annual leave calculation
  - Overtime calculation (regular, night, weekend, holiday)
  - End of service benefits
  - Public holidays
  - Working days calculation

- **Payroll Processing Service** (`server/services/payrollService.js`):
  - Create payroll periods
  - Process payroll for employees
  - Calculate salaries, allowances, deductions
  - Handle overtime and leave
  - Approve and mark payroll as paid

- **Payslip Generation** (`server/services/pdfService.js`):
  - Generate UAE-compliant payslip PDFs
  - Professional formatting
  - Includes all earnings and deductions

### 4. API Routes
- **File**: `routes/payrollRoutes.js`
- **Endpoints**:
  - `GET /api/payroll/periods` - Get payroll periods
  - `POST /api/payroll/periods` - Create payroll period
  - `POST /api/payroll/process` - Process payroll
  - `GET /api/payroll/records` - Get payroll records
  - `POST /api/payroll/records/:id/approve` - Approve payroll
  - `POST /api/payroll/records/:id/mark-paid` - Mark as paid
  - `GET /api/payroll/records/:id/payslip` - Generate payslip PDF
  - `GET /api/payroll/employees/:employeeId/salary-structure` - Get salary structure
  - `POST /api/payroll/employees/:employeeId/salary-structure` - Save salary structure

### 5. Controllers
- **File**: `server/controllers/payrollController.js`
- Handles all payroll API requests

## 🚀 Setup Instructions

### Step 1: Run Database Migration

Execute the SQL script to create payroll tables:

```sql
-- Run this in SQL Server Management Studio or via command line
-- File: server/create-payroll-module.sql
```

Or use the command line:
```bash
sqlcmd -S your_server -d Biz -i server/create-payroll-module.sql
```

### Step 2: Verify Routes are Loaded

When you start the server, you should see:
```
✓ Payroll routes loaded
```

### Step 3: Test API Endpoints

You can test the endpoints using:
- Postman
- Browser (for GET requests)
- Frontend application (once built)

## 📋 How Payroll Works

### 1. **Setup Employee Salary Structure**
- Each employee needs a salary structure
- Includes: basic salary, allowances, deductions, bank details
- Can be created via API or will auto-create from employee's basic salary

### 2. **Create Payroll Period**
- Define a payroll period (e.g., "December 2025")
- Set start date, end date, and pay date
- Period type: monthly, bi-weekly, or weekly

### 3. **Process Payroll**
- System calculates for all active employees:
  - Basic salary + allowances = Gross salary
  - Deductions (tax, social security, etc.)
  - Overtime (if any)
  - Annual leave deductions (if leave was taken)
  - Net salary = Gross - Deductions + Overtime - Leave

### 4. **Review & Approve**
- Review payroll records
- Approve individual records or all
- Generate payslips

### 5. **Mark as Paid**
- After payment is made, mark records as "paid"
- System tracks payment status

## 🇦🇪 UAE Labor Law Compliance

The system automatically calculates:

1. **Gratuity**:
   - < 1 year: No gratuity
   - 1-5 years: 21 days basic salary per year
   - > 5 years: 30 days basic salary per year
   - Max: 2 years' salary

2. **Annual Leave**:
   - 30 days per year (for 1+ year service)
   - 2 days per month (for < 1 year)
   - Accrues monthly

3. **Overtime**:
   - Regular: 125% of hourly rate
   - Night (10 PM - 4 AM): 150%
   - Weekend/Holiday: 150%

4. **End of Service**:
   - Gratuity + Accrued leave encashment

## 📝 Next Steps (Frontend)

To complete the payroll module, you'll need to create frontend pages:

1. **Payroll Periods Page** - Create and manage periods
2. **Process Payroll Page** - Process payroll for a period
3. **Payroll Records Page** - View and manage payroll records
4. **Employee Salary Structure Page** - Manage employee salaries
5. **Payslip View/Download** - View and download payslips

## 🔍 Testing Checklist

When you're ready to test:

- [ ] Run database migration
- [ ] Create employee salary structures
- [ ] Create a payroll period
- [ ] Process payroll for the period
- [ ] Verify calculations (gross, deductions, net)
- [ ] Generate payslip PDF
- [ ] Test approval workflow
- [ ] Test mark as paid

## 📚 API Documentation

All endpoints require authentication (Firebase token) and appropriate role:
- Admin/Accountant: Full access
- Staff: Can view own payslips only

## ⚠️ Important Notes

1. **Salary Structure**: Employees must have a salary structure before processing payroll
2. **Attendance**: Overtime is calculated from attendance records
3. **Leave**: Annual leave deductions are based on approved leave records
4. **Gratuity**: Typically calculated at termination, not monthly
5. **Bank Details**: Store in salary structure for salary transfer files (future feature)

## 🎯 Status

**Backend**: ✅ Complete
**Frontend**: ⏳ Pending (to be built)

The payroll module backend is fully functional and ready for frontend integration!

