# Accounting Module Setup Guide

## Overview

The Accounting Module provides complete double-entry bookkeeping functionality for your SME application. It includes:

- **Chart of Accounts**: Manage your account structure
- **Journal Entries**: Record all financial transactions
- **General Ledger**: View detailed account transactions
- **Trial Balance**: Verify accounting accuracy
- **Financial Statements**: Profit & Loss, Balance Sheet

## Database Migration

### Step 1: Run the Migration Script

1. Open SQL Server Management Studio (SSMS) or your preferred SQL client
2. Connect to your database
3. Open the file: `server/create-accounting-module.sql`
4. Execute the script

The script will:
- Create 5 new tables: `chart_of_accounts`, `journal_entries`, `journal_entry_lines`, `general_ledger`, `financial_periods`
- Insert default chart of accounts (Assets, Liabilities, Equity, Revenue, Expenses)
- Create a financial period for the current year

### Step 2: Verify Migration

Run this SQL query to verify the tables were created:

```sql
SELECT 
    TABLE_NAME,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = t.TABLE_NAME) as COLUMN_COUNT
FROM INFORMATION_SCHEMA.TABLES t
WHERE TABLE_SCHEMA = 'dbo'
    AND TABLE_NAME IN ('chart_of_accounts', 'journal_entries', 'journal_entry_lines', 'general_ledger', 'financial_periods')
ORDER BY TABLE_NAME;
```

You should see all 5 tables listed.

## Default Chart of Accounts

The migration script creates a standard chart of accounts:

### Assets (1000-1999)
- **1000** - Assets
  - **1100** - Current Assets
    - **1110** - Cash and Bank
    - **1120** - Accounts Receivable
    - **1130** - Inventory
  - **1200** - Fixed Assets
    - **1210** - Equipment
    - **1220** - Furniture

### Liabilities (2000-2999)
- **2000** - Liabilities
  - **2100** - Current Liabilities
    - **2110** - Accounts Payable
    - **2120** - VAT Payable
    - **2130** - Accrued Expenses

### Equity (3000-3999)
- **3000** - Equity
  - **3100** - Owner Equity
  - **3200** - Retained Earnings

### Revenue (4000-4999)
- **4000** - Revenue
  - **4100** - Sales Revenue
  - **4110** - Service Revenue

### Expenses (5000-5999)
- **5000** - Expenses
  - **5100** - Cost of Goods Sold
  - **5200** - Operating Expenses
    - **5210** - Salaries and Wages
    - **5220** - Rent
    - **5230** - Utilities
    - **5240** - Office Supplies
    - **5250** - Marketing

## API Endpoints

All endpoints require Firebase authentication and are prefixed with `/api/accounting`.

### Chart of Accounts

- `GET /api/accounting/chart-of-accounts` - Get all accounts
  - Query params: `accountType` (optional), `includeInactive` (optional)
- `POST /api/accounting/chart-of-accounts` - Create new account (admin/accountant only)
- `PUT /api/accounting/chart-of-accounts/:id` - Update account (admin/accountant only)

### Journal Entries

- `GET /api/accounting/journal-entries` - Get journal entries
  - Query params: `fromDate`, `toDate`, `status`, `limit`, `offset`
- `POST /api/accounting/journal-entries` - Create journal entry (admin/accountant only)
- `POST /api/accounting/journal-entries/:id/post` - Post journal entry (admin/accountant only)

### General Ledger

- `GET /api/accounting/general-ledger` - Get general ledger entries
  - Query params: `accountId`, `fromDate`, `toDate`

### Financial Statements

- `GET /api/accounting/trial-balance` - Get trial balance
  - Query params: `fromDate`, `toDate`
- `GET /api/accounting/profit-loss` - Get Profit & Loss statement
  - Query params: `fromDate`, `toDate`
- `GET /api/accounting/balance-sheet` - Get Balance Sheet
  - Query params: `asOfDate`

## Usage Examples

### 1. Create a Journal Entry

```javascript
POST /api/accounting/journal-entries
{
  "entryDate": "2024-12-15",
  "description": "Office supplies purchase",
  "reference": "INV-001",
  "referenceType": "invoice",
  "referenceId": 123,
  "lines": [
    {
      "accountId": 15, // Office Supplies (5240)
      "debitAmount": 500.00,
      "creditAmount": 0,
      "description": "Office supplies"
    },
    {
      "accountId": 8, // Accounts Payable (2110)
      "debitAmount": 0,
      "creditAmount": 500.00,
      "description": "Payment due"
    }
  ]
}
```

**Important:** Journal entries must be balanced (total debits = total credits).

### 2. Post a Journal Entry

