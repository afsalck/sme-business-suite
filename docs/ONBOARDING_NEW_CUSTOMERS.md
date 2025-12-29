# Onboarding New Customers - Complete Guide

## 🎯 Overview

When you want to give access to a new customer with their own company name and email domain, follow these steps.

---

## 📋 Step-by-Step: Onboard a New Customer

### **Step 1: Create Company Record**

First, create the company in the `companies` table:

```sql
-- Get next available companyId
SELECT MAX(companyId) + 1 AS nextCompanyId FROM companies;

-- Create new company (replace with actual values)
INSERT INTO companies (companyId, name, shopName, address, email, phone, trn)
VALUES (
  2,                                    -- Next companyId
  'Customer A Trading LLC',             -- Company name
  'Customer A Shop',                    -- Shop name
  '123 Business Bay, Dubai, UAE',       -- Address
  'info@customera.com',                 -- Email
  '+971-4-123-4567',                    -- Phone
  'TRN123456789'                        -- TRN (if available)
);
```

### **Step 2: Add Email Domain Mapping**

Add their email domain(s) to allow login:

```sql
-- Add main domain
INSERT INTO company_email_domains (companyId, emailDomain, isActive)
VALUES (2, 'customera.com', 1);

-- Add additional domains if they have multiple (optional)
INSERT INTO company_email_domains (companyId, emailDomain, isActive)
VALUES (2, 'customera-ae.com', 1);
```

### **Step 3: Verify**

Check everything is set up correctly:

```sql
-- Check company
SELECT companyId, name, shopName, email, phone
FROM companies
WHERE companyId = 2;

-- Check domain mappings
SELECT emailDomain, companyId, isActive
FROM company_email_domains
WHERE companyId = 2;
```

### **Step 4: Test**

1. **Create user in Firebase** with email `test@customera.com`
2. **Login** to your application
3. **Verify** user gets `companyId = 2`
4. **Verify** user only sees data for `companyId = 2` (should be empty initially)

---

## 🚀 Automated Script

I can create a script to do all this automatically. Would you like me to create it?

---

## 📊 Example: Onboarding Multiple Customers

### **Customer 1: Customer A**
```sql
-- Company
INSERT INTO companies (companyId, name, shopName, address, email, phone)
VALUES (2, 'Customer A Trading LLC', 'Customer A Shop', 'Dubai, UAE', 'info@customera.com', '+971-4-111-1111');

-- Domain
INSERT INTO company_email_domains (companyId, emailDomain, isActive)
VALUES (2, 'customera.com', 1);
```

### **Customer 2: Customer B**
```sql
-- Company
INSERT INTO companies (companyId, name, shopName, address, email, phone)
VALUES (3, 'Customer B Enterprises', 'Customer B Store', 'Abu Dhabi, UAE', 'info@customerb.com', '+971-2-222-2222');

-- Domain
INSERT INTO company_email_domains (companyId, emailDomain, isActive)
VALUES (3, 'customerb.com', 1);
```

---

## 🔄 Workflow Summary

1. **Create Company** → `companies` table
2. **Add Email Domain** → `company_email_domains` table
3. **Users Login** → Automatically get correct `companyId`
4. **Data Isolation** → Each customer sees only their data

---

## ✅ Benefits

- ✅ **No Code Changes** - Just database updates
- ✅ **No Server Restart** - Changes take effect immediately
- ✅ **Automatic** - Users get correct `companyId` on login
- ✅ **Secure** - Complete data isolation

---

## 📝 Quick Reference

**Add new customer:**
1. Create company: `INSERT INTO companies ...`
2. Add domain: `INSERT INTO company_email_domains ...`
3. Done!

**That's it!** 🎉

