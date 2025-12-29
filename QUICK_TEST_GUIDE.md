# Quick Test Guide: CompanyId Data Isolation

## 🚀 Quick Start

### 1. Run Automated Tests

```bash
# Test data isolation
node scripts/test-companyid-isolation.js

# Verify all tables have companyId
node scripts/verify-companyid.js
```

### 2. Monitor Logs in Real-Time

**In your server console, watch for these messages:**

```
✅ Good Log Messages:
[Tenant] ✅ Company context set: companyId=1 for user user@companya.com
[Tenant] ✅ Company context set: companyId=2 for user user@companyb.com

⚠️ Warning Messages (investigate these):
[Tenant] ⚠️ User user@example.com has no companyId, using default (1)
[Tenant] ⚠️ Could not fetch user companyId, using default (1)
```

### 3. Manual API Testing

**Step 1: Get Auth Tokens**
- Login as User A (Company 1) → Copy the auth token
- Login as User B (Company 2) → Copy the auth token

**Step 2: Test with Postman/Thunder Client**

```
# Test 1: Create invoice as Company A
POST http://localhost:3000/api/invoices
Headers: Authorization: Bearer <token-company-a>
Body: { "customerName": "Test Customer A", ... }

# Test 2: Try to get Company A's invoice as Company B (should fail)
GET http://localhost:3000/api/invoices/<invoice-id-from-company-a>
Headers: Authorization: Bearer <token-company-b>
Expected: 404 Not Found

# Test 3: List invoices as Company B (should only see Company B's)
GET http://localhost:3000/api/invoices
Headers: Authorization: Bearer <token-company-b>
Expected: Only Company B's invoices
```

### 4. Database Verification

```sql
-- Check data distribution
SELECT companyId, COUNT(*) as count FROM invoices GROUP BY companyId;
SELECT companyId, COUNT(*) as count FROM employees GROUP BY companyId;
SELECT companyId, COUNT(*) as count FROM expenses GROUP BY companyId;

-- Check for NULL companyId (should be 0)
SELECT COUNT(*) FROM invoices WHERE companyId IS NULL;
SELECT COUNT(*) FROM employees WHERE companyId IS NULL;
```

### 5. What to Check

✅ **Correct Behavior:**
- Server logs show `[Tenant] ✅ Company context set: companyId=X`
- Each user only sees their company's data
- New records are created with correct companyId
- Updates/deletes only affect user's company data

❌ **Issues to Watch For:**
- Users seeing data from other companies
- All records have companyId = 1
- Missing `[Tenant]` log messages
- Warnings about missing companyId

## 📝 Testing Checklist

- [ ] Run `node scripts/test-companyid-isolation.js`
- [ ] Run `node scripts/verify-companyid.js`
- [ ] Check server logs for `[Tenant]` messages
- [ ] Test API with 2 different user accounts
- [ ] Verify users cannot see other companies' data
- [ ] Check database for proper companyId distribution
- [ ] Verify no NULL companyId values

## 🔍 Debugging Tips

**If users see all data:**
1. Check if route uses `setTenantContext` middleware
2. Verify queries include `where: { companyId: req.companyId }`
3. Check logs for companyId assignment

**If all data has companyId = 1:**
1. Check controllers use `req.companyId` not hardcoded `1`
2. Verify users have correct companyId in database
3. Check `setTenantContext` middleware is working

**If no logs appear:**
1. Ensure `setTenantContext` is called before route handlers
2. Check middleware order in route files
3. Verify authentication is working

