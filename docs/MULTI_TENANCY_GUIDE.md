# Multi-Tenancy Guide - How to Separate Data for Multiple Customers

## 🎯 Your Question: "If I give this software to 2 customers, how will they see different data?"

**Answer:** You need to implement **Multi-Tenancy** - data isolation so each customer only sees their own data.

---

## 📊 Current State (Single Tenant)

**Right now, your system is designed for ONE company:**

```sql
-- All data is for companyId = 1
SELECT * FROM invoices WHERE companyId = 1;  -- Hardcoded
SELECT * FROM inventoryItems WHERE companyId = 1;  -- Hardcoded
```

**Problem:** If you give this to 2 customers, they'll see each other's data! ❌

---

## ✅ Solution: Multi-Tenancy Architecture

### Option 1: Database-Level Isolation (Recommended)

**Add `companyId` to ALL tables and filter by it.**

### Database Structure

```sql
-- Every table needs companyId
CREATE TABLE invoices (
    id INT PRIMARY KEY,
    companyId INT NOT NULL,  -- ← Add this to all tables
    customerName VARCHAR(255),
    total DECIMAL(10,2),
    ...
);

CREATE TABLE inventoryItems (
    id INT PRIMARY KEY,
    companyId INT NOT NULL,  -- ← Add this
    name VARCHAR(255),
    stock INT,
    ...
);

CREATE TABLE sales (
    id INT PRIMARY KEY,
    companyId INT NOT NULL,  -- ← Add this
    totalSales DECIMAL(10,2),
    ...
);

-- Companies table (already exists)
CREATE TABLE companies (
    id INT PRIMARY KEY,
    companyId INT NOT NULL UNIQUE,
    name VARCHAR(255),
    ...
);
```

### How It Works

```
┌─────────────────────────────────────────┐
│      Customer A (Company ID = 1)        │
│                                         │
│  Invoices: companyId = 1               │
│  Items: companyId = 1                   │
│  Sales: companyId = 1                   │
│                                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      Customer B (Company ID = 2)        │
│                                         │
│  Invoices: companyId = 2                │
│  Items: companyId = 2                   │
│  Sales: companyId = 2                   │
│                                         │
└─────────────────────────────────────────┘
```

**Each customer sees ONLY their companyId data!**

---

## 🔧 Implementation Steps

### Step 1: Add companyId to All Tables

```sql
-- Migration script
ALTER TABLE invoices ADD companyId INT NOT NULL DEFAULT 1;
ALTER TABLE inventoryItems ADD companyId INT NOT NULL DEFAULT 1;
ALTER TABLE sales ADD companyId INT NOT NULL DEFAULT 1;
ALTER TABLE expenses ADD companyId INT NOT NULL DEFAULT 1;
ALTER TABLE employees ADD companyId INT NOT NULL DEFAULT 1;
-- ... add to ALL tables
```

### Step 2: Update Models

```javascript
// models/Invoice.js
const Invoice = sequelize.define('Invoice', {
  // ... existing fields
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  }
});

// models/InventoryItem.js
const InventoryItem = sequelize.define('InventoryItem', {
  // ... existing fields
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  }
});

// ... update ALL models
```

### Step 3: Create Middleware to Set companyId

```javascript
// server/middleware/tenantMiddleware.js
const { verifyFirebaseToken } = require('./authMiddleware');

// Get companyId from user session/token
async function setTenantContext(req, res, next) {
  try {
    // Option 1: Get from user token/session
    if (req.user) {
      req.companyId = req.user.companyId || 1;
    }
    
    // Option 2: Get from subdomain
    // const subdomain = req.headers.host.split('.')[0];
    // req.companyId = getCompanyIdFromSubdomain(subdomain);
    
    // Option 3: Get from custom header
    // req.companyId = req.headers['x-company-id'] || 1;
    
    if (!req.companyId) {
      return res.status(401).json({ message: 'Company context required' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = { setTenantContext };
```

