# Developer-Only Modules: Complete Guide

## Problem

For developer-only modules (Company Management, Company Settings, Admin Management), we need special handling:
- ✅ Developers need to see/manage ALL companies
- ✅ Regular users should only see their own company
- ✅ These modules must bypass normal tenant isolation

## Solution

### Strategy: Don't Use `setTenantContext` for Developer Routes

For routes that need to access all companies, **simply don't use `setTenantContext` middleware**.

---

## Implementation

### ✅ Current Implementation (Already Correct!)

**`routes/companyRoutes.js`** already implements this correctly:

```javascript
// ✅ Developer route - NO setTenantContext
router.get('/admin/all', authorizeRole('admin'), async (req, res) => {
  // Can see ALL companies (no companyId filter)
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

---

## Pattern for Developer Routes

### Pattern 1: Access All Companies (Recommended)

```javascript
// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { authorizeRole } = require('../server/middleware/authMiddleware');
// ❌ DO NOT import setTenantContext

// Get all users across all companies
router.get('/users', authorizeRole('admin'), async (req, res) => {
  const users = await User.findAll(); // No companyId filter
  res.json(users);
});

// Get all companies
router.get('/companies', authorizeRole('admin'), async (req, res) => {
  const companies = await Company.findAll(); // No companyId filter
  res.json(companies);
});
```

### Pattern 2: Optional Company Filter

```javascript
// Allow developers to optionally filter by companyId
router.get('/users', authorizeRole('admin'), async (req, res) => {
  const where = {};
  
  // Optional: Filter by companyId if provided
  if (req.query.companyId) {
    where.companyId = parseInt(req.query.companyId);
  }
  
  const users = await User.findAll({ where });
  res.json(users);
});
```

---

## Checklist for Developer Routes

For each developer-only route:

- [ ] Route uses `authorizeRole('admin')` or similar
- [ ] Route does NOT use `setTenantContext` middleware
- [ ] Queries don't filter by `companyId` (or allow optional filter)
- [ ] Route is clearly marked as developer-only in comments
- [ ] Frontend checks user role before showing these routes

---

## Example Routes

### Company Management Routes

```javascript
// routes/companyRoutes.js

// ✅ Developer: Get all companies
router.get('/admin/all', authorizeRole('admin'), async (req, res) => {
  const companies = await Company.findAll(); // All companies
  res.json(companies);
});

// ✅ Developer: Create company
router.post('/admin/create', authorizeRole('admin'), async (req, res) => {
  const company = await Company.create(req.body); // Can create any company
  res.json(company);
});

// ✅ Regular user: Get their company
router.get('/', setTenantContext, async (req, res) => {
  const company = await Company.findOne({
    where: { companyId: req.companyId } // Only their company
  });
  res.json(company);
});
```

### Admin Management Routes

```javascript
// routes/adminRoutes.js

// ✅ Developer: Get all users
router.get('/users', authorizeRole('admin'), async (req, res) => {
  const where = req.query.companyId 
    ? { companyId: req.query.companyId } // Optional filter
    : {}; // All users
  
  const users = await User.findAll({ where });
  res.json(users);
});

// ✅ Developer: Get all companies
router.get('/companies', authorizeRole('admin'), async (req, res) => {
  const companies = await Company.findAll(); // All companies
  res.json(companies);
});
```

### Company Settings Routes

```javascript
// routes/companySettingsRoutes.js

// ✅ Developer: Get settings for any company
router.get('/:companyId', authorizeRole('admin'), async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  const settings = await CompanySettings.findOne({
    where: { companyId }
  });
  res.json(settings);
});

// ✅ Regular user: Get their company settings
router.get('/', setTenantContext, async (req, res) => {
  const settings = await CompanySettings.findOne({
    where: { companyId: req.companyId } // Only their company
  });
  res.json(settings);
});
```

---

## Security Best Practices

### ✅ DO:
- Always use `authorizeRole('admin')` for developer routes
- Log all developer actions for audit
- Clearly document which routes are developer-only
- Test that regular users cannot access developer routes

### ❌ DON'T:
- Don't use `setTenantContext` on developer routes
- Don't allow regular users to access `/admin/*` routes
- Don't forget to check user role before bypassing isolation
- Don't hardcode companyId in developer routes

---

## Testing

### Test as Developer:
```bash
# Should see all companies
GET /api/company/admin/all
Headers: Authorization: Bearer <developer-token>
Expected: Array of all companies

# Should see all users
GET /api/admin/users
Headers: Authorization: Bearer <developer-token>
Expected: Array of all users
```

### Test as Regular User:
```bash
# Should get 403 Forbidden
GET /api/company/admin/all
Headers: Authorization: Bearer <regular-user-token>
Expected: 403 Forbidden

# Should only see their company
GET /api/company
Headers: Authorization: Bearer <regular-user-token>
Expected: Only their company data
```

---

## Summary

**For Developer Routes:**
- ❌ Don't use `setTenantContext`
- ✅ Use `authorizeRole('admin')`
- ✅ Query all companies (no companyId filter)
- ✅ Optional: Allow filtering via query param

**For Regular User Routes:**
- ✅ Always use `setTenantContext`
- ✅ Always filter by `req.companyId`
- ✅ Verify user can only access their company's data

