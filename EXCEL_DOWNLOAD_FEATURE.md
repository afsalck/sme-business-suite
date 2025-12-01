# Excel Download Feature for Daily Sales Report

## Overview
Added Excel download functionality to the Daily Sales Report page, allowing users to export sales data as an Excel file (.xlsx).

## Features

### Backend Endpoint
- **Route**: `GET /api/inventory/sales/daily-report/excel`
- **Query Parameters**:
  - `from` (optional): Start date (YYYY-MM-DD)
  - `to` (optional): End date (YYYY-MM-DD)
- **Response**: Excel file (.xlsx) with two sheets:
  1. **Daily Summary Sheet**: 
     - Date, Transactions, Items Sold, VAT, Total Sales
     - Totals row at the bottom
  2. **Transaction Details Sheet**:
     - Date, Time, Summary, Items, Quantity, Unit Price, VAT, Total
     - All individual transactions with item-level details

### Frontend
- **Download Button**: Green "Download Excel" button in the top-right of the report page
- **Automatic Filename**: File is named `daily-sales-report-YYYY-MM-DD-to-YYYY-MM-DD.xlsx`
- **Uses Current Date Range**: Downloads data for the currently selected date range

## Files Modified

### Backend
- `routes/inventoryRoutes.js`:
  - Added `xlsx` package import
  - Added `GET /sales/daily-report/excel` endpoint
  - Generates Excel workbook with two sheets
  - Sets proper headers for file download

### Frontend
- `client/src/pages/DailySalesReportPage.js`:
  - Added "Download Excel" button
  - Added `handleDownloadExcel` function
  - Handles blob response and triggers browser download

### Dependencies
- `xlsx` package installed in `server/package.json`

## How It Works

1. **User clicks "Download Excel" button**
2. **Frontend sends request** to `/api/inventory/sales/daily-report/excel` with date range
3. **Backend generates Excel file**:
   - Fetches sales data for the date range
   - Groups data by day
   - Creates two sheets (Summary and Details)
   - Generates Excel buffer
4. **Backend sends file** with proper headers
5. **Frontend receives blob** and triggers browser download

## Excel File Structure

### Sheet 1: Daily Summary
```
Daily Sales Report
Period: YYYY-MM-DD to YYYY-MM-DD

Date          | Transactions | Items Sold | VAT (AED) | Total Sales (AED)
2024-01-31    | 12           | 45         | 250.00    | 5000.00
2024-01-30    | 8            | 32         | 160.00    | 3200.00
...
TOTAL         | 360          | 1350       | 6750.00   | 135000.00
```

### Sheet 2: Transaction Details
```
Date       | Time  | Summary      | Items      | Quantity | Unit Price | VAT    | Total
2024-01-31 | 14:30 | Sale #123     | Item A     | 5        | 100.00     | 25.00  | 525.00
2024-01-31 | 14:30 |              | Item B     | 3        | 50.00       | 7.50   | 157.50
...
```

## Usage

1. Navigate to Daily Sales Report page
2. Select your desired date range (or use quick filters)
3. Click the green "Download Excel" button
4. Excel file will automatically download to your browser's download folder
5. Open the file in Excel, Google Sheets, or any spreadsheet application

## Notes

- File format: `.xlsx` (Excel 2007+)
- File size: Depends on number of transactions
- Date range: Uses the currently selected date range on the page
- All amounts are formatted with 2 decimal places
- The file includes both summary and detailed transaction data

## Technical Details

- Uses `xlsx` library (SheetJS) for Excel generation
- Response type: `blob` for binary data
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment` to trigger download

