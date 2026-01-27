# VAT Filing Module Setup Guide

## Overview

The VAT Filing module allows you to prepare and submit VAT returns to the UAE Federal Tax Authority (FTA) in the correct format. This module generates FTA-compliant XML and CSV files for submission.

## Features

1. **Create VAT Filings** - Prepare VAT returns for specific periods
2. **FTA Format Generation** - Automatically generates XML and CSV files in FTA-compliant format
3. **File Downloads** - Download generated files for manual submission
4. **Submission Tracking** - Track filing status (draft, submitted, accepted, rejected)
5. **Detailed Line Items** - View all invoices included in each filing

## Setup Instructions

### 1. Run Database Migration

Execute the SQL script to create the VAT filing tables:

```sql
-- Run this in SQL Server Management Studio or your SQL client
-- File: server/create-vat-filing-module.sql
```

Or run it via command line:
```bash
sqlcmd -S your_server -d Biz -i server/create-vat-filing-module.sql
```

### 2. Verify Company TRN

Before creating filings, ensure your company TRN is set in VAT Settings:
- Go to **VAT > VAT Settings**
- Enter your **TRN (Tax Registration Number)**
- Save settings

### 3. Access VAT Filing

- Navigate to **VAT > VAT Filing** in the sidebar
- Only admins and accountants can access this page

## How to Use

### Creating a VAT Filing

1. Click **"+ New Filing"** button
2. Select the **Period Start Date** and **Period End Date**
3. Click **"Create Filing"**
4. The system will:
   - Calculate VAT summary for the period
   - Create filing record with all invoice details
   - Set due date (28th of following month for monthly filing)

### Generating FTA Files

1. Find your filing in the list
2. Click **"Generate Files"** button
3. The system will:
   - Generate FTA-compliant XML file
   - Generate FTA-compliant CSV file (backup format)
   - Save files to `uploads/vat-filings/` directory

### Downloading Files

1. After files are generated, you'll see **"Download XML"** and **"Download CSV"** buttons
2. Click to download the files
3. Review the files before submission

### Submitting to FTA

1. Review the filing details
2. Download and verify the XML/CSV files
3. Click **"Submit"** button
4. The system will:
   - Mark filing as "submitted"
   - Generate FTA reference number
   - Record submission timestamp

**Note:** Currently, the submission marks the filing as submitted in the system. Actual FTA API integration would be added in a future update.

## File Formats

### XML Format
- FTA-compliant XML structure
- Includes all required fields per FTA specifications
- Contains invoice details, VAT calculations, and company information

### CSV Format
- Backup format for manual submission
- Contains all invoice line items
- Includes summary totals

## Filing Statuses

- **draft** - Filing created but not yet submitted
- **submitted** - Filing submitted to FTA (awaiting response)
- **accepted** - FTA accepted the filing
- **rejected** - FTA rejected the filing (check rejection reason)
- **corrected** - Filing was corrected and resubmitted

## Important Notes

1. **TRN Required** - Company TRN must be set before generating files
2. **Period Validation** - Each period can only have one filing
3. **File Generation** - Files are generated on-demand and saved to server
4. **Submission** - Currently marks as submitted in system. FTA API integration pending.

## Next Steps

For full automation, you would need to:
1. Obtain FTA API credentials
2. Implement FTA API integration
3. Handle submission responses
4. Process rejections and corrections

## Troubleshooting

**Error: "Company TRN is required"**
- Go to VAT Settings and enter your TRN

**Error: "VAT filing already exists for period"**
- Each period can only have one filing
- Check existing filings or delete the existing one

**Files not generating**
- Check server logs for errors
- Ensure `uploads/vat-filings/` directory is writable
- Verify VAT data exists for the selected period

