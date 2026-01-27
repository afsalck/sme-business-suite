# Customer Types Implementation Guide

## Current State
Currently, customer information is stored directly in the `Invoice` model:
- `customerName` (STRING)
- `customerEmail` (STRING)
- `customerPhone` (STRING)
- `customerTRN` (STRING)

**Limitation**: No customer relationship management, no customer types, data duplication across invoices.

---

## Implementation Options

### Option 1: Add Customer Type Field (Simple - Quick Implementation)
Add a `customerType` field directly to invoices. Good for basic categorization.

**Pros:**
- Quick to implement
- No database schema changes needed
- Minimal code changes

**Cons:**
- Still duplicates customer data
- No customer management
- Limited flexibility

**Database Changes:**
```sql
ALTER TABLE invoices ADD customerType VARCHAR(50) NULL;
-- Example values: 'B2B', 'B2C', 'VIP', 'Regular', 'Wholesale', 'Retail'
```

**Model Update:**
```javascript
// models/Invoice.js
customerType: {
  type: DataTypes.ENUM('B2B', 'B2C', 'VIP', 'Regular', 'Wholesale', 'Retail'),
  allowNull: true
}
```

---

### Option 2: Separate Customer Model (Recommended - Professional)
Create a dedicated `Customer` model with relationships. Best for proper customer management.

**Database Schema:**
```sql
-- Create customers table
CREATE TABLE customers (
  id INT IDENTITY(1,1) PRIMARY KEY,
  companyId INT NOT NULL DEFAULT 1, -- For multi-tenancy
  customerCode VARCHAR(50) UNIQUE, -- Auto-generated: CUST-001
  name NVARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'B2B', 'B2C', 'VIP', etc.
  email NVARCHAR(255),
  phone NVARCHAR(50),
  trn NVARCHAR(50),
  address NTEXT,
  city NVARCHAR(100),
  country NVARCHAR(100) DEFAULT 'UAE',
  creditLimit DECIMAL(10,2),
  paymentTerms VARCHAR(50) DEFAULT '30 days',
  discountPercentage DECIMAL(5,2) DEFAULT 0,
  isActive BIT DEFAULT 1,
  notes NTEXT,
  createdAt DATETIME DEFAULT GETDATE(),
  updatedAt DATETIME DEFAULT GETDATE()
);

-- Add foreign key to invoices
ALTER TABLE invoices ADD customerId INT NULL;
ALTER TABLE invoices ADD CONSTRAINT FK_Invoice_Customer 
  FOREIGN KEY (customerId) REFERENCES customers(id);

-- Create index for performance
CREATE INDEX IX_Customers_CompanyId ON customers(companyId);
CREATE INDEX IX_Customers_Type ON customers(type);
CREATE INDEX IX_Invoices_CustomerId ON invoices(customerId);
```

**Model Structure:**
```javascript
// models/Customer.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/config/database');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  customerCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('B2B', 'B2C', 'VIP', 'Regular', 'Wholesale', 'Retail'),
    allowNull: false,
    defaultValue: 'Regular'
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  trn: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING,
    defaultValue: 'UAE'
  },
  creditLimit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  paymentTerms: {
    type: DataTypes.STRING,
    defaultValue: '30 days'
  },
  discountPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'customers',
  timestamps: true
});

// Relationship
Customer.hasMany(Invoice, { foreignKey: 'customerId', as: 'invoices' });
Invoice.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

module.exports = Customer;
```

**Update Invoice Model:**
```javascript
// models/Invoice.js - Add relationship
customerId: {
  type: DataTypes.INTEGER,
  allowNull: true,
  references: {
    model: 'customers',
    key: 'id'
  }
}
// Keep existing customerName, customerEmail, customerPhone for backward compatibility
```

---

### Option 3: Multi-Tenancy (If Different Companies)
If you mean different companies/organizations using the same system:

**Database Schema:**
```sql
-- Companies table (already exists)
-- Each company has its own data isolation

-- Add companyId to all relevant tables
ALTER TABLE invoices ADD companyId INT NOT NULL DEFAULT 1;
ALTER TABLE customers ADD companyId INT NOT NULL DEFAULT 1;
ALTER TABLE expenses ADD companyId INT NOT NULL DEFAULT 1;
-- etc.

-- Create indexes
CREATE INDEX IX_Invoices_CompanyId ON invoices(companyId);
CREATE INDEX IX_Customers_CompanyId ON customers(companyId);
```

**Data Isolation:**
- All queries filter by `companyId`
- Each company sees only their data
- Shared infrastructure, isolated data

---

