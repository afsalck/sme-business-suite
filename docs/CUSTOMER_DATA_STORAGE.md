# Customer Data Storage - Current Implementation

## 📍 Current Location: **Invoices Table**

**Customer data is NOT stored in a separate table.** It is stored directly in the `invoices` table.

### Database Table: `invoices`

**Table Name:** `invoices`  
**Database:** SQL Server (Biz)

### Customer Fields in Invoices Table

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `customerName` | STRING | ✅ Yes | Customer's name |
| `customerEmail` | STRING | ❌ No | Customer's email address |
| `customerPhone` | STRING | ❌ No | Customer's phone number |
| `customerTRN` | STRING | ❌ No | Customer's Tax Registration Number |

### Model Definition

**File:** `models/Invoice.js`

```javascript
customerName: {
  type: DataTypes.STRING,
  allowNull: false  // Required field
},
customerEmail: {
  type: DataTypes.STRING,
  allowNull: true   // Optional
},
customerPhone: {
  type: DataTypes.STRING,
  allowNull: true   // Optional
},
customerTRN: {
  type: DataTypes.STRING,
  allowNull: true   // Optional
}
```

---

## 🔍 How to Check Customer Data

### SQL Query to View Customer Data

```sql
-- View all customer data from invoices
SELECT 
    id,
    invoiceNumber,
    customerName,
    customerEmail,
    customerPhone,
    customerTRN,
    issueDate,
    total,
    status
FROM invoices
ORDER BY issueDate DESC;
```

### Find Customer by Name

```sql
-- Find all invoices for a specific customer
SELECT 
    id,
    invoiceNumber,
    customerName,
    customerEmail,
    customerPhone,
    issueDate,
    total
FROM invoices
WHERE customerName LIKE '%Customer Name%'
ORDER BY issueDate DESC;
```

### Check Specific Invoice

```sql
-- Check customer data for invoice ID 123
SELECT 
    customerName,
    customerEmail,
    customerPhone,
    customerTRN
FROM invoices
WHERE id = 123;
```

---

## ⚠️ Current Limitations

### 1. **Data Duplication**
- If the same customer has 10 invoices, their information is stored 10 times
- Example: "ABC Company" appears in multiple invoice records

### 2. **No Customer Management**
- Cannot update customer information in one place
- Must update each invoice individually if customer details change

### 3. **Inconsistent Data**
- Same customer might have different email/phone across invoices
- Example:
  - Invoice #1: email = "abc@email.com"
  - Invoice #2: email = "abc@email.com" (typo: missing 'a')

### 4. **No Customer History**
- Cannot track customer relationship over time
- Cannot see all invoices for a customer easily

### 5. **No Customer Types**
- Cannot categorize customers (B2B, B2C, VIP, etc.)
- Cannot apply different rules per customer type

---

## 📊 Data Structure Visualization

```
┌─────────────────────────────────────┐
│         invoices Table              │
├─────────────────────────────────────┤
│ id (PK)                             │
│ invoiceNumber                       │
│ customerName    ← Customer data     │
│ customerEmail   ← Customer data     │
│ customerPhone   ← Customer data     │
│ customerTRN     ← Customer data     │
│ issueDate                           │
│ total                               │
│ status                              │
│ ... (other invoice fields)          │
└─────────────────────────────────────┘

❌ NO separate customers table
❌ NO customerId foreign key
✅ Customer data embedded in each invoice
```

---

## 🔄 Example: Same Customer, Multiple Invoices

**Current Storage:**
```
Invoice #1:
  customerName: "ABC Trading LLC"
  customerEmail: "contact@abctrading.com"
  customerPhone: "+971501234567"

Invoice #2:
  customerName: "ABC Trading LLC"  ← Duplicated
  customerEmail: "contact@abctrading.com"  ← Duplicated
  customerPhone: "+971501234567"  ← Duplicated

Invoice #3:
  customerName: "ABC Trading LLC"  ← Duplicated
  customerEmail: "contact@abctrading.com"  ← Duplicated
  customerPhone: "+971501234567"  ← Duplicated
```

**Problem:** Same data stored 3 times!

---

## ✅ Recommended Solution: Separate Customer Table

### Proposed Structure

```
┌──────────────────┐         ┌──────────────────┐
│   customers      │         │    invoices      │
├──────────────────┤         ├──────────────────┤
│ id (PK)          │◄────────│ customerId (FK)  │
│ customerCode     │         │ invoiceNumber    │
│ name             │         │ total            │
│ email            │         │ status           │
│ phone            │         │ ...              │
│ trn              │         └──────────────────┘
│ type             │
│ address          │
│ ...              │
└──────────────────┘
```

**Benefits:**
- ✅ Single source of truth
- ✅ No data duplication
- ✅ Easy customer management
- ✅ Customer history tracking
- ✅ Customer types support

See `docs/CUSTOMER_TYPES_IMPLEMENTATION.md` for full implementation guide.

---

## 🛠️ Quick Commands

### View All Unique Customers

```sql
-- Get list of all unique customers
SELECT DISTINCT
    customerName,
    customerEmail,
    customerPhone,
    customerTRN,
    COUNT(*) as invoiceCount
FROM invoices
WHERE customerName IS NOT NULL AND customerName != ''
GROUP BY customerName, customerEmail, customerPhone, customerTRN
ORDER BY invoiceCount DESC;
```

### Count Total Customers

```sql
-- Count unique customers
SELECT COUNT(DISTINCT customerName) as totalCustomers
FROM invoices
WHERE customerName IS NOT NULL AND customerName != '';
```

### Find Customers with Most Invoices

```sql
-- Top 10 customers by invoice count
SELECT TOP 10
    customerName,
    customerEmail,
    COUNT(*) as invoiceCount,
    SUM(total) as totalRevenue,
    MIN(issueDate) as firstInvoice,
    MAX(issueDate) as lastInvoice
FROM invoices
WHERE customerName IS NOT NULL AND customerName != ''
GROUP BY customerName, customerEmail
ORDER BY invoiceCount DESC;
```

---

## 📝 Summary

**Current State:**
- ✅ Customer data stored in `invoices` table
- ✅ Fields: `customerName`, `customerEmail`, `customerPhone`, `customerTRN`
- ❌ No separate customer table
- ❌ Data duplication across invoices
- ❌ No customer management system

**To Check Customer Data:**
1. Query the `invoices` table
2. Use `customerName`, `customerEmail`, `customerPhone`, `customerTRN` fields
3. Each invoice has its own copy of customer information

**To Improve:**
- Create separate `customers` table
- Link invoices to customers via `customerId` foreign key
- Implement customer management system

