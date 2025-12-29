# Fix: Invoice Not Showing in Journal Entries

## 🔍 Most Likely Issue: Invoice Status is "draft"

**Journal entries are ONLY created for invoices with status "sent" or "paid", NOT "draft".**

This is by design - draft invoices are not finalized, so they don't create accounting entries.

---

## ✅ Quick Fix (2 Options)

### Option 1: Change Invoice Status (Recommended)

1. **Go to:** Invoices page
2. **Find your invoice** (the one you just created)
3. **Click on it** to edit
4. **Change status** from "draft" to **"sent"** or **"paid"**
5. **Save**
6. **Check:** Accounting → Journal Entries (should see entry now!)

**This will automatically create the journal entry.**

### Option 2: Create New Invoice with Correct Status

1. **Go to:** Invoices → Create New Invoice
2. **Fill in all details**
3. **Important:** Set status to **"sent"** or **"paid"** (NOT "draft")
4. **Save**
5. **Check:** Accounting → Journal Entries (should see entry!)

---

## 🔍 Check Server Logs

**Look at your server console/terminal for these messages:**

### If Status is "draft":
```
[Invoice] ⚠️  Invoice status is 'draft' - journal entry will be created when status changes to 'sent' or 'paid'
```

**Solution:** Change invoice status to "sent" or "paid"

### If Chart of Accounts Missing:
```
[Invoice] ❌ Accounting integration failed: Accounts Receivable account (1120) not found
```

**Solution:** Run the migration script: `server/create-accounting-module.sql`

### If Everything Works:
```
[Invoice] ✓ Journal entry created: JE-2024-0001
[Invoice] ✓ Journal entry posted: JE-2024-0001
```

**This means it's working!** Check Accounting → Journal Entries

---

## 🧪 Test It Now

1. **Go to:** Invoices
2. **Find your invoice** (or create a new one)
3. **Make sure status is "sent" or "paid"**
4. **Save/Update**
5. **Check server console** for success messages
6. **Go to:** Accounting → Journal Entries
7. **You should see the entry!** ✅

---

## 📋 Why "draft" Invoices Don't Create Journal Entries

**This is standard accounting practice:**
- Draft invoices are not finalized
- They might be changed or deleted
- Accounting entries should only be created for finalized transactions
- Prevents incorrect accounting records

**Solution:** Always set status to "sent" or "paid" when creating invoices, or change it after creation.

---

## 🆘 Still Not Working?

### Check These:

1. **Chart of Accounts exists?**
   - Go to: Accounting → Chart of Accounts
   - Look for: 1120, 4100, 2120
   - If missing: Run migration script

2. **Server logs show errors?**
   - Check terminal/console
   - Look for error messages
   - Share the error with me

3. **Invoice was saved successfully?**
   - Check Invoices page
   - Invoice should be visible
   - Status should be "sent" or "paid"

---

**Most likely fix:** Change invoice status from "draft" to "sent" or "paid"! ✅

