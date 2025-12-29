# Sales Not Showing in P&L - Troubleshooting Guide

## Common Reasons Why Sales Don't Appear in P&L

### 1. **Invoice Status is "Draft"** ⚠️ **MOST COMMON ISSUE**

**Problem:**
- Journal entries are **only created** when invoice status is "sent" or "paid"
- Draft invoices do NOT create journal entries (by design)

**Solution:**
1. Go to **Invoices** page
2. Find your invoice
3. Change status from "draft" to **"sent"** or **"paid"**
4. This will automatically create and post the journal entry
5. The sale will then appear in P&L

**Code Reference:**
- `routes/invoiceRoutes.js` line 572: `if (savedInvoice.status !== "draft")`
- Journal entry is only created when status is NOT draft

---

### 2. **Date Range Doesn't Include Invoice Date**

**Problem:**
- P&L filters by transaction date (journal entry date)
- If your date range doesn't include the invoice issue date, it won't show

**Solution:**
1. Check the **invoice issue date**
2. In P&L, set **From Date** to before the invoice date
3. Set **To Date** to after the invoice date
4. Click "Generate"

**Default Behavior:**
- If no dates provided: defaults to entire year to today
- Line 725-726: `startOf('year')` to `endOf('day')`

---

### 3. **Journal Entry Not Posted**

**Problem:**
- Journal entry created but not posted
- Unposted entries don't appear in General Ledger

**Check:**
1. Go to **Accounting → Journal Entries**
2. Find journal entry for your invoice
3. Check status column
4. If status is "draft", click "Post" button

**Note:** Journal entries from invoices should auto-post, but check if there was an error

---

### 4. **Wrong Account Used**

**Problem:**
- Invoice credits Sales Revenue account (4100)
- P&L only shows Revenue account type
- If account 4100 doesn't exist or is wrong type, it won't show

**Check:**
1. Go to **Accounting → Chart of Accounts**
2. Find account **4100 - Sales Revenue**
3. Verify it exists
4. Verify account type is **"Revenue"**
5. Verify it's **Active**

**Code Reference:**
- `accountingService.js` line 977-984: Looks for account code 4100
- Line 729-735: P&L only fetches accounts with `accountType: 'Revenue'`

---

### 5. **No Transactions in General Ledger**

**Problem:**
- Journal entry created but not posted to General Ledger
- P&L reads from `general_ledger` table

**Check:**
1. Go to **Accounting → General Ledger**
2. Filter by account: **4100 - Sales Revenue**
3. Check if there are entries
4. If empty, the journal entry wasn't posted

---

## Step-by-Step Verification Process

### Step 1: Check Invoice Status
```
1. Go to Invoices page
2. Find your invoice
3. Check status column
4. If "draft", change to "sent" or "paid"
```

### Step 2: Verify Journal Entry Created
```
1. Go to Accounting → Journal Entries
2. Search for your invoice number
3. Verify entry exists
4. Check status is "posted"
```

### Step 3: Verify General Ledger Entry
```
1. Go to Accounting → General Ledger
2. Filter by account: 4100 (Sales Revenue)
3. Verify entry exists with correct amount
4. Check entry date matches invoice date
```

### Step 4: Check P&L Date Range
```
1. Go to Accounting → Financial Statements
2. Click "Profit & Loss" tab
3. Set From Date: Before invoice date
4. Set To Date: After invoice date
5. Click "Generate"
```

### Step 5: Verify Account Exists
```
1. Go to Accounting → Chart of Accounts
2. Search for account code "4100"
3. Verify:
   - Account exists
   - Account type = "Revenue"
   - Account is Active
```

---

## How Sales Create Journal Entries

### For Invoices:
1. Invoice created with status "sent" or "paid"
2. System creates journal entry automatically
3. Journal entry is auto-posted
4. Creates General Ledger entries:
   - **Debit**: Accounts Receivable (1120) = Total invoice amount
   - **Credit**: Sales Revenue (4100) = Taxable amount
   - **Credit**: VAT Payable (2120) = VAT amount

### For Inventory Sales (Cash Sales):
1. Sale created from Inventory & Sales page
2. System creates journal entry automatically
3. Journal entry is auto-posted
4. Creates General Ledger entries:
   - **Debit**: Cash and Bank (1110) = Total sale amount
   - **Credit**: Sales Revenue (4100) = Taxable amount
   - **Credit**: VAT Payable (2120) = VAT amount

### Journal Entry Details:
- **Account**: 4100 - Sales Revenue (Revenue type)
- **Amount**: Taxable amount (total minus VAT)
- **Date**: Invoice issue date (for invoices) or sale date (for inventory sales)

---

## Quick Fix Checklist

- [ ] Invoice status is NOT "draft" (should be "sent" or "paid")
- [ ] Journal entry exists in Journal Entries page
- [ ] Journal entry status is "posted"
- [ ] General Ledger shows entry for account 4100
- [ ] P&L date range includes invoice issue date
- [ ] Account 4100 exists and is type "Revenue" and Active
- [ ] Amount in journal entry matches invoice taxable amount

---

## Expected Behavior

When you create an invoice with status "sent" or "paid":
1. ✅ Journal entry created automatically
2. ✅ Journal entry posted automatically
3. ✅ General Ledger entry created for Sales Revenue
4. ✅ Appears in P&L when date range includes invoice date

---

## If Still Not Working

### Check Server Console Logs

**For Invoices:**
- `[Invoice] Creating journal entry for invoice:`
- `[Invoice] ✓ Journal entry created:`
- `[Invoice] ✓ Journal entry posted:`
- `[Accounting] ✓ Journal entry created successfully:`

**For Inventory Sales:**
- `[Sales] Creating journal entry for sale:`
- `[Sales] Sale data structure:`
- `[Accounting] Creating journal entry from sale:`
- `[Accounting] ✓ Journal entry created successfully for sale:`
- `[Sales] ✓ Journal entry created:`
- `[Sales] ✓ Journal entry posted:`

**Error Messages:**
- `[Sales] ❌ Accounting integration failed:` - Check the error details
- `[Accounting] Cash and Bank account (1110) not found` - Account missing
- `[Accounting] Sales Revenue account (4100) not found` - Account missing

Any errors here will explain why journal entry wasn't created.

### Common Issues:

1. **Server Not Restarted**: After code changes, restart the server to load new code
2. **Database Connection**: Ensure SQL Server is connected
3. **Accounts Missing**: Verify accounts 1110 (Cash), 4100 (Sales Revenue), and 2120 (VAT Payable) exist in Chart of Accounts
