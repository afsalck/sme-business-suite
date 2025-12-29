# Testing the Accounting Module

## Step 1: Verify Database Tables

Run this SQL query to confirm all tables exist:

```sql
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'dbo' 
    AND TABLE_NAME IN (
        'chart_of_accounts', 
        'journal_entries', 
        'journal_entry_lines', 
        'general_ledger', 
        'financial_periods'
    )
ORDER BY TABLE_NAME;
```

**Expected:** 5 tables should be listed.

## Step 2: Verify Default Accounts

```sql
SELECT COUNT(*) as AccountCount 
FROM chart_of_accounts;
```

**Expected:** Should return a number (around 20-30 default accounts).

## Step 3: Restart Your Server

1. **Stop your Node.js server** (if running)
   - Press `Ctrl+C` in the terminal

2. **Start the server again**
   ```powershell
   npm start
   # or
   node server/index.js
   ```

3. **Check for errors**
   - Look for: `✓ Accounting routes loaded`
   - If you see errors, check the console output

## Step 4: Test Backend API (Optional - Using Browser Console)

1. **Open your application** in the browser
2. **Open Developer Console** (F12)
3. **Log in** as admin or accountant
4. **Run this in the console:**

```javascript
// Get Chart of Accounts
fetch('http://localhost:5004/api/accounting/chart-of-accounts', {
  headers: {
    'Authorization': `Bearer ${await window.auth.currentUser.getIdToken()}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('✅ Chart of Accounts:', data);
  console.log(`Found ${data.length} accounts`);
})
.catch(err => console.error('❌ Error:', err));
```

**Expected:** Should return an array of accounts.

## Step 5: Test Frontend Pages

### 5.1 Chart of Accounts Page

1. **Log in** as admin or accountant
2. **Navigate to:** Accounting → Chart of Accounts
3. **You should see:**
   - List of default accounts (Assets, Liabilities, Equity, Revenue, Expenses)
   - Account codes, names, types, balances
   - "Add Account" button (if you're admin/accountant)

**Test:** Click "Add Account" and try creating a new account.

### 5.2 Journal Entries Page

1. **Navigate to:** Accounting → Journal Entries
2. **Click:** "+ New Entry"
3. **Fill in:**
   - Entry Date: Today's date
   - Description: "Test Entry"
   - Add 2 lines:
     - Line 1: Select an account (e.g., "1110 - Cash and Bank"), Debit: 1000, Credit: 0
     - Line 2: Select another account (e.g., "3100 - Owner Equity"), Debit: 0, Credit: 1000
4. **Check:** Total Debits should equal Total Credits (1000.00)
5. **Click:** "Create Entry"

**Expected:** Entry should be created with status "Draft"

6. **Click:** "Post" button next to the entry

**Expected:** Status should change to "Posted"

### 5.3 General Ledger Page

1. **Navigate to:** Accounting → General Ledger
2. **Select an account** from the dropdown (e.g., "1110 - Cash and Bank")
3. **Click:** View entries

**Expected:** Should show the journal entry you just posted with running balance.

### 5.4 Financial Statements Page

1. **Navigate to:** Accounting → Financial Statements

2. **Test Trial Balance:**
   - Select "Trial Balance" tab
   - Enter From Date: First day of current year
   - Enter To Date: Today
   - Click "Generate"

   **Expected:** Should show all accounts with opening balances, period transactions, and ending balances.

3. **Test Profit & Loss:**
   - Select "Profit & Loss" tab
   - Enter From Date: First day of current year
   - Enter To Date: Today
   - Click "Generate"

   **Expected:** Should show Revenue, Expenses, and Net Income.

4. **Test Balance Sheet:**
   - Select "Balance Sheet" tab
   - Enter As Of Date: Today
   - Click "Generate"

   **Expected:** Should show Assets, Liabilities, Equity, and balance check.

## Step 6: Verify Data Flow

### Check General Ledger Was Updated

After posting a journal entry, run this SQL:

```sql
SELECT 
    gl.entryDate,
    ca.accountCode,
    ca.accountName,
    gl.debitAmount,
    gl.creditAmount,
    gl.runningBalance
FROM general_ledger gl
JOIN chart_of_accounts ca ON gl.accountId = ca.id
ORDER BY gl.entryDate DESC, gl.id DESC;
```

**Expected:** Should show your posted journal entry with running balances.

### Check Account Balances Updated

```sql
SELECT 
    accountCode,
    accountName,
    openingBalance,
    currentBalance
FROM chart_of_accounts
WHERE currentBalance != 0
ORDER BY accountCode;
```

**Expected:** Accounts used in journal entries should have updated currentBalance.

## Common Issues & Solutions

### Issue: "Accounting routes not loaded"
**Solution:** 
- Check server console for errors
- Verify `routes/accountingRoutes.js` exists
- Check `server/index.js` has the accounting route import

### Issue: "Cannot GET /api/accounting/..."
**Solution:**
- Verify you're logged in
- Check your user role is admin or accountant
- Verify Firebase token is valid

### Issue: "Journal entry not balanced"
**Solution:**
- Ensure total debits = total credits
- Check for rounding errors (allowed up to 0.01 difference)
- Verify each line has either debit OR credit (not both, not neither)

### Issue: "Account not found"
**Solution:**
- Verify account exists in Chart of Accounts
- Check account is active
- Refresh the page to reload accounts list

### Issue: "General Ledger empty"
**Solution:**
- Journal entries must be "Posted" to appear in general ledger
- Draft entries don't update the ledger
- Check that you clicked "Post" after creating the entry

## Success Checklist

- [ ] All 5 tables exist in database
- [ ] Default accounts are loaded
- [ ] Server starts without errors
- [ ] Chart of Accounts page loads
- [ ] Can view accounts list
- [ ] Journal Entries page loads
- [ ] Can create a journal entry
- [ ] Can post a journal entry
- [ ] General Ledger shows entries
- [ ] Trial Balance generates
- [ ] Profit & Loss generates
- [ ] Balance Sheet generates

## Next Steps After Testing

Once everything is working:

1. **Customize Chart of Accounts** - Add/remove accounts as needed
2. **Set Opening Balances** - Update account opening balances for your business
3. **Create Opening Entry** - Create a journal entry to set initial balances
4. **Integrate with Invoices** - (Optional) Auto-create journal entries from invoices
5. **Integrate with Expenses** - (Optional) Auto-create journal entries from expenses

---

**If everything works, your Accounting Module is ready to use! 🎉**

