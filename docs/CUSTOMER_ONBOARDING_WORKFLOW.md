# Customer Onboarding Workflow

## 🎯 Your Use Case

You want to give logins to customers using their company name. Each customer should:
- Have their own company record
- Use their own email domain
- See only their own data
- Be completely isolated from other customers

---

## 🚀 Quick Start: Onboard a Customer

### **Method 1: Using Script (Easiest)**

```bash
node scripts/onboard-new-customer.js "Customer A Trading LLC" customera.com
```

This automatically:
1. ✅ Creates company record
2. ✅ Adds email domain mapping
3. ✅ Shows summary and next steps

### **Method 2: Using SQL (Manual)**

```sql
-- Step 1: Create company
INSERT INTO companies (companyId, name, shopName, email, phone)
VALUES (2, 'Customer A Trading LLC', 'Customer A Shop', 'info@customera.com', '+971-4-123-4567');

-- Step 2: Add email domain
INSERT INTO company_email_domains (companyId, emailDomain, isActive)
VALUES (2, 'customera.com', 1);
```

---

## 📋 Complete Onboarding Checklist

### **Before Onboarding:**
- [ ] Get customer company name
- [ ] Get customer email domain(s)
- [ ] Get customer contact details (optional)

### **During Onboarding:**
- [ ] Create company record
- [ ] Add email domain mapping
- [ ] Verify setup

### **After Onboarding:**
- [ ] Update company details (address, phone, TRN)
- [ ] Create test user in Firebase
- [ ] Test login and verify data isolation
- [ ] Provide login credentials to customer

---

## 🎯 Example: Onboarding "ABC Trading LLC"

### **Step 1: Run Script**

```bash
node scripts/onboard-new-customer.js "ABC Trading LLC" abctrading.com
```

**Output:**
```
✅ Company created: ABC Trading LLC (companyId: 2)
✅ Created domain mapping: abctrading.com → companyId 2
```

### **Step 2: Update Company Details (Optional)**

```sql
UPDATE companies 
SET address = '123 Business Bay, Dubai, UAE',
    phone = '+971-4-123-4567',
    trn = 'TRN123456789'
WHERE companyId = 2;
```

### **Step 3: Create Users in Firebase**

1. Go to Firebase Console → Authentication
2. Create users with `@abctrading.com` emails:
   - `admin@abctrading.com`
   - `manager@abctrading.com`
   - etc.

### **Step 4: Test**

1. Login as `admin@abctrading.com`
2. Verify user gets `companyId = 2`
3. Verify user sees empty data (no data for companyId = 2 yet)
4. Create test invoice/item
5. Verify it's assigned `companyId = 2`

---

## 📊 Multiple Customers Example

### **Customer 1: ABC Trading**
```bash
node scripts/onboard-new-customer.js "ABC Trading LLC" abctrading.com
# Creates companyId = 2
```

### **Customer 2: XYZ Enterprises**
```bash
node scripts/onboard-new-customer.js "XYZ Enterprises" xyzenterprises.com
# Creates companyId = 3
```

### **Customer 3: DEF Group**
```bash
node scripts/onboard-new-customer.js "DEF Group" defgroup.com
# Creates companyId = 4
```

Each customer is completely isolated! ✅

---

## 🔍 Verify Setup

### **Check All Companies:**
```sql
SELECT companyId, name, shopName, email, phone
FROM companies
ORDER BY companyId;
```

### **Check All Domain Mappings:**
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

## ⚠️ Important Notes

1. **Email Domain Must Match:** Users must login with emails from the mapped domain
2. **Data Isolation:** Each customer only sees their own data
3. **No Code Changes:** Everything is database-driven
4. **No Restart:** Changes take effect immediately

---

## 🎯 Summary

**To onboard a new customer:**
1. Run: `node scripts/onboard-new-customer.js "Company Name" domain.com`
2. Update company details (optional)
3. Create users in Firebase
4. Done! ✅

**That's it!** Each customer gets their own isolated environment! 🎉

