# Developer All Companies Access

## Overview

Developers now have access to **all companies' data**, bypassing the normal `companyId` filtering. This allows developers to manage and view data across all tenants.

## How It Works

### 1. Developer Detection

The system automatically detects developers by:
- Email domain (`@bizease.ae`, `@developer.com`)
- Specific email addresses (configured in `tenantMiddleware.js`)
- Environment variable `DEVELOPER_EMAILS`

### 2. Tenant Middleware

The `setTenantContext` middleware now sets:
- `req.isDeveloper = true` for developers
- `req.companyId` is still set (for reference), but queries ignore it for developers

### 3. Query Helper Function

Use `buildWhereClause(req, additionalWhere)` to build where clauses:

```javascript
const { buildWhereClause } = require('../server/utils/queryHelpers');

// Regular user: { companyId: 1, status: 'active' }
// Developer: { status: 'active' }
const where = buildWhereClause(req, { status: 'active' });
```

## Migration Guide

### Update Routes/Controllers

**Before:**
```javascript
const employees = await Employee.findAll({
  where: {
    companyId: req.companyId  // ❌ Always filters by companyId
  }
});
```

**After:**
```javascript
const { buildWhereClause } = require('../server/utils/queryHelpers');

const employees = await Employee.findAll({
  where: buildWhereClause(req, {})  // ✅ Developers see all companies
});
```

### For Create/Update Operations

**Before:**
```javascript
await Employee.create({
  ...data,
  companyId: req.companyId  // ❌ Always uses user's companyId
});
```

**After:**
```javascript
const { getCompanyIdForOperation } = require('../server/utils/queryHelpers');

await Employee.create({
  ...data,
  companyId: getCompanyIdForOperation(req)  // ✅ Uses user's companyId (or explicit if provided)
});
```

## Files Updated

✅ `server/middleware/tenantMiddleware.js` - Added developer detection
✅ `server/utils/queryHelpers.js` - New helper functions
✅ `routes/dashboardRoutes.js` - Updated to use helper
✅ `routes/hrRoutes.js` - Updated to use helper (partial)
✅ `server/controllers/reportController.js` - Updated to use helper (partial)

## Remaining Files to Update

The following files still need to be updated to use `buildWhereClause`:

### Routes:
- `routes/invoiceRoutes.js`
- `routes/expenseRoutes.js`
- `routes/payrollRoutes.js`
- `routes/kycRoutes.js`
- `routes/accountingRoutes.js`
- `routes/paymentRoutes.js`
- `routes/vatFilingRoutes.js`
- `routes/vatRoutes.js`
- `routes/notificationRoutes.js`
- `routes/hrRoutes.js` (remaining queries)

### Controllers:
- `server/controllers/payrollController.js`
- `server/controllers/accountingController.js`
- `server/controllers/paymentController.js`
- `server/controllers/kycController.js`
- `server/controllers/vatFilingController.js`
- `server/controllers/vatController.js`
- `server/controllers/reportController.js` (remaining queries)

## Quick Update Script

You can use find/replace to update most files:

**Find:**
```javascript
where: {
  companyId: req.companyId
}
```

**Replace:**
```javascript
where: buildWhereClause(req, {})
```

**Don't forget to add the import at the top:**
```javascript
const { buildWhereClause } = require('../server/utils/queryHelpers');
```

## Testing

1. **As Developer:**
   - Should see data from ALL companies
   - Can access any company's data
   - Logs should show: `[Tenant] ✅ Developer access: email (can access ALL companies)`

2. **As Regular User:**
   - Should only see their own company's data
   - Cannot access other companies' data
   - Logs should show: `[Tenant] ✅ Company context set: companyId=X for user email`

## Security Notes

- Developers have full access to all companies' data
- This is intentional for system administration
- Regular users are still properly isolated by companyId
- Consider adding audit logging for developer access to sensitive data