After creating a journal entry, you must post it to update the general ledger:

```javascript
POST /api/accounting/journal-entries/1/post
```

This will:
- Change status from `draft` to `posted`
- Create general ledger entries
- Update account balances

### 3. Get Trial Balance

```javascript
GET /api/accounting/trial-balance?fromDate=2024-01-01&toDate=2024-12-31
```

Returns all accounts with:
- Opening balances
- Period debits/credits
- Ending balances

### 4. Get Profit & Loss

```javascript
GET /api/accounting/profit-loss?fromDate=2024-01-01&toDate=2024-12-31
```

Returns:
- Revenue items and total
- Expense items and total
- Net income

### 5. Get Balance Sheet

```javascript
GET /api/accounting/balance-sheet?asOfDate=2024-12-31
```

Returns:
- Assets (items and total)
- Liabilities (items and total)
- Equity (items and total)
- Retained earnings
- Balance verification

## Integration with Existing Modules

### Auto-Create Journal Entries from Invoices

When an invoice is created, you can automatically create a journal entry:

```javascript
// In invoiceRoutes.js (after invoice creation)
const { createJournalEntryFromInvoice } = require('../services/accountingService');

const journalEntry = await createJournalEntryFromInvoice(invoice, companyId);
await postJournalEntry(journalEntry.id, userId, companyId);
```

This creates:
- Debit: Accounts Receivable (1120)
- Credit: Sales Revenue (4100)
- Credit: VAT Payable (2120) - if VAT applies

### Auto-Create Journal Entries from Expenses

Similarly, for expenses:

```javascript
const { createJournalEntryFromExpense } = require('../services/accountingService');

const journalEntry = await createJournalEntryFromExpense(expense, companyId);
await postJournalEntry(journalEntry.id, userId, companyId);
```

## Double-Entry Bookkeeping Rules

### Account Types and Normal Balances

- **Assets**: Normal balance = Debit (Debit increases, Credit decreases)
- **Liabilities**: Normal balance = Credit (Credit increases, Debit decreases)
- **Equity**: Normal balance = Credit (Credit increases, Debit decreases)
- **Revenue**: Normal balance = Credit (Credit increases, Debit decreases)
- **Expenses**: Normal balance = Debit (Debit increases, Credit decreases)

### Journal Entry Validation

Every journal entry must:
1. Have at least 2 lines
2. Have balanced debits and credits (total debits = total credits)
3. Each line must have either debit OR credit (not both, not neither)

## Testing

### Test Journal Entry Creation

```javascript
// Test balanced entry
const testEntry = {
  entryDate: new Date(),
  description: "Test entry",
  lines: [
    { accountId: 1, debitAmount: 100, creditAmount: 0 },
    { accountId: 2, debitAmount: 0, creditAmount: 100 }
  ]
};

// This should succeed
await createJournalEntry(testEntry, userId, companyId);

// Test unbalanced entry (should fail)
const unbalancedEntry = {
  entryDate: new Date(),
  description: "Unbalanced entry",
  lines: [
    { accountId: 1, debitAmount: 100, creditAmount: 0 },
    { accountId: 2, debitAmount: 0, creditAmount: 50 } // Only 50 credit, should be 100
  ]
};

// This should throw an error
await createJournalEntry(unbalancedEntry, userId, companyId);
```

## Troubleshooting

### Error: "Journal entry is not balanced"

**Cause:** Total debits don't equal total credits.

**Solution:** Check that all lines sum correctly. For example:
- If you debit 100, you must credit 100
- Rounding errors are allowed up to 0.01

### Error: "Account not found"

**Cause:** The account ID doesn't exist in the chart of accounts.

**Solution:** Verify the account exists using `GET /api/accounting/chart-of-accounts`.

### Error: "Cannot post journal entry with status: posted"

**Cause:** Trying to post an already-posted entry.

**Solution:** Journal entries can only be posted once. Create a reversing entry if needed.

### General Ledger Not Updating

**Cause:** Journal entry was created but not posted.

**Solution:** Journal entries start as `draft`. You must call `POST /api/accounting/journal-entries/:id/post` to post them.

## Next Steps

1. **Run the migration** to create the database tables
2. **Review the default chart of accounts** and customize if needed
3. **Create test journal entries** to familiarize yourself with the system
4. **Integrate with invoices/expenses** to auto-create journal entries
5. **Generate financial statements** to verify accuracy

## Security

- All endpoints require Firebase authentication
- Chart of Accounts and Journal Entry creation/editing require `admin` or `accountant` role
- Financial statements are viewable by all authenticated users

---

**Last Updated:** December 2024

