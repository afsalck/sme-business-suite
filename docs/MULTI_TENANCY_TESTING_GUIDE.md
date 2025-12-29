# Multi-Tenancy Testing Guide 🧪

## 📋 Testing Checklist

This guide will help you verify that multi-tenancy is working correctly.

---

## Step 1: Run Database Migration

### **1.1. Run the Migration Script**

```bash
node scripts/add-companyid-migration.js
```

**Expected Output:**
```
🔄 Starting companyId migration...
✅ Database connected
✅ Query executed successfully
✅ Query executed successfully
✅ Query executed successfully
✅ Query executed successfully
✅ Migration completed!
```

### **1.2. Verify Columns Were Added**

Run this SQL query in SQL Server Management Studio (SSMS) or your database tool:

```sql
-- Check if companyId columns exist
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE COLUMN_NAME = 'companyId'
ORDER BY TABLE_NAME;
```

**Expected Result:** You should see `companyId` in:
- `users`
- `invoices`
- `inventoryItems`
- `sales`

### **1.3. Verify Indexes Were Created**

```sql
-- Check indexes on companyId
SELECT 
    t.name AS TableName,
    i.name AS IndexName,
    c.name AS ColumnName
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
INNER JOIN sys.tables t ON i.object_id = t.object_id
WHERE c.name = 'companyId'
ORDER BY t.name;
```

**Expected Result:** You should see indexes like:
- `IX_Users_CompanyId`
- `IX_Invoices_CompanyId`
- `IX_InventoryItems_CompanyId`
- `IX_Sales_CompanyId`

---

## Step 2: Configure Email Domain Mapping

### **2.1. Edit authMiddleware.js**

Open `server/middleware/authMiddleware.js` and update the `companyMap`:

```javascript
const companyMap = {
  'customera.com': 1,      // Customer A → companyId = 1
  'customerb.com': 2,      // Customer B → companyId = 2
  'testcompany.com': 3,    // Test Company → companyId = 3
  // Add your actual customer domains here
};
```

### **2.2. Restart Server**

After editing, restart your Node.js server:

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm start
# or
node server.js
```

---

## Step 3: Create Test Users

### **3.1. Create Test Users in Firebase**

You need to create test users with different email domains:

**Option A: Using Firebase Console**
1. Go to Firebase Console → Authentication → Users
2. Click "Add user"
3. Create users with different email domains:
   - `testuser1@customera.com` (password: `test123`)
   - `testuser2@customerb.com` (password: `test123`)
   - `testuser3@testcompany.com` (password: `test123`)

**Option B: Using Firebase CLI**
```bash
firebase auth:import users.json
```

Create `users.json`:
```json
{
  "users": [
    {
      "localId": "user1",
      "email": "testuser1@customera.com",
      "passwordHash": "...",
      "emailVerified": true
    },
    {
      "localId": "user2",
      "email": "testuser2@customerb.com",
      "passwordHash": "...",
      "emailVerified": true
    }
  ]
}
```

### **3.2. Login and Verify companyId Assignment**

**Test 1: Login as User 1**
1. Open your application
2. Login as `testuser1@customera.com`
3. Open browser DevTools → Console
4. Check the logs - you should see:
   ```
   [Auth] ✅ User created: testuser1@customera.com → companyId: 1
   [Tenant] ✅ Company context set: companyId=1 for user testuser1@customera.com
   ```

**Test 2: Login as User 2**
1. Logout
2. Login as `testuser2@customerb.com`
3. Check logs - you should see:
   ```
   [Auth] ✅ User created: testuser2@customerb.com → companyId: 2
   [Tenant] ✅ Company context set: companyId=2 for user testuser2@customerb.com
   ```

**Test 3: Verify in Database**

```sql
-- Check users table
SELECT id, email, companyId, role, createdAt
FROM users
ORDER BY createdAt DESC;
```

**Expected Result:**
- `testuser1@customera.com` → `companyId = 1`
- `testuser2@customerb.com` → `companyId = 2`

---

## Step 4: Test Data Isolation

### **4.1. Create Test Data as User 1**

1. **Login as `testuser1@customera.com`**
2. **Create an Invoice:**
   - Go to Invoices page
   - Click "Create Invoice"
   - Fill in details:
     - Customer: "Test Customer A"
     - Items: Add some items
     - Save
   - Note the invoice number (e.g., `INV-001`)

3. **Create an Inventory Item:**
   - Go to Inventory page
   - Click "Add Item"
   - Fill in:
     - Name: "Test Product A"
     - SKU: "TEST-A-001"
     - Save

4. **Create a Sale (via POS):**
   - Go to POS page
   - Add items to cart
   - Complete sale
   - Note the sale ID

### **4.2. Verify Data in Database**

```sql
-- Check invoices for companyId = 1
SELECT id, invoiceNumber, customerName, companyId, createdAt
FROM invoices
WHERE companyId = 1
ORDER BY createdAt DESC;

