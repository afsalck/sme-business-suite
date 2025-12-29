# Troubleshooting: Invoice Not Showing in Journal Entries

## 🔍 Most Common Issue: Invoice Status is "draft"

**Journal entries are only created for invoices with status "sent" or "paid", NOT "draft".**

### Quick Fix:

1. **Go to:** Invoices → Find your invoice
2. **Change status** from "draft" to "sent" or "paid"
3. **Save**
4. **Check:** Accounting → Journal Entries (should see entry now)

---

## 🔍 Other Possible Issues

### Issue 1: Chart of Accounts Missing

**Check:**
1. Go to: Accounting → Chart of Accounts
2. Look for these accounts:
   - **1120** - Accounts Receivable
   - **4100** - Sales Revenue
   - **2120** - VAT Payable

**If missing:**
- Run the migration script: `server/create-accounting-module.sql`
- Restart your server

### Issue 2: Server Error (Silent Failure)

**Check server console/logs for errors like:**
- "Accounts Receivable account (1120) not found"
- "Sales Revenue account (4100) not found"
- "Accounting integration failed"

**Solution:**
- Check server terminal/console
- Look for error messages
- Fix the issue (usually missing accounts)

### Issue 3: Invoice ID Not Available

**Check:**
- The invoice was created successfully
- Invoice has an `id` field

**Solution:**
- Try updating the invoice status (this will trigger journal entry creation)

---

## ✅ Step-by-Step Fix

### Option 1: Change Invoice Status (Easiest)

1. **Go to:** Invoices
2. **Find your invoice**
3. **Click:** Edit or change status
4. **Set status to:** "sent" or "paid"
5. **Save**
6. **Check:** Accounting → Journal Entries

**This should create the journal entry automatically.**

### Option 2: Check Server Logs

1. **Look at your server console/terminal**
2. **Search for:** "[Invoice] Accounting integration failed"
3. **Read the error message**
4. **Fix the issue** (usually missing accounts)

### Option 3: Verify Chart of Accounts

1. **Go to:** Accounting → Chart of Accounts
2. **Verify these accounts exist:**
   - 1120 - Accounts Receivable
   - 4100 - Sales Revenue
   - 2120 - VAT Payable
3. **If missing:** Run migration script

---

## 🧪 Test After Fix

1. **Create a new invoice:**
   - Status: "sent" (NOT "draft")
   - Amount: Any amount
   - Save

2. **Check Journal Entries:**
   - Go to: Accounting → Journal Entries
   - Should see new entry with status "posted"

3. **If still not working:**
   - Check server logs
   - Verify chart of accounts
   - Contact support with error message

---

## 📝 Note About Invoice Status

**Why "draft" invoices don't create journal entries:**
- Draft invoices are not finalized
- They might be changed or deleted
- Accounting entries should only be created for finalized invoices
- This is standard accounting practice

**Solution:**
- Always set status to "sent" or "paid" when creating invoices
- Or change status after creating as draft

---

**Most likely fix:** Change invoice status from "draft" to "sent" or "paid"! ✅

