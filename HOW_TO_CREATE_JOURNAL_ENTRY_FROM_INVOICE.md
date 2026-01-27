# How to Create Journal Entry from Invoice

## ✅ Quick Steps

1. **Create an invoice** (or use an existing one)
2. **Change status** from "draft" to **"sent"** or **"paid"**
3. **Check:** Accounting → Journal Entries (should see entry!)

---

## 📋 Detailed Instructions

### Step 1: Create or Find an Invoice

1. Go to: **Invoices** page
2. Create a new invoice OR find an existing invoice
3. **Important:** Invoice can be created with any status, but journal entry will only be created when status is "sent" or "paid"

### Step 2: Change Invoice Status

1. **Click on the invoice** to edit it
2. **Change status** from "draft" to:
   - **"sent"** (if you've sent it to the customer)
   - **"paid"** (if the customer has paid)
3. **Save** the invoice

### Step 3: Verify Journal Entry

1. Go to: **Accounting → Journal Entries**
2. You should see a new entry with:
   - **Status:** "posted"
   - **Reference:** Your invoice number (e.g., INV-2025-0007)
   - **Description:** Invoice details

---

## 🔍 Check Server Logs

**When you change the invoice status, look for these messages in your server console:**

### ✅ Success Messages:
```
[Invoice] Status changed from 'draft' to 'sent' - creating journal entry
[Invoice] Invoice number: INV-2025-0007
[Accounting] Generated entry number: JE-2025-0001
[Accounting] Journal entry created with ID: X
[Accounting] Transaction committed
[Invoice] ✓ Journal entry created: JE-2025-0001
[Invoice] ✓ Journal entry posted: JE-2025-0001
```

### ❌ Error Messages:
```
[Invoice] ❌ Accounting integration failed: [error message]
[Accounting] Error creating journal entry: [error message]
```

**If you see errors, check:**
- Chart of Accounts exists (1120, 4100, 2120)
- Database connection is working
- Server logs for detailed error messages

---

## 📝 What Happens Automatically

When you change an invoice status from "draft" to "sent" or "paid":

1. **Journal Entry Created:**
   - Debit: Accounts Receivable (1120) - Amount: Invoice total
   - Credit: Sales Revenue (4100) - Amount: Invoice subtotal (without VAT)
   - Credit: VAT Payable (2120) - Amount: VAT amount (if applicable)

2. **Journal Entry Posted:**
   - Status changed from "draft" to "posted"
   - General Ledger entries created
   - Account balances updated

3. **All Done Automatically!**
   - No manual accounting needed
   - Double-entry bookkeeping handled
   - Balances updated correctly

---

## 🧪 Test It Now

1. **Go to:** Invoices
2. **Find invoice:** INV-2025-0007 (or any draft invoice)
3. **Change status** to "sent" or "paid"
4. **Check server console** for success messages
5. **Go to:** Accounting → Journal Entries
6. **You should see the entry!** ✅

---

## ❓ Why "draft" Invoices Don't Create Journal Entries

**This is standard accounting practice:**
- Draft invoices are not finalized
- They might be changed or deleted
- Accounting entries should only be created for finalized transactions
- Prevents incorrect accounting records

**Solution:** Always change invoice status to "sent" or "paid" when you're ready to record it in accounting.

---

## 🆘 Still Not Working?

### Check These:

1. **Invoice status changed?**
   - Check Invoices page
   - Status should be "sent" or "paid" (NOT "draft")

2. **Server logs show errors?**
   - Check terminal/console
   - Look for error messages
   - Share the error with me

3. **Chart of Accounts exists?**
   - Go to: Accounting → Chart of Accounts
   - Look for: 1120, 4100, 2120
   - If missing: Run migration script

4. **Journal Entries page empty?**
   - Check if you're filtering by status
   - Try viewing "All" entries
   - Check if entry was created but not posted

---

**Most likely fix:** Change invoice status from "draft" to "sent" or "paid"! ✅

