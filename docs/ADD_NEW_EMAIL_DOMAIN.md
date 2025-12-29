# How to Add a New Email Domain

## 🎯 Quick Answer

**Just add the domain to the database!** No code changes needed.

---

## 📋 Step-by-Step

### **Step 1: Add Domain Mapping to Database**

Run this SQL in SQL Server Management Studio (SSMS):

```sql
-- Add new domain mapping
INSERT INTO company_email_domains (companyId, emailDomain, isActive)
VALUES (1, 'newdomain.com', 1);
```

**Example:** If you want `customera.com` → `companyId = 1`:

```sql
INSERT INTO company_email_domains (companyId, emailDomain, isActive)
VALUES (1, 'customera.com', 1);
```

**Example:** If you want `customera.com` → `companyId = 2` (different company):

```sql
-- First, make sure companyId = 2 exists in companies table
-- Then:
INSERT INTO company_email_domains (companyId, emailDomain, isActive)
VALUES (2, 'customera.com', 1);
```

---

### **Step 2: Verify**

Check the mapping was added:

```sql
SELECT emailDomain, companyId, isActive
FROM company_email_domains
ORDER BY companyId, emailDomain;
```

---

### **Step 3: Test**

1. **Restart server** (if not already restarted)
2. **Login** with email from new domain (e.g., `user@newdomain.com`)
3. **Verify** user gets correct `companyId`

---

## 🎯 Examples

### **Example 1: Add Multiple Domains to Same Company**

If you want `customera.com` and `customera-ae.com` both → `companyId = 1`:

```sql
INSERT INTO company_email_domains (companyId, emailDomain, isActive)
VALUES (1, 'customera.com', 1);

INSERT INTO company_email_domains (companyId, emailDomain, isActive)
VALUES (1, 'customera-ae.com', 1);
```

### **Example 2: Add Domain to Different Company**

If you want `customerb.com` → `companyId = 2`:

```sql
-- Make sure companyId = 2 exists
INSERT INTO company_email_domains (companyId, emailDomain, isActive)
VALUES (2, 'customerb.com', 1);
```

### **Example 3: Add Multiple Domains**

```sql
-- Add several domains at once
INSERT INTO company_email_domains (companyId, emailDomain, isActive)
VALUES 
  (1, 'customera.com', 1),
  (1, 'customera-ae.com', 1),
  (2, 'customerb.com', 1),
  (2, 'customerb-uae.com', 1);
```

---

## ⚡ Quick Script

I can create a script to add domains easily. Would you like me to create it?

---

## 📊 Current Allowed Domains

To see all currently allowed domains:

```sql
SELECT 
    ced.emailDomain,
    ced.companyId,
    c.name AS companyName,
    ced.isActive
FROM company_email_domains ced
LEFT JOIN companies c ON ced.companyId = c.companyId
WHERE ced.isActive = 1
ORDER BY ced.companyId, ced.emailDomain;
```

---

## 🔄 How It Works

1. **User logs in** with `user@newdomain.com`
2. **System checks** `company_email_domains` table
3. **Finds mapping** → `newdomain.com` → `companyId = 1`
4. **Assigns** `companyId = 1` to user
5. **User sees** data for `companyId = 1`

---

## ⚠️ Important Notes

1. **No Code Changes:** Just add to database
2. **No Server Restart:** Changes take effect immediately (cache refreshes in 5 minutes)
3. **Case Insensitive:** `NewDomain.com` = `newdomain.com`
4. **Active Only:** Only domains with `isActive = 1` are allowed

---

## 🚫 Disable a Domain

To temporarily disable a domain (without deleting):

```sql
UPDATE company_email_domains 
SET isActive = 0
WHERE emailDomain = 'olddomain.com';
```

To re-enable:

```sql
UPDATE company_email_domains 
SET isActive = 1
WHERE emailDomain = 'olddomain.com';
```

---

## ✅ Summary

**To add a new domain:**
1. Run SQL: `INSERT INTO company_email_domains ...`
2. Done! No code changes, no restart needed

**That's it!** 🎉

