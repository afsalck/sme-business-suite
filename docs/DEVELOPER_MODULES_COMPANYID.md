# Developer-Only Modules: CompanyId Handling

## Overview

For developer-only modules (Company Management, Company Settings, Admin Management), we need special handling because:
- Developers need to see/manage ALL companies
- Regular users should only see their own company
- These modules bypass normal tenant isolation

## Solution: Developer Role + Bypass Middleware

### Option 1: Bypass Tenant Context (Recommended)

For routes that need to see all companies, **don't use `setTenantContext`** middleware.

**Example:**
```javascript
// ✅ Developer route - NO setTenantContext
router.get('/admin/all', authorizeRole('admin'), async (req, res) => {
  // Can see ALL companies
  const companies = await Company.findAll();
  res.json(companies);
});

// ✅ Regular user route - WITH setTenantContext
router.get('/', setTenantContext, async (req, res) => {
  // Only sees their company
  const company = await Company.findOne({
    where: { companyId: req.companyId }
  });
  res.json(company);
});
```

### Option 2: Optional Tenant Context

Allow developers to optionally specify which company to manage:

```javascript
router.get('/admin/all', authorizeRole('admin'), async (req, res) => {
  // If companyId is provided in query, filter by it
  // Otherwise, return all companies
  const where = req.query.companyId 
    ? { companyId: req.query.companyId }
    : {};
    
  const companies = await Company.findAll({ where });
  res.json(companies);
});
```

---

## Current Implementation

### ✅ Already Correct

**`routes/companyRoutes.js`:**
- `/admin/all` - ✅ No `setTenantContext` (sees all companies)
- `/admin/create` - ✅ No `setTenantContext` (can create for any company)
- `/` (GET) - ✅ Uses `setTenantContext` (user's company only)
- `/` (PUT) - ✅ Uses `setTenantContext` (user's company only)

### 📋 What Needs Checking

1. **Admin Management Routes** - Check if they bypass tenant context
2. **Company Settings Routes** - Verify they work for developers
3. **Any other developer-only routes**

---

## Best Practices

### For Developer Routes:

```javascript
// ✅ CORRECT: No tenant context for admin routes
router.get('/admin/companies', authorizeRole('admin'), async (req, res) => {
  const companies = await Company.findAll(); // All companies
  res.json(companies);
});

// ✅ CORRECT: With optional filtering
router.get('/admin/users', authorizeRole('admin'), async (req, res) => {
  const where = req.query.companyId 
    ? { companyId: req.query.companyId }
    : {};
  const users = await User.findAll({ where });
  res.json(users);
});
```

### For Regular User Routes:

```javascript
// ✅ CORRECT: Always use setTenantContext
router.get('/users', setTenantContext, async (req, res) => {
  const users = await User.findAll({
    where: { companyId: req.companyId } // Only their company
  });
  res.json(users);
});
```

---

## Checklist

For each developer-only module:

- [ ] Route does NOT use `setTenantContext` middleware
- [ ] Route uses `authorizeRole('admin')` or developer check
- [ ] Queries can access all companies (no companyId filter)
- [ ] OR queries allow optional companyId filter via query param
- [ ] Frontend correctly identifies developer vs regular user
- [ ] Regular users cannot access developer routes

---

## Example: Admin Management Route

```javascript
// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { authorizeRole } = require('../server/middleware/authMiddleware');
// ❌ DO NOT import setTenantContext for developer routes

// Get all users across all companies (developer only)
router.get('/users', authorizeRole('admin'), async (req, res) => {
  const where = {};
  
  // Optional: Allow filtering by companyId if provided
  if (req.query.companyId) {
    where.companyId = req.query.companyId;
  }
  
  const users = await User.findAll({ where });
  res.json(users);
});

// Get all companies (developer only)
router.get('/companies', authorizeRole('admin'), async (req, res) => {
  const companies = await Company.findAll();
  res.json(companies);
});
```

---

## Security Notes

⚠️ **Important:**
- Developer routes MUST use `authorizeRole('admin')` or similar
- Never allow regular users to access routes without `setTenantContext`
- Always verify user role before bypassing tenant isolation
- Log all developer actions for audit purposes

---

## Testing

1. **As Developer:**
   - Should see all companies
   - Should be able to manage any company
   - Should see all users across companies

2. **As Regular User:**
   - Should only see their company
   - Should NOT be able to access `/admin/*` routes
   - Should get 403 Forbidden if trying to access developer routes

