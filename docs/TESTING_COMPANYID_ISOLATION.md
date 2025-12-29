# Testing CompanyId Data Isolation

This guide shows you how to test that data isolation works correctly between multiple companies.

## Prerequisites

1. You need at least 2 companies in your database
2. You need users from different companies
3. Run the migration script first: `node scripts/add-companyid-migration.js`

---

## Method 1: Manual Testing (Recommended)

### Step 1: Create Test Companies

First, ensure you have multiple companies in the database:

```sql
-- Check existing companies
SELECT * FROM companies;

-- If you need to create test companies:
INSERT INTO companies (companyId, name, shopName, email) VALUES
(1, 'Company A', 'Shop A', 'admin@companya.com'),
(2, 'Company B', 'Shop B', 'admin@companyb.com');
```

### Step 2: Create Test Users

Create users for each company:

```sql
-- User for Company A
INSERT INTO users (uid, email, displayName, role, companyId) VALUES
('user-a-123', 'user@companya.com', 'User A', 'admin', 1);

-- User for Company B
INSERT INTO users (uid, email, displayName, role, admin', 2);
```

### Step 3: Test Data Isolation

1. **Login as User from Company A**
   - Create some test data (invoices, employees, expenses, etc.)
   - Note the IDs of created records

2. **Login as User from Company B**
   - Try to access the same endpoints
   - Verify you CANNOT see Company A's data
   - Create your own test data

3. **Verify Isolation**
   - Company B should only see their own data
   - Company A's data should be invisible to Company B

---

## Method 2: Automated Test Script

Run the automated test script:

```bash
node scripts/test-companyid-isolation.js
```

This script will:
- Create test data for multiple companies
- Verify data isolation
- Report any issues

---

## Method 3: Check Logs

### Enable Detailed Logging

The `setTenantContext` middleware already logs companyId. Check your server logs for:

```
[Tenant] ✅ Company context set: companyId=1 for user user@companya.com
[Tenant] ✅ Company context set: companyId=2 for user user@companyb.com
```

### What to Look For

1. **On Every Request:**
   - Look for `[Tenant] ✅ Company context set: companyId=X`
   - Verify the companyId matches the user's company

2. **In Database Queries:**
   - Check that queries include `WHERE companyId = X`
   - Verify no queries return data from other companies

3. **In Route Handlers:**
   - Look for `req.companyId` being used
   - Verify it's not hardcoded as `1`

---

## Method 4: Database Query Verification

### Check Data Distribution

```sql
-- See how data is distributed across companies
SELECT companyId, COUNT(*) as count
FROM invoices
GROUP BY companyId;

SELECT companyId, COUNT(*) as count
FROM employees
GROUP BY companyId;

SELECT companyId, COUNT(*) as count
FROM expenses
GROUP BY companyId;
```

### Verify Isolation

```sql
-- Try to find cross-company data (should return 0 rows)
SELECT * FROM invoices i1
WHERE EXISTS (
  SELECT 1 FROM invoices i2
  WHERE i2.companyId != i1.companyId
  AND i2.id = i1.id
);
```

---

## Method 5: API Testing with Postman/Thunder Client

### Setup

1. **Get Auth Tokens:**
   - Login as User A (Company 1) → Get token A
   - Login as User B (Company 2) → Get token B

2. **Test Endpoints:**

   **Test 1: Create Data as Company A**
   ```
   POST /api/invoices
   Headers: Authorization: Bearer <token-A>
   Body: { ...invoice data... }
   ```
   Note the invoice ID returned.

   **Test 2: Try to Access Company A's Data as Company B**
   ```
   GET /api/invoices/<invoice-id-from-company-a>
   Headers: Authorization: Bearer <token-B>
   ```
   Expected: 404 Not Found (should not be able to access)

   **Test 3: List All Invoices as Company B**
   ```
   GET /api/invoices
   Headers: Authorization: Bearer <token-B>
   ```
   Expected: Only Company B's invoices (should not include Company A's)

---

## Common Issues to Check

### ❌ Issue 1: Missing setTenantContext Middleware

**Symptom:** All users see all data regardless of company

**Check:**
```javascript
// In route files, ensure setTenantContext is used:
router.get('/', setTenantContext, async (req, res) => {
  // ...
});
```

### ❌ Issue 2: Hardcoded companyId

**Symptom:** All data created with companyId = 1

**Check:**
```javascript
// ❌ WRONG:
const companyId = 1;

// ✅ CORRECT:
const companyId = req.companyId || 1;
```

### ❌ Issue 3: Missing companyId in WHERE Clauses

**Symptom:** Queries return data from all companies

**Check:**
```javascript
// ❌ WRONG:
const items = await Model.findAll();

// ✅ CORRECT:
const items = await Model.findAll({
  where: { companyId: req.companyId }
});
```

---

## Monitoring Checklist

- [ ] Check server logs for `[Tenant] ✅ Company context set` messages
- [ ] Verify `req.companyId` is set correctly in each request
- [ ] Confirm database queries include `companyId` filter
- [ ] Test with at least 2 different companies
- [ ] Verify users cannot see other companies' data
- [ ] Check that new records are created with correct `companyId`
- [ ] Verify updates/deletes only affect records from user's company

---

## Quick Test Commands

```bash
# 1. Run verification script
node scripts/verify-companyid.js

# 2. Run isolation test
node scripts/test-companyid-isolation.js

# 3. Check server logs (look for [Tenant] messages)
# In your server console, watch for companyId assignments
```

---

## Expected Behavior

✅ **Correct Behavior:**
- User from Company A can only see Company A's data
- User from Company B can only see Company B's data
- Creating new records assigns correct companyId
- Updates/deletes only affect records from user's company
- Logs show correct companyId for each request

❌ **Incorrect Behavior:**
- Users can see data from other companies
- All data has companyId = 1
- Queries return data from all companies
- No companyId filtering in logs

