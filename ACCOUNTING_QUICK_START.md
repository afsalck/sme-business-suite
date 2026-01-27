# Accounting Module - Quick Start Guide (For Non-Accountants)

## 🎯 TL;DR (Too Long; Didn't Read)

**You don't need to know accounting!** The system does everything automatically.

**Just use your business normally:**
- Create invoices → Accounting happens automatically ✅
- Record expenses → Accounting happens automatically ✅
- View reports → See your financial position ✅

**That's it!** 🎉

---

## ✅ Step 1: Run the Migration (One-Time Setup)

**If you haven't already:**

1. Open SQL Server Management Studio
2. Open file: `server/create-accounting-module.sql`
3. Execute the script
4. Done! ✅

**This creates:**
- Chart of accounts (pre-configured)
- Tables for journal entries
- Tables for general ledger

**You don't need to understand what these are!** Just run the script.

---

## ✅ Step 2: Use Your Business Normally

### Create Invoices (As Usual)

1. Go to: Invoices → Create Invoice
2. Fill in customer, items, amounts
3. Set status to "sent" or "paid" (not "draft")
4. Save

**What happens automatically:**
- ✅ Accounting records are created
- ✅ Your sales are tracked
- ✅ VAT is tracked
- ✅ Everything is balanced

**You don't need to do anything else!**

### Record Expenses (As Usual)

1. Go to: Expenses → Add Expense
2. Fill in amount, category, description
3. Save

**What happens automatically:**
- ✅ Accounting records are created
- ✅ Your expenses are tracked
- ✅ Everything is balanced

**You don't need to do anything else!**

---

## 📊 Step 3: View Your Reports (When Needed)

### Profit & Loss Statement

**What it shows:** Are you making money?

1. Go to: Accounting → Financial Statements
2. Click: "Profit & Loss" tab
3. Select: Date range (e.g., this month, this year)
4. Click: "Generate"

**You'll see:**
- Revenue (money you earned)
- Expenses (money you spent)
- Net Income (profit or loss)

**That's it!** No accounting knowledge needed.

### Balance Sheet

**What it shows:** What's your business worth?

1. Go to: Accounting → Financial Statements
2. Click: "Balance Sheet" tab
3. Select: Date (e.g., today, end of month)
4. Click: "Generate"

**You'll see:**
- Assets (what you own)
- Liabilities (what you owe)
- Equity (your net worth)

**That's it!** No accounting knowledge needed.

---

## 🚫 What You DON'T Need to Do

### ❌ Don't Create Journal Entries
- The system creates them automatically
- You'll never need to do this manually

### ❌ Don't Post Entries
- Entries are posted automatically
- You can't break anything

### ❌ Don't Worry About Account Codes
- Default accounts are already set up
- They work for 99% of businesses

### ❌ Don't Learn Accounting
- The system handles everything
- Focus on running your business

---

## 🔍 Quick Verification (Optional)

**Want to make sure it's working?**

1. Create a test invoice (AED 1,000, status "sent")
2. Go to: Accounting → Journal Entries
3. You should see a new entry with status "posted"
4. ✅ It's working!

**That's all you need to check!**

---

## 🆘 Troubleshooting

### "Account not found" Error

**Solution:**
1. Run the migration script again: `server/create-accounting-module.sql`
2. Restart your server
3. Try again

### Journal Entries Not Created

**Possible causes:**
1. Invoice status is "draft" (change to "sent" or "paid")
2. Migration not run (run the migration script)

**Solution:**
- Check invoice status
- Run migration if needed

### Can't See Reports

**Solution:**
- Make sure you've created some invoices/expenses
- Select a date range that includes your transactions
- Check that journal entries exist (Accounting → Journal Entries)

---

## 📚 Simple Glossary (If You're Curious)

**Accounts Receivable:** Money customers owe you

**Accounts Payable:** Money you owe suppliers

**Sales Revenue:** Money you earned from sales

**Operating Expenses:** Money you spent on business

**VAT Payable:** VAT you collected (must pay to government)

**Profit:** Revenue minus Expenses

**Assets:** What you own

**Liabilities:** What you owe

**Equity:** Your business's net worth

**But remember:** You don't need to know these! The system handles everything.

---

## ✅ Checklist

- [ ] Migration script run? (`server/create-accounting-module.sql`)
- [ ] Server restarted?
- [ ] Created a test invoice?
- [ ] Checked Journal Entries (should see entry)?
- [ ] Generated a Profit & Loss report?

**If all checked:** You're all set! 🎉

---

## 🎯 Bottom Line

**The accounting module:**
- ✅ Works automatically
- ✅ Requires no accounting knowledge
- ✅ Handles everything in the background
- ✅ Generates reports when you need them

**You:**
- ✅ Just use your business normally
- ✅ Create invoices and expenses
- ✅ View reports when needed
- ✅ Focus on running your business

**That's it!** The accounting is handled automatically. You don't need to worry about it. 🚀

---

**Questions?** Check `ACCOUNTING_AUTOMATED_SETUP.md` for more details.