-- Check inventory items for companyId = 1
SELECT id, name, sku, companyId, createdAt
FROM inventoryItems
WHERE companyId = 1
ORDER BY createdAt DESC;

-- Check sales for companyId = 1
SELECT id, date, totalSales, companyId, createdAt
FROM sales
WHERE companyId = 1
ORDER BY createdAt DESC;
```

**Expected Result:** All records should have `companyId = 1`

### **4.3. Test Data Isolation - User 2 Should NOT See User 1's Data**

1. **Logout from User 1**
2. **Login as `testuser2@customerb.com`**
3. **Check Invoices Page:**
   - Should NOT see User 1's invoice
   - Invoice list should be empty (or show only User 2's invoices)

4. **Check Inventory Page:**
   - Should NOT see "Test Product A"
   - Should NOT see items created by User 1

5. **Check Sales Page:**
   - Should NOT see sales created by User 1

### **4.4. Create Test Data as User 2**

1. **While logged in as User 2:**
   - Create an invoice: "Test Customer B"
   - Create an inventory item: "Test Product B"
   - Create a sale

2. **Verify in Database:**

```sql
-- Check invoices for companyId = 2
SELECT id, invoiceNumber, customerName, companyId
FROM invoices
WHERE companyId = 2;

-- Check inventory items for companyId = 2
SELECT id, name, sku, companyId
FROM inventoryItems
WHERE companyId = 2;

-- Check sales for companyId = 2
SELECT id, date, totalSales, companyId
FROM sales
WHERE companyId = 2;
```

**Expected Result:** All records should have `companyId = 2`

### **4.5. Verify Complete Isolation**

```sql
-- Count records per company
SELECT 
    companyId,
    COUNT(*) AS invoice_count
FROM invoices
GROUP BY companyId;

SELECT 
    companyId,
    COUNT(*) AS item_count
FROM inventoryItems
GROUP BY companyId;

SELECT 
    companyId,
    COUNT(*) AS sale_count
FROM sales
GROUP BY companyId;
```

**Expected Result:**
- Company 1 should have its own invoices/items/sales
- Company 2 should have its own invoices/items/sales
- No overlap

---

## Step 5: Test API Endpoints

### **5.1. Test Invoice Endpoints**

**Test as User 1 (companyId = 1):**

```bash
# Get auth token (login first, then get token from browser DevTools → Application → Local Storage)
TOKEN="your-firebase-token-here"

# List invoices (should only return companyId = 1 invoices)
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/invoices

# Create invoice
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "API Test Customer",
    "items": [{"name": "Item 1", "quantity": 1, "price": 100}],
    "issueDate": "2024-01-01"
  }' \
  http://localhost:5000/api/invoices

# Get specific invoice (should only work if invoice belongs to companyId = 1)
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/invoices/1
```

**Test as User 2 (companyId = 2):**

```bash
# List invoices (should NOT see User 1's invoices)
curl -H "Authorization: Bearer $TOKEN2" http://localhost:5000/api/invoices

# Try to access User 1's invoice (should return 404)
curl -H "Authorization: Bearer $TOKEN2" http://localhost:5000/api/invoices/1
```

**Expected Result:**
- User 2 should get `404 Not Found` when trying to access User 1's invoice
- User 2 should only see their own invoices

### **5.2. Test Inventory Endpoints**

```bash
# List inventory items (should only return companyId = 1 items)
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/inventory

# Create inventory item
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test Item",
    "sku": "API-001",
    "stock": 10,
    "costPrice": 50,
    "salePrice": 100
  }' \
  http://localhost:5000/api/inventory
