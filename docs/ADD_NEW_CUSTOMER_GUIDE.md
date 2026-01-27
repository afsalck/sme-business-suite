# How to Add a New Customer (No Code Changes!)

## 🎯 The Problem

**Before:** Adding a new customer required:
1. Editing code files
2. Restarting server
3. Running scripts
4. Redeploying

**Now:** Add new customers through the database or admin UI - **no code changes needed!**

---

## ✅ Solution: Database-Driven Email Domain Mapping

Email domain mappings are now stored in the `company_email_domains` table, so you can add new customers without touching code!

---

## 📋 Step-by-Step: Add a New Customer

### **Step 1: Create the Company (if needed)**

If the company doesn't exist yet, create it in the `companies` table:

```sql
INSERT INTO companies (companyId, name, shopName, address, email, phone, trn)
VALUES (3, 'New Customer Company', 'New Customer Shop', 'Address here', 'info@newcustomer.com', '+971...', 'TRN123');
```

### **Step 2: Add Email Domain Mapping**

Add the email domain mapping:

```sql
INSERT INTO company_email_domains (companyId, emailDomain, isActive)
VALUES (3, 'newcustomer.com', 1);
```

**That's it!** New users with `@newcustomer.com` emails will automatically get `companyId = 3`.

---

## 🖥️ Using Admin UI (Future Enhancement)

You can create an admin page to manage this:

**Route:** `/admin/company-domains`

**Features:**
- List all email domain mappings
- Add new domain → company mapping
- Edit existing mappings
- Enable/disable domains
- Delete mappings

---

## 🔄 How It Works

1. **User logs in** with `user@newcustomer.com`
2. **authMiddleware** calls `getCompanyIdFromEmail('user@newcustomer.com')`
3. **Service queries** `company_email_domains` table
4. **Finds mapping:** `newcustomer.com` → `companyId = 3`
5. **Assigns** `companyId = 3` to the user
6. **User sees** only data for companyId = 3

---

## 📊 Current Mappings

To see all current mappings:

```sql
SELECT 
    ced.id,
    ced.emailDomain,
    ced.companyId,
    c.name AS companyName,
    ced.isActive,
    ced.createdAt
FROM company_email_domains ced
LEFT JOIN companies c ON ced.companyId = c.companyId
ORDER BY ced.companyId, ced.emailDomain;
```

---

## ⚡ Performance

- **Caching:** Mappings are cached for 5 minutes
- **Fast:** Database lookup is very quick (indexed)
- **Auto-refresh:** Cache refreshes when mappings change

---

## 🎯 Benefits

1. ✅ **No code changes** - Add customers via database
2. ✅ **No server restart** - Changes take effect immediately (after cache refresh)
3. ✅ **No deployment** - Just update database
4. ✅ **Multiple domains** - One company can have multiple email domains
5. ✅ **Easy management** - Simple SQL queries or admin UI

---

## 📝 Example: Adding Multiple Domains for One Company

```sql
-- Company 1 can have multiple domains
INSERT INTO company_email_domains (companyId, emailDomain, isActive) VALUES (1, 'customera.com', 1);
INSERT INTO company_email_domains (companyId, emailDomain, isActive) VALUES (1, 'customera-ae.com', 1);
INSERT INTO company_email_domains (companyId, emailDomain, isActive) VALUES (1, 'customera-uae.com', 1);
```

All three domains will map to `companyId = 1`.

---

## 🔧 Troubleshooting

### **Issue: New user not getting correct companyId**

**Check:**
1. Is the domain in the database?
   ```sql
   SELECT * FROM company_email_domains WHERE emailDomain = 'newcustomer.com';
   ```
2. Is `isActive = 1`?
3. Is the domain spelled correctly (case-insensitive)?

**Fix:**
```sql
-- Update if needed
UPDATE company_email_domains 
SET isActive = 1, companyId = 3 
WHERE emailDomain = 'newcustomer.com';
```

### **Issue: Cache not refreshing**

**Fix:**
- Wait 5 minutes (cache auto-refreshes)
- Or restart server to force cache refresh

---

## ✅ Summary

**To add a new customer:**
1. Create company (if needed)
2. Add email domain mapping: `INSERT INTO company_email_domains ...`
3. Done! No code changes, no restart needed!

**That's it!** 🎉

