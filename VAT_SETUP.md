# VAT Module Setup Guide

This guide covers the setup, configuration, and usage of the VAT (Value Added Tax) module for UAE compliance.

## Table of Contents

1. [Database Migration](#database-migration)
2. [Company TRN Setup](#company-trn-setup)
3. [VAT Settings Configuration](#vat-settings-configuration)
4. [Invoice VAT Configuration](#invoice-vat-configuration)
5. [Running VAT Reports](#running-vat-reports)
6. [Exporting Reports](#exporting-reports)
7. [VAT Filing Reminders](#vat-filing-reminders)
8. [Testing](#testing)

---

## Database Migration

### Step 1: Run the Migration Script

Execute the SQL migration script to create/alter the necessary tables:

```sql
-- Run this script in your SQL Server database
-- File: server/create-vat-module.sql
```

**Important:** If you see an error about `dbo.invoice_items` not existing, remove or comment out the `ALTER TABLE dbo.invoice_items` section from the migration script. This project stores invoice line items as JSON within the `invoices` table.

### Step 2: Verify Tables

After running the migration, verify that the following tables exist:

- `invoices` (with new VAT columns)
- `company_vat_settings`
- `vat_adjustments`

You can verify using:

```sql
SELECT * FROM company_vat_settings;
SELECT TOP 5 * FROM invoices WHERE vatAmount IS NOT NULL;
```

---

## Company TRN Setup

### Step 1: Access VAT Settings

1. Log in as an **admin** or **accountant** user
2. Navigate to **VAT Settings** from the sidebar
3. Or go directly to: `/vat/settings`

### Step 2: Configure Company TRN

1. **Enable VAT**: Toggle the "Enable VAT" switch
2. **Enter TRN**: Enter your company's Tax Registration Number (TRN) from the UAE Federal Tax Authority
   - Example format: `100000000000003`
3. **Set Filing Frequency**: Choose Monthly or Quarterly
4. **Set Filing Day**: Enter the day of the month when VAT returns are due (1-28)
5. Click **Save Settings**

**Note:** The TRN is required for standard-rated invoices when VAT is enabled.

---

## VAT Settings Configuration

### Available Settings

| Setting | Description | Options |
|---------|-------------|---------|
| **VAT Enabled** | Enable/disable VAT calculation | `true` / `false` |
| **Company TRN** | Your UAE FTA registration number | Text (e.g., `100000000000003`) |
| **Filing Frequency** | How often you file VAT returns | `monthly` / `quarterly` |
| **Filing Day** | Day of month when return is due | `1` - `28` |

### API Endpoints

- **GET** `/api/vat/settings` - Get current VAT settings
- **PUT** `/api/vat/settings` - Update VAT settings (admin/accountant only)

---

## Invoice VAT Configuration

### Invoice-Level VAT

When creating or editing an invoice:

1. **Invoice VAT Type**: Select the default VAT type for all line items
   - **Standard (5%)**: Standard-rated items subject to 5% VAT
   - **Zero-rated**: Items at 0% VAT rate
   - **Exempt**: Items exempt from VAT

2. **Supplier TRN**: Enter your company's TRN (required for standard VAT when VAT is enabled)

3. **Customer TRN**: Enter the customer's TRN (optional, but recommended for B2B transactions)

### Line-Item VAT

Each invoice line item can have its own VAT type:

1. In the invoice form, each item has a **VAT Type** dropdown
2. If not specified, the item inherits the invoice-level VAT type
3. You can mix standard, zero-rated, and exempt items in the same invoice

### VAT Calculation

1. Click **"Preview VAT"** button to compute VAT breakdown
2. The system will:
   - Calculate taxable, zero-rated, and exempt subtotals
   - Apply discounts (line-item and invoice-level)
   - Calculate VAT amount using bankers rounding (UAE FTA compliant)
   - Show the total with VAT

### VAT Calculation Rules

- **Taxable Subtotal**: Sum of all standard-rated line items (after line discounts)
- **VAT Amount**: `(Taxable Subtotal - Invoice Discount) × 5%`
- **Total with VAT**: `Subtotal - Discounts + VAT Amount`
- **Rounding**: Bankers rounding (round half to even) to 2 decimal places

---

## Running VAT Reports

### VAT Dashboard

1. Navigate to **VAT Dashboard** (`/vat/dashboard`)
2. Select a date range (From/To dates)
3. View KPI cards:
   - Taxable Sales
   - VAT Collected
   - Zero-rated Sales
   - Net VAT Payable
4. Export reports directly from the dashboard

### VAT Report Page

1. Navigate to **VAT Report** (`/vat/report`)
2. Select a date range
3. View summary statistics
4. Export to CSV or PDF

### API Endpoints

- **GET** `/api/vat/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` - Get VAT summary
- **GET** `/api/vat/report?from=YYYY-MM-DD&to=YYYY-MM-DD&format=csv|pdf` - Export report

---

## Exporting Reports

### CSV Export (FTA-Ready)

1. Navigate to VAT Dashboard or VAT Report page
2. Select date range
3. Click **"Export CSV"**
4. The CSV file includes:
   - Invoice Date
   - Invoice Number
   - Customer Name
   - Customer TRN
   - Taxable Amount
   - VAT Amount
   - Total Amount
   - Zero-rated Amount
   - Exempt Amount
   - VAT Type

**Format:** FTA-ready CSV format suitable for import into the FTA portal.

### PDF Export

1. Navigate to VAT Dashboard or VAT Report page
2. Select date range
3. Click **"Export PDF"**
4. The PDF includes:
   - Company TRN (if configured)
   - Period covered
   - Summary statistics
   - Detailed invoice table
   - Professional formatting

**Use Case:** For internal records, client reporting, or printed filing.

---

## VAT Filing Reminders

### Automatic Notifications

The system automatically sends VAT filing reminders:

1. **When**: 7 days before the filing deadline
2. **Who**: All admin users
3. **How**: Notification bell + email digest
4. **Frequency**: Based on your filing frequency setting (monthly/quarterly)

### Notification Details

- **Type**: `vat_due`
- **Title**: "VAT Filing Due Soon"
- **Message**: Includes the filing deadline date
- **Link**: `/vat` (VAT dashboard)

### Manual Check

You can check the next filing deadline via API:

```bash
GET /api/vat/filing-deadline
```

Response:
```json
{
  "nextFilingDate": "2024-02-28T23:59:59.999Z"
}
```

---

## Testing

### Backend Unit Tests

Run the VAT service unit tests:

```bash
cd server
npm test -- tests/vatService.test.js
```

### Test Coverage

The tests cover:
- ✅ Bankers rounding (round half to even)
- ✅ Standard VAT calculation
- ✅ Zero-rated items
- ✅ Exempt items
- ✅ Mixed VAT types
- ✅ Discount handling (line-item and invoice-level)
- ✅ TRN validation
- ✅ Edge cases

### API Smoke Tests

Test the VAT API endpoints:

```bash
# Get VAT settings
curl -X GET http://localhost:5000/api/vat/settings \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get VAT summary
curl -X GET "http://localhost:5000/api/vat/summary?from=2024-01-01&to=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Export CSV
curl -X GET "http://localhost:5000/api/vat/report?from=2024-01-01&to=2024-01-31&format=csv" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output vat-report.csv
```

### Sample Test Data

Create test invoices with different VAT types:

```sql
-- Standard VAT invoice
INSERT INTO invoices (invoiceNumber, customerName, issueDate, vatType, supplierTRN, customerTRN, taxableSubtotal, vatAmount, totalWithVAT, items, ...)
VALUES ('INV-2024-001', 'Customer A', '2024-01-15', 'standard', '100000000000003', '200000000000004', 1000.00, 50.00, 1050.00, '[...]', ...);

-- Zero-rated invoice
INSERT INTO invoices (invoiceNumber, customerName, issueDate, vatType, zeroRatedSubtotal, vatAmount, totalWithVAT, items, ...)
VALUES ('INV-2024-002', 'Customer B', '2024-01-20', 'zero', 500.00, 0.00, 500.00, '[...]', ...);

-- Exempt invoice
INSERT INTO invoices (invoiceNumber, customerName, issueDate, vatType, exemptSubtotal, vatAmount, totalWithVAT, items, ...)
VALUES ('INV-2024-003', 'Customer C', '2024-01-25', 'exempt', 300.00, 0.00, 300.00, '[...]', ...);
```

---

## Troubleshooting

### Issue: "Supplier TRN is required" error

**Solution**: 
- Ensure VAT is enabled in VAT Settings
- Enter your company TRN in VAT Settings
- Or provide `supplierTRN` when creating the invoice

### Issue: VAT amounts don't match expected values

**Solution**:
- Check that you're using bankers rounding (round half to even)
- Verify discount application (line-item discounts applied before invoice discount)
- Use the "Preview VAT" button to see the breakdown

### Issue: CSV export is empty

**Solution**:
- Check date range (ensure invoices exist in that period)
- Verify invoices have VAT data (`vatAmount`, `taxableSubtotal`, etc.)
- Check browser console for errors

### Issue: VAT filing reminders not working

**Solution**:
- Ensure cron job is running (check server logs)
- Verify VAT is enabled in settings
- Check `filingDay` and `filingFrequency` are set correctly
- Verify notification cron is scheduled (see `server/services/notificationCron.js`)

---

## Additional Resources

- **UAE FTA Portal**: https://eservices.tax.gov.ae/
- **VAT Rate**: 5% standard rate (as of 2024)
- **Filing Deadlines**: Typically 28th of the month following the tax period

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review server logs for errors
3. Verify database schema matches migration script
4. Test API endpoints using the examples above

---

**Last Updated**: 2024-01-28