### Step 4: Filter All Queries by companyId

```javascript
// routes/invoiceRoutes.js
router.get('/', setTenantContext, async (req, res) => {
  try {
    // ALWAYS filter by companyId
    const invoices = await Invoice.findAll({
      where: {
        companyId: req.companyId  // ← Filter by tenant
      }
    });
    
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// routes/inventoryRoutes.js
router.get('/', setTenantContext, async (req, res) => {
  try {
    const items = await InventoryItem.findAll({
      where: {
        companyId: req.companyId  // ← Filter by tenant
      }
    });
    
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ... apply to ALL routes
```

### Step 5: Set companyId When Creating Records

```javascript
// routes/invoiceRoutes.js
router.post('/', setTenantContext, async (req, res) => {
  try {
    const invoice = await Invoice.create({
      ...req.body,
      companyId: req.companyId  // ← Always set companyId
    });
    
    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

---

## 🔐 How to Identify Which Customer

### Method 1: User-Based (Recommended)

**Each user belongs to a company:**

```javascript
// models/User.js - Add companyId
const User = sequelize.define('User', {
  // ... existing fields
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id'
    }
  }
});

// When user logs in, get their companyId
async function setTenantContext(req, res, next) {
  if (req.user) {
    const user = await User.findByPk(req.user.id);
    req.companyId = user.companyId;
  }
  next();
}
```

### Method 2: Subdomain-Based

```
customer1.bizease.com  → companyId = 1
customer2.bizease.com  → companyId = 2
```

```javascript
function setTenantContext(req, res, next) {
  const subdomain = req.headers.host.split('.')[0];
  const companyMap = {
    'customer1': 1,
    'customer2': 2
  };
  req.companyId = companyMap[subdomain] || 1;
  next();
}
```

### Method 3: Header-Based

```javascript
// Client sends company ID in header
axios.get('/api/invoices', {
  headers: {
    'X-Company-Id': '1'
  }
});

// Server reads it
function setTenantContext(req, res, next) {
  req.companyId = req.headers['x-company-id'] || 1;
  next();
}
```

---

## 📋 Complete Example

### Database Structure

```sql
-- Companies table
CREATE TABLE companies (
    id INT PRIMARY KEY,
    companyId INT UNIQUE NOT NULL,
    name VARCHAR(255),
    ...
);

-- Data for Company 1
INSERT INTO companies (companyId, name) VALUES (1, 'Customer A Company');
INSERT INTO invoices (companyId, customerName, total) VALUES (1, 'Client 1', 1000);
INSERT INTO inventoryItems (companyId, name, stock) VALUES (1, 'Product A', 50);

-- Data for Company 2
INSERT INTO companies (companyId, name) VALUES (2, 'Customer B Company');
INSERT INTO invoices (companyId, customerName, total) VALUES (2, 'Client 2', 2000);
INSERT INTO inventoryItems (companyId, name, stock) VALUES (2, 'Product B', 30);
```

### Application Flow

```
1. Customer A logs in
   ↓
2. System gets companyId = 1 from user
   ↓
3. All queries filter: WHERE companyId = 1
   ↓
4. Customer A sees ONLY their data

1. Customer B logs in
   ↓
2. System gets companyId = 2 from user
   ↓
3. All queries filter: WHERE companyId = 2
   ↓
4. Customer B sees ONLY their data
```

---

## 🛡️ Security: Prevent Data Leakage

### Critical: Always Filter by companyId

```javascript
// ❌ WRONG - No filter
const invoices = await Invoice.findAll();

// ✅ CORRECT - Always filter
const invoices = await Invoice.findAll({
  where: { companyId: req.companyId }
});
```

### Add Database Constraints

```sql
-- Add foreign key constraint
ALTER TABLE invoices 
ADD CONSTRAINT FK_Invoice_Company 
FOREIGN KEY (companyId) REFERENCES companies(companyId);

