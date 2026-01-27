# Advanced Reports & Analytics Module Setup Guide

## Overview

The Advanced Reports & Analytics module provides comprehensive reporting capabilities across all modules in the system. It allows users to create custom reports, schedule automated reports, and export data in various formats.

## Features

1. **Custom Report Builder** - Create reports from any module (Financial, Sales, Expenses, Payroll, Compliance)
2. **Report Execution** - Run reports on-demand with real-time data
3. **Export Options** - Export to Excel, PDF, CSV formats
4. **Scheduled Reports** - Automate report generation and email delivery
5. **Report Templates** - Pre-built report configurations
6. **Execution History** - Track all report runs with performance metrics

## Setup Instructions

### 1. Run Database Migration

Execute the SQL script to create the reports tables:

```sql
-- Run this in SQL Server Management Studio or your SQL client
-- File: server/create-reports-module.sql
```

Or run it via command line:
```bash
sqlcmd -S your_server -d Biz -i server/create-reports-module.sql
```

### 2. Access Reports Module

- Navigate to **Reports > Reports & Analytics** in the sidebar
- Only admins and accountants can access this module

## How to Use

### Creating a Report

1. Click **"+ New Report"** button
2. Fill in report details:
   - **Report Name**: Give your report a descriptive name
   - **Report Type**: Select from Financial, Sales, Expenses, Payroll, Compliance, or Custom
   - **Date Range**: Choose predefined range or custom dates
   - **Description**: Optional description
3. Click **"Create Report"**

### Executing a Report

1. Find your report in the list
2. Click **"Run"** button
3. The system will:
   - Generate report data from selected modules
   - Calculate summary statistics
   - Display results in the UI
   - Record execution time and record count

### Exporting Reports

1. After running a report, click **"Export"** button
2. Choose export format (Excel, PDF, CSV)
3. Report file will be generated in `uploads/reports/` directory
4. File can be downloaded or emailed

### Scheduling Reports

1. Create a scheduled report configuration
2. Set schedule:
   - **Daily**: Run every day at specified time
   - **Weekly**: Run on specific day of week
   - **Monthly**: Run on specific day of month
   - **Quarterly/Yearly**: Run on specific dates
3. Configure delivery:
   - **Email**: Send to specified recipients
   - **Download**: Save to downloads folder
   - **Dashboard**: Display on dashboard
4. Reports will run automatically according to schedule

## Report Types

### Financial Reports
- Revenue and expenses summary
- Profit/Loss analysis
- Cash flow tracking
- Payment status

### Sales Reports
- Sales by period
- Sales by customer
- Invoice analysis
- Revenue trends

### Expenses Reports
- Expenses by category
- Expenses by period
- Vendor analysis
- Budget vs. actual

### Payroll Reports
- Payroll by period
- Payroll by employee
- Department analysis
- Labor cost trends

### Compliance Reports
- VAT filing status
- KYC/AML status
- Document expiry tracking
- Compliance metrics

## API Endpoints

### Custom Reports
- `GET /api/reports` - List all reports
- `POST /api/reports` - Create new report
- `GET /api/reports/:id` - Get report details
- `POST /api/reports/:id/execute` - Execute report
- `GET /api/reports/:id/export` - Export report

### Scheduled Reports
- `GET /api/reports/scheduled/all` - List scheduled reports
- `POST /api/reports/scheduled` - Create scheduled report

## Date Ranges

Predefined ranges:
- **Today**: Current day
- **Yesterday**: Previous day
- **Last Week**: Previous week (Monday-Sunday)
- **Last Month**: Previous calendar month
- **Last Quarter**: Previous quarter
- **Last Year**: Previous calendar year
- **This Month**: Current month
- **This Year**: Current year
- **Custom**: User-defined start and end dates

## Export Formats

### Excel (.xlsx)
- Multiple worksheets
- Formatted tables
- Charts and graphs
- Best for detailed analysis

### PDF
- Formatted documents
- Charts and visualizations
- Best for sharing and printing

### CSV
- Raw data export
- Best for data import/analysis
- Compatible with all spreadsheet software

## Report Execution

Each report execution:
- Creates execution record
- Tracks execution time
- Records result count
- Stores error messages (if any)
- Updates report last run timestamp

## Performance

- Reports are generated on-demand
- Large reports may take time (tracked in execution time)
- Results are cached for quick re-runs
- Export files are stored in `uploads/reports/`

## Next Steps

1. **Run the database migration**
2. **Create your first report**
3. **Execute and review results**
4. **Export to Excel/PDF**
5. **Set up scheduled reports** (optional)

## Future Enhancements

- **Custom Report Builder UI**: Visual drag-and-drop report builder
- **Advanced Charts**: Interactive charts and graphs
- **Comparative Analysis**: Month-over-month, year-over-year comparisons
- **Predictive Analytics**: Forecasting and trend analysis
- **Report Sharing**: Share reports with team members
- **Report Permissions**: Fine-grained access control

