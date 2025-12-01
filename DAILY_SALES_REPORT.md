# Daily Sales Report Feature

## Overview
A comprehensive daily sales report feature that groups sales by day, showing totals, transaction counts, and detailed breakdowns.

## Features

### Backend Endpoint
- **Route**: `GET /api/inventory/sales/daily-report`
- **Query Parameters**:
  - `from` (optional): Start date (YYYY-MM-DD), defaults to 30 days ago
  - `to` (optional): End date (YYYY-MM-DD), defaults to today
- **Response**: JSON object with:
  - `period`: Date range of the report
  - `dailyData`: Array of daily summaries with:
    - `date`: Date (YYYY-MM-DD)
    - `sales`: Array of all sales for that day
    - `totalSales`: Total sales amount for the day
    - `totalVAT`: Total VAT for the day
    - `totalItems`: Total items sold for the day
    - `transactionCount`: Number of transactions for the day
  - `totals`: Overall totals for the period

### Frontend Page
- **Route**: `/reports/daily-sales`
- **Features**:
  - Date range filter (from/to dates)
  - Quick filter buttons (Last 7/30/90 days)
  - Summary cards showing:
    - Total Sales
    - Total VAT
    - Total Items Sold
    - Total Transactions
  - Daily breakdown table with:
    - Date
    - Number of transactions
    - Items sold
    - VAT amount
    - Total sales
    - Expandable details for each day showing individual sales

## Files Created/Modified

### Backend
- `routes/inventoryRoutes.js`:
  - Added `GET /sales/daily-report` endpoint
  - Groups sales by day
  - Calculates daily and period totals

### Frontend
- `client/src/pages/DailySalesReportPage.js`:
  - New page component for daily sales report
  - Date filtering
  - Summary cards
  - Detailed daily breakdown table
  - Expandable transaction details

- `client/src/App.js`:
  - Added route for `/reports/daily-sales`

- `client/src/components/Sidebar.js`:
  - Added "Daily Sales Report" navigation link

## Usage

1. **Access the Report**:
   - Click "Daily Sales Report" in the sidebar
   - Or navigate to `/reports/daily-sales`

2. **Filter by Date Range**:
   - Use the date pickers to select a custom range
   - Or click quick filter buttons (Last 7/30/90 Days)

3. **View Details**:
   - Click "View Details" on any day to see individual transactions
   - Each transaction shows:
     - Summary/description
     - Time
     - Items sold
     - Total amount
     - VAT amount

## Example API Response

```json
{
  "period": {
    "from": "2024-01-01",
    "to": "2024-01-31"
  },
  "dailyData": [
    {
      "date": "2024-01-31",
      "sales": [...],
      "totalSales": 5000.00,
      "totalVAT": 250.00,
      "totalItems": 45,
      "transactionCount": 12
    }
  ],
  "totals": {
    "totalSales": 150000.00,
    "totalVAT": 7500.00,
    "totalItems": 1350,
    "transactionCount": 360
  }
}
```

## Notes

- Default date range is last 30 days
- All amounts are formatted in AED currency
- Dates are displayed in a user-friendly format (e.g., "Jan 31, 2024")
- The report automatically refreshes when date range changes
- Empty states are handled gracefully
- Error handling with retry functionality