-- Add index for performance
CREATE INDEX IX_Invoices_CompanyId ON invoices(companyId);
```

### Add Application-Level Checks

```javascript
// When updating/deleting, verify companyId matches
router.put('/:id', setTenantContext, async (req, res) => {
  const invoice = await Invoice.findOne({
    where: {
      id: req.params.id,
      companyId: req.companyId  // ← Verify ownership
    }
  });
  
  if (!invoice) {
    return res.status(404).json({ message: 'Invoice not found' });
  }
  
  await invoice.update(req.body);
  res.json(invoice);
});
```

---

## 📊 Data Isolation Example

### Scenario: 2 Customers Using Same Software

**Customer A (Company ID = 1):**
```sql
-- They see:
SELECT * FROM invoices WHERE companyId = 1;
-- Result: Only Customer A's invoices

SELECT * FROM inventoryItems WHERE companyId = 1;
-- Result: Only Customer A's items
```

**Customer B (Company ID = 2):**
```sql
-- They see:
SELECT * FROM invoices WHERE companyId = 2;
-- Result: Only Customer B's invoices

SELECT * FROM inventoryItems WHERE companyId = 2;
-- Result: Only Customer B's items
```

**They NEVER see each other's data!** ✅

---

## 🚀 Implementation Checklist

### Phase 1: Database Setup
- [ ] Add `companyId` column to ALL tables
- [ ] Create indexes on `companyId` for performance
- [ ] Add foreign key constraints
- [ ] Migrate existing data (set companyId = 1)

### Phase 2: Model Updates
- [ ] Add `companyId` field to ALL models
- [ ] Update model associations
- [ ] Add default values

### Phase 3: Middleware
- [ ] Create `setTenantContext` middleware
- [ ] Get `companyId` from user/session
- [ ] Apply middleware to all routes

### Phase 4: Route Updates
- [ ] Filter ALL queries by `companyId`
- [ ] Set `companyId` when creating records
- [ ] Verify `companyId` when updating/deleting

### Phase 5: User Management
- [ ] Add `companyId` to User model
- [ ] Assign users to companies
- [ ] Update authentication to include companyId

### Phase 6: Testing
- [ ] Test data isolation
- [ ] Verify Customer A can't see Customer B's data
- [ ] Test all CRUD operations
- [ ] Performance testing with multiple tenants

---

## 💡 Alternative: Separate Databases

**Instead of one database with companyId, use separate databases:**

```
Database: CustomerA_DB
  - All tables for Customer A

Database: CustomerB_DB
  - All tables for Customer B
```

**Pros:**
- Complete isolation
- Easier backups per customer
- Better performance

**Cons:**
- More complex deployment
- Harder to maintain
- More expensive

**Recommendation:** Use `companyId` approach (Option 1) for most cases.

---

## 📝 Summary

**Your Question:** "How will 2 customers see different data?"

**Answer:**
1. Add `companyId` to ALL tables
2. Filter ALL queries by `companyId`
3. Get `companyId` from logged-in user
4. Each customer only sees their `companyId` data

**Result:**
- Customer A (companyId = 1) → Sees only their data
- Customer B (companyId = 2) → Sees only their data
- Complete data isolation ✅

---

## 🔧 Quick Start

1. **Add companyId to tables:**
```sql
ALTER TABLE invoices ADD companyId INT NOT NULL DEFAULT 1;
ALTER TABLE inventoryItems ADD companyId INT NOT NULL DEFAULT 1;
-- ... repeat for all tables
```

2. **Update models:**
```javascript
companyId: {
  type: DataTypes.INTEGER,
  allowNull: false,
  defaultValue: 1
}
```

3. **Filter queries:**
```javascript
where: { companyId: req.companyId }
```

4. **Set on create:**
```javascript
companyId: req.companyId
```

That's it! Each customer will see only their data.

