# Route Handler Updates for companyId Filtering

## What This Means

**"Update your route handlers to filter by companyId for data isolation"** means:

When users from different companies use your application, they should **ONLY** see data from their own company. This is called **multi-tenancy** or **data isolation**.

### Example Problem:
- Company A (companyId = 1) creates an invoice
- Company B (companyId = 2) should NOT see Company A's invoice
- Without filtering, Company B could see all invoices from all companies! ❌

### Solution:
Add `companyId` filtering to all database queries so each company only sees their own data.

---

## How It Works

### 1. Middleware Sets companyId
The `setTenantContext` middleware automatically sets `req.companyId` from the logged-in user:

```javascript
// server/middleware/tenantMiddleware.js
// This runs BEFORE your route handler
// Sets req.companyId based on the user's company
```

### 2. Use setTenantContext in Routes
Add the middleware to your routes:

```javascript
const { setTenantContext } = require('../server/middleware/tenantMiddleware');

// ✅ CORRECT - Uses middleware
router.get('/', setTenantContext, async (req, res) => {
  const items = await InventoryItem.findAll({
    where: {
      companyId: req.companyId  // ✅ Filter by company
    }
  });
  res.json(items);
});

// ❌ WRONG - No filtering
router.get('/', async (req, res) => {
  const items = await InventoryItem.findAll();  // ❌ Gets ALL items from ALL companies!
  res.json(items);
});
```

---

## Examples of What Needs Updating

### ✅ Already Correct (Good Examples)

**employeeRoutes.js:**
```javascript
router.get("/", setTenantContext, async (req, res) => {
  const employees = await Employee.findAll({
    where: {
      companyId: req.companyId  // ✅ Filters by company
    }
  });
  res.json(employees);
});
```

**inventoryRoutes.js:**
```javascript
router.get("/", setTenantContext, async (req, res) => {
  const items = await InventoryItem.findAll({
    where: {
      companyId: req.companyId  // ✅ Filters by company
    }
  });
  res.json(items);
});
```

### ❌ Needs Update (Examples)

**notificationRoutes.js (CURRENT - Missing companyId):**
```javascript
// ❌ WRONG - No companyId filtering
router.get('/', async (req, res) => {
  const notifications = await Notification.findAll({
    where: { userId: req.user.uid }  // ❌ Missing companyId!
  });
  res.json(notifications);
});
```

**notificationRoutes.js (SHOULD BE):**
```javascript
// ✅ CORRECT - With companyId filtering
router.get('/', setTenantContext, async (req, res) => {
  const notifications = await Notification.findAll({
    where: {
      userId: req.user.uid,
      companyId: req.companyId  // ✅ Added companyId filter
    }
  });
  res.json(notifications);
});
```

---

## Pattern to Follow

### For GET (Read) Operations:
```javascript
router.get('/', setTenantContext, async (req, res) => {
  const items = await Model.findAll({
    where: {
      companyId: req.companyId,  // ✅ Always add this
      // ... other filters
    }
  });
  res.json(items);
});
```

### For POST (Create) Operations:
```javascript
router.post('/', setTenantContext, async (req, res) => {
  const item = await Model.create({
    ...req.body,
    companyId: req.companyId,  // ✅ Always set this
  });
  res.json(item);
});
```

### For PUT (Update) Operations:
```javascript
router.put('/:id', setTenantContext, async (req, res) => {
  const item = await Model.findOne({
    where: {
      id: req.params.id,
      companyId: req.companyId  // ✅ Verify it belongs to company
    }
  });
  
  if (!item) {
    return res.status(404).json({ message: 'Not found' });
  }
  
  await item.update(req.body);
  res.json(item);
});
```

### For DELETE Operations:
```javascript
router.delete('/:id', setTenantContext, async (req, res) => {
  const item = await Model.findOne({
    where: {
      id: req.params.id,
      companyId: req.companyId  // ✅ Verify it belongs to company
    }
  });
  
  if (!item) {
    return res.status(404).json({ message: 'Not found' });
  }
  
  await item.destroy();
  res.json({ message: 'Deleted' });
});
```

---

## Checklist: Routes to Update

Check each route file and ensure:

- [ ] Route uses `setTenantContext` middleware
- [ ] GET queries include `companyId: req.companyId` in `where` clause
- [ ] POST creates include `companyId: req.companyId`
- [ ] PUT/DELETE verify `companyId: req.companyId` before updating/deleting
- [ ] All Sequelize queries filter by companyId

---

## Why This Matters

**Security:** Without companyId filtering, users from one company can:
- See other companies' data
- Modify other companies' data
- Delete other companies' data

**Compliance:** Many regulations require data isolation between companies.

**Performance:** Filtering by companyId allows database indexes to work efficiently.

---

## Testing

After updating routes, test:
1. Login as user from Company A
2. Create some data
3. Login as user from Company B
4. Verify Company B cannot see Company A's data