## Recommended Implementation: Option 2 (Customer Model)

### Step 1: Create Customer Model
```javascript
// models/Customer.js
// (See full code above)
```

### Step 2: Create Customer Routes
```javascript
// routes/customerRoutes.js
const express = require('express');
const Customer = require('../models/Customer');
const { authorizeRole } = require('../server/middleware/authMiddleware');

const router = express.Router();

// GET /api/customers - List all customers
router.get('/', authorizeRole(['admin', 'staff']), async (req, res) => {
  try {
    const { type, search, page = 1, limit = 50 } = req.query;
    const where = { companyId: 1, isActive: true };
    
    if (type) where.type = type;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { customerCode: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const customers = await Customer.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['name', 'ASC']]
    });
    
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/customers - Create customer
router.post('/', authorizeRole('admin'), async (req, res) => {
  try {
    // Generate customer code
    const lastCustomer = await Customer.findOne({
      where: { companyId: 1 },
      order: [['id', 'DESC']]
    });
    const nextNumber = lastCustomer ? parseInt(lastCustomer.customerCode.split('-')[1]) + 1 : 1;
    const customerCode = `CUST-${String(nextNumber).padStart(4, '0')}`;
    
    const customer = await Customer.create({
      ...req.body,
      companyId: 1,
      customerCode
    });
    
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/customers/:id - Update customer
router.put('/:id', authorizeRole('admin'), async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    
    await customer.update(req.body);
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
```

### Step 3: Update Invoice Creation
```javascript
// routes/invoiceRoutes.js
// When creating invoice:
if (req.body.customerId) {
  // Use existing customer
  const customer = await Customer.findByPk(req.body.customerId);
  invoiceData.customerName = customer.name;
  invoiceData.customerEmail = customer.email;
  invoiceData.customerPhone = customer.phone;
  invoiceData.customerTRN = customer.trn;
  invoiceData.customerId = customer.id;
} else {
  // New customer or manual entry (backward compatible)
  invoiceData.customerName = req.body.customerName;
  invoiceData.customerEmail = req.body.customerEmail;
  invoiceData.customerPhone = req.body.customerPhone;
}
```

### Step 4: Customer Management UI
```javascript
// client/src/pages/CustomersPage.js
// - List customers with type filter
// - Create/Edit customer form
// - Customer type dropdown
// - Search functionality
```

---

## Data Flow Examples

### Scenario 1: B2B Customer
```
1. Create Customer:
   - Name: "ABC Trading LLC"
   - Type: "B2B"
   - TRN: "TRN123456789"
   - Credit Limit: 50,000 AED
   - Payment Terms: "60 days"

2. Create Invoice:
   - Select customer from dropdown
   - Customer details auto-filled
   - Apply B2B pricing/discounts
   - Extended payment terms
```

### Scenario 2: B2C Customer
```
1. Create Customer:
   - Name: "John Smith"
   - Type: "B2C"
   - Email: "john@email.com"
   - Payment Terms: "Immediate"

2. Create Invoice:
   - Select customer
   - Standard pricing
   - Immediate payment required
```

### Scenario 3: VIP Customer
```
1. Create Customer:
   - Name: "Premium Client"
   - Type: "VIP"
   - Discount: 15%
   - Special pricing rules

2. Create Invoice:
   - Auto-apply VIP discount
   - Priority handling
```

---

## Benefits of Customer Model Approach

1. **Data Consistency**: Single source of truth for customer info
2. **Customer Management**: Centralized customer database
3. **Type-Based Logic**: Different rules per customer type
4. **Reporting**: Customer analytics and insights
5. **Relationships**: Link invoices, payments, contracts to customers
6. **Scalability**: Easy to add more customer attributes

---

## Migration Strategy

1. **Phase 1**: Create Customer model and table
2. **Phase 2**: Create customer management UI
3. **Phase 3**: Update invoice creation to use customers
4. **Phase 4**: Migrate existing invoice data (optional)
5. **Phase 5**: Deprecate direct customer fields in invoices (keep for backward compatibility)

---

## Multi-Tenancy Considerations

If implementing for multiple companies:

```javascript
// Middleware to set companyId
const setCompanyContext = (req, res, next) => {
  // Get companyId from user session/token
  req.companyId = req.user?.companyId || 1;
  next();
};

// All queries filter by companyId
const invoices = await Invoice.findAll({
  where: { companyId: req.companyId }
});
```

---

## Next Steps

1. Decide on implementation option
2. Create database migration script
3. Implement Customer model
4. Create customer management routes
5. Build customer management UI
6. Update invoice creation flow
7. Add customer type-based business logic