```

**Verify in Database:**

```sql
-- Check the created item has correct companyId
SELECT id, name, sku, companyId
FROM inventoryItems
WHERE name = 'API Test Item';
```

---

## Step 6: Test Edge Cases

### **6.1. Test Default companyId (Unmapped Domain)**

1. **Create a user with unmapped email domain:**
   - Email: `test@unknown.com`
   - Login

2. **Check logs:**
   ```
   [Auth] ✅ User created: test@unknown.com → companyId: 1
   ```
   Should default to `companyId = 1`

3. **Verify in database:**
   ```sql
   SELECT email, companyId FROM users WHERE email = 'test@unknown.com';
   ```
   Should be `companyId = 1`

### **6.2. Test Existing Data**

If you have existing data before migration:

```sql
-- Check if any records have NULL companyId (shouldn't happen after migration)
SELECT COUNT(*) AS null_count
FROM invoices
WHERE companyId IS NULL;

SELECT COUNT(*) AS null_count
FROM inventoryItems
WHERE companyId IS NULL;

SELECT COUNT(*) AS null_count
FROM sales
WHERE companyId IS NULL;
```

**Expected Result:** All should return `0`

### **6.3. Test PDF Generation**

1. **Login as User 1**
2. **Create an invoice**
3. **Download PDF**
4. **Logout**
5. **Login as User 2**
6. **Try to download User 1's invoice PDF**

**Expected Result:** Should return `404 Not Found` or error

---

## Step 7: Automated Testing Script

Create a test script to verify everything:

```javascript
// scripts/test-multi-tenancy.js
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testMultiTenancy() {
  console.log('🧪 Testing Multi-Tenancy...\n');

  // Test 1: Verify companyId is set
  console.log('Test 1: Verify companyId assignment');
  // ... (implement test)

  // Test 2: Verify data isolation
  console.log('Test 2: Verify data isolation');
  // ... (implement test)

  // Test 3: Verify CRUD operations
  console.log('Test 3: Verify CRUD operations');
  // ... (implement test)

  console.log('\n✅ All tests passed!');
}

testMultiTenancy();
```

---

## Step 8: Performance Testing

### **8.1. Test Query Performance**

```sql
-- Check query execution plans
SET STATISTICS IO ON;

-- Test invoice query with companyId filter
SELECT * FROM invoices WHERE companyId = 1;

-- Check if index is being used
-- In SSMS: Include Actual Execution Plan (Ctrl+M)
```

**Expected Result:** Index should be used (Index Seek, not Table Scan)

### **8.2. Test with Large Dataset**

1. Create 1000 invoices for companyId = 1
2. Create 1000 invoices for companyId = 2
3. Login as User 1
4. List invoices - should only see 1000 invoices (companyId = 1)
5. Verify query is fast (< 1 second)

---

## ✅ Success Criteria

Multi-tenancy is working correctly if:

1. ✅ **Migration completed** - All tables have `companyId` column
2. ✅ **Email domain mapping works** - Users get correct `companyId` based on email
3. ✅ **Data isolation works** - Users only see their company's data
4. ✅ **CRUD operations work** - Create/Read/Update/Delete respects `companyId`
5. ✅ **No data leakage** - Users cannot access other companies' data
6. ✅ **Default companyId works** - Unmapped domains default to `companyId = 1`
7. ✅ **Performance is good** - Queries use indexes and are fast

---

## 🐛 Troubleshooting

### **Issue: Users seeing all data**

**Check:**
1. Is `setTenantContext` middleware applied to routes?
2. Is `req.companyId` being set correctly?
3. Are queries filtering by `companyId`?

**Fix:**
```javascript
// Verify middleware is applied
router.get("/", setTenantContext, async (req, res) => {
  console.log('CompanyId:', req.companyId); // Should log correct companyId
  // ...
});
```

### **Issue: companyId not being assigned**

**Check:**
1. Is email domain mapping configured?
2. Are users logging in via Firebase?
3. Check server logs for `[Auth]` messages

**Fix:**
```javascript
// Add logging in authMiddleware.js
console.log('Email domain:', emailDomain);
console.log('Mapped companyId:', companyId);
```

### **Issue: Migration failed**

**Check:**
1. Database connection
2. SQL Server permissions
3. Table names (case-sensitive in some databases)

**Fix:**
```sql
-- Manually add column if migration failed
ALTER TABLE invoices ADD companyId INT NOT NULL DEFAULT 1;
CREATE INDEX IX_Invoices_CompanyId ON invoices(companyId);
```

---

## 📊 Test Results Template

Use this template to document your test results:

```
Date: ___________
Tester: ___________

✅ Migration: PASS / FAIL
✅ Email Domain Mapping: PASS / FAIL
✅ User Creation: PASS / FAIL
✅ Data Isolation: PASS / FAIL
✅ CRUD Operations: PASS / FAIL
✅ Edge Cases: PASS / FAIL
✅ Performance: PASS / FAIL

Notes:
- 
- 
- 
```

---

## 🎯 Next Steps After Testing

1. **If all tests pass:** Deploy to production! 🚀
2. **If tests fail:** Review error logs and fix issues
3. **Document any issues:** Update this guide with solutions

---

**Happy Testing!** 🧪✨

