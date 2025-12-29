# Fix Existing Data After Multi-Tenancy Implementation

## 🔍 Problem

After implementing multi-tenancy, existing users and data might not be showing up because:
- Existing users don't have `companyId` assigned correctly
- Existing invoices, inventory items, and sales have `companyId = 1` (default) but users might not be mapped correctly
- Email domain mapping might not match existing user emails

## ✅ Solution

### **Step 1: Update Email Domain Mapping**

First, identify what email domains your existing users have:

```sql
-- Check existing user email domains
SELECT 
    SUBSTRING(email, CHARINDEX('@', email) + 1, LEN(email)) AS domain,
    COUNT(*) AS user_count
FROM users
GROUP BY SUBSTRING(email, CHARINDEX('@', email) + 1, LEN(email))
ORDER BY user_count DESC;
```

Then update `scripts/assign-companyid-to-existing-data.js` with your actual email domains:

```javascript
const companyMap = {
  'yourdomain.com': 1,      // Your main domain → companyId = 1
  'anotherdomain.com': 2,   // Another domain → companyId = 2
  // Add all your actual domains
};
```

### **Step 2: Run the Assignment Script**

```bash
node scripts/assign-companyid-to-existing-data.js
```

This script will:
1. ✅ Assign `companyId` to all existing users based on their email domain
2. ✅ Assign `companyId` to all existing invoices (based on creator's email)
3. ✅ Assign `companyId` to all existing inventory items (based on creator's email)
4. ✅ Assign `companyId` to all existing sales (based on creator's email)
5. ✅ Show a summary of data distribution by company

### **Step 3: Verify Results**

After running the script, check the summary output. It should show:
- How many users per company
- How many invoices per company
- How many inventory items per company
- How many sales per company

### **Step 4: Test Login**

1. **Login as an existing user**
2. **Verify you can see your data:**
   - Invoices page should show your invoices
   - Inventory page should show your items
   - Sales page should show your sales

### **Step 5: Manual Adjustments (If Needed)**

If some data was assigned to the wrong company, you can manually fix it:

```sql
-- Example: Move specific invoices to companyId = 2
UPDATE invoices 
SET companyId = 2 
WHERE id IN (1, 2, 3);  -- Replace with actual invoice IDs

-- Example: Move all invoices created by a specific user to companyId = 2
UPDATE invoices 
SET companyId = 2 
WHERE createdByEmail = 'user@example.com';

-- Example: Move all inventory items to companyId = 2
UPDATE inventoryItems 
SET companyId = 2 
WHERE createdByEmail = 'user@example.com';

-- Example: Move all sales to companyId = 2
UPDATE sales 
SET companyId = 2 
WHERE createdByEmail = 'user@example.com';
```

## 🔧 Alternative: Assign All Existing Data to One Company

If you want all existing data to belong to one company (e.g., companyId = 1):

```sql
-- Assign all users to companyId = 1
UPDATE users SET companyId = 1 WHERE companyId IS NULL OR companyId = 0;

-- Assign all invoices to companyId = 1
UPDATE invoices SET companyId = 1 WHERE companyId IS NULL OR companyId = 0;

-- Assign all inventory items to companyId = 1
UPDATE inventoryItems SET companyId = 1 WHERE companyId IS NULL OR companyId = 0;

-- Assign all sales to companyId = 1
UPDATE sales SET companyId = 1 WHERE companyId IS NULL OR companyId = 0;
```

## 📊 Verify Data Distribution

After running the script, verify the distribution:

```sql
-- Check users by companyId
SELECT companyId, COUNT(*) as user_count
FROM users
GROUP BY companyId
ORDER BY companyId;

-- Check invoices by companyId
SELECT companyId, COUNT(*) as invoice_count
FROM invoices
GROUP BY companyId
ORDER BY companyId;

-- Check inventory items by companyId
SELECT companyId, COUNT(*) as item_count
FROM inventoryItems
GROUP BY companyId
ORDER BY companyId;

-- Check sales by companyId
SELECT companyId, COUNT(*) as sale_count
FROM sales
GROUP BY companyId
ORDER BY companyId;
```

## 🎯 Quick Fix Script

If you just want to quickly assign everything to companyId = 1:

```sql
-- Quick fix: Assign everything to companyId = 1
UPDATE users SET companyId = 1;
UPDATE invoices SET companyId = 1;
UPDATE inventoryItems SET companyId = 1;
UPDATE sales SET companyId = 1;
```

Then update `server/middleware/authMiddleware.js` to map your email domain:

```javascript
const companyMap = {
  'yourdomain.com': 1,  // All users from this domain get companyId = 1
};
```

## ⚠️ Important Notes

1. **Backup First**: Always backup your database before running bulk updates
2. **Test in Development**: Test the script on a development database first
3. **Verify Results**: Always verify the data distribution after running the script
4. **Email Domain Matching**: Make sure email domain mapping matches your actual user emails

## 🐛 Troubleshooting

### **Issue: Users still can't see their data**

**Check:**
1. Is `companyId` assigned correctly? Run:
   ```sql
   SELECT email, companyId FROM users WHERE email = 'your-email@domain.com';
   ```

2. Is the email domain mapped correctly in `authMiddleware.js`?

3. Is `setTenantContext` middleware applied to routes?

### **Issue: Data assigned to wrong company**

**Fix:**
- Use the manual SQL updates above to reassign data
- Or re-run the assignment script after updating the email domain mapping

### **Issue: Script fails**

**Check:**
1. Database connection
2. Table names (case-sensitive in some databases)
3. Column names (should be `companyId`, not `company_id`)

## ✅ Success Criteria

After running the script, you should:
- ✅ All users have `companyId` assigned
- ✅ All invoices have `companyId` assigned
- ✅ All inventory items have `companyId` assigned
- ✅ All sales have `companyId` assigned
- ✅ Users can see their data when they login
- ✅ Data is correctly isolated by company

---

**After running the script, your existing data should be visible again!** 🎉

