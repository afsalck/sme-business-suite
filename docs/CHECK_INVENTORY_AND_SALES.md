# How to Check Specific Inventory Items and Sales

## 📦 Checking Inventory Items

### 1. Find Inventory Item by ID

```sql
-- Check specific inventory item by ID
SELECT 
    id,
    name,
    sku,
    category,
    stock,
    purchasePrice,
    salePrice,
    unit,
    description,
    createdAt,
    updatedAt
FROM inventoryItems
WHERE id = 123;  -- Replace 123 with actual item ID
```

### 2. Find Inventory Item by Name

```sql
-- Search inventory items by name
SELECT 
    id,
    name,
    sku,
    category,
    stock,
    purchasePrice,
    salePrice,
    unit
FROM inventoryItems
WHERE name LIKE '%Item Name%'  -- Replace with actual item name
ORDER BY name;
```

### 3. Find Inventory Item by SKU

```sql
-- Find item by SKU code
SELECT 
    id,
    name,
    sku,
    category,
    stock,
    purchasePrice,
    salePrice
FROM inventoryItems
WHERE sku = 'SKU-12345';  -- Replace with actual SKU
```

### 4. Check Low Stock Items

```sql
-- Find items with low stock (less than 10 units)
SELECT 
    id,
    name,
    sku,
    stock,
    salePrice,
    category
FROM inventoryItems
WHERE stock < 10
ORDER BY stock ASC;
```

### 5. Check All Inventory Items

```sql
-- View all inventory items
SELECT 
    id,
    name,
    sku,
    category,
    stock,
    purchasePrice,
    salePrice,
    unit,
    createdAt
FROM inventoryItems
ORDER BY name;
```

### 6. Check Inventory Item Sales History

```sql
-- See which sales include a specific inventory item
-- Note: Sales store items as JSON, so we need to parse it
SELECT 
    s.id as saleId,
    s.date,
    s.totalSales,
    s.totalVAT,
    s.grandTotal,
    s.items  -- This is JSON, contains item details
FROM sales s
WHERE s.items LIKE '%"itemId":123%'  -- Replace 123 with item ID
   OR s.items LIKE '%"name":"Item Name"%'  -- Or search by name
ORDER BY s.date DESC;
```

### 7. Check Inventory Item in Specific Sale

```sql
-- Check if item is in a specific sale
SELECT 
    id,
    date,
    items,  -- JSON format
    totalSales,
    grandTotal
FROM sales
WHERE id = 456;  -- Replace 456 with sale ID
-- Then parse the 'items' JSON field to see item details
```

---

## 🧾 Checking Sales

### 1. Find Sale by ID

```sql
-- Check specific sale by ID
SELECT 
    id,
    date,
    summary,
    items,  -- JSON format - contains item details
    totalSales,
    totalVAT,
    grandTotal,
    createdAt
FROM sales
WHERE id = 456;  -- Replace 456 with actual sale ID
```

### 2. Find Sales by Date Range

```sql
-- Find sales between two dates
SELECT 
    id,
    date,
    totalSales,
    totalVAT,
    grandTotal,
    items
FROM sales
WHERE date >= '2025-01-01' 
  AND date <= '2025-12-31'
ORDER BY date DESC;
```

### 3. Find Sales Today

```sql
-- Find all sales from today
SELECT 
    id,
    date,
    totalSales,
    totalVAT,
    grandTotal
FROM sales
WHERE CAST(date AS DATE) = CAST(GETDATE() AS DATE)
ORDER BY date DESC;
```

### 4. Find Sales This Month

```sql
-- Find all sales from current month
SELECT 
    id,
    date,
    totalSales,
    totalVAT,
    grandTotal
FROM sales
WHERE YEAR(date) = YEAR(GETDATE())
  AND MONTH(date) = MONTH(GETDATE())
ORDER BY date DESC;
```

### 5. Find Sales with Specific Item

```sql
-- Find sales that contain a specific item
-- Method 1: Search by item name in JSON
SELECT 
    id,
    date,
    items,
    totalSales,
    grandTotal
FROM sales
WHERE items LIKE '%"name":"Item Name"%'  -- Replace with item name
   OR items LIKE '%"itemId":123%'  -- Or search by item ID
ORDER BY date DESC;
```

### 6. Check Sales Items Details (Parse JSON)

```sql
-- For SQL Server 2016+, you can parse JSON
SELECT 
    id,
    date,
    totalSales,
    grandTotal,
    JSON_VALUE(items, '$[0].name') as firstItemName,
    JSON_VALUE(items, '$[0].quantity') as firstItemQuantity,
    JSON_VALUE(items, '$[0].unitPrice') as firstItemPrice
FROM sales
WHERE id = 456;
```

### 7. Find Top Selling Items

```sql
-- This requires parsing JSON, so it's complex
-- Better to use application-level query
-- But here's a basic approach:

-- Get all sales and their items
SELECT 
    s.id as saleId,
    s.date,
    s.items  -- Parse this JSON in application
FROM sales s
ORDER BY s.date DESC;
```

### 8. Check Sales Summary

```sql
-- Get sales summary statistics
SELECT 
    COUNT(*) as totalSales,
    SUM(totalSales) as totalRevenue,
    SUM(totalVAT) as totalVAT,
    SUM(grandTotal) as totalWithVAT,
    AVG(grandTotal) as averageSale,
    MIN(date) as firstSale,
    MAX(date) as lastSale
FROM sales;
```

---

## 🔍 Advanced Queries

### 1. Check Inventory Item Stock History

```sql
-- See all sales of a specific item (to track stock movement)
-- Note: This requires parsing JSON from sales.items
SELECT 
    s.id as saleId,
    s.date,
    s.items,  -- Contains item details
    s.totalSales
FROM sales s
WHERE s.items LIKE '%"itemId":123%'  -- Replace 123 with item ID
ORDER BY s.date DESC;
```

### 2. Find Items Never Sold

```sql
-- Find inventory items that have never been sold
-- This is complex because items are stored as JSON in sales
-- Better approach: Use application-level logic

-- Basic check: Items with no sales (approximate)
SELECT 
    i.id,
    i.name,
    i.sku,
    i.stock,
    i.salePrice
FROM inventoryItems i
WHERE i.stock > 0
  AND NOT EXISTS (
    SELECT 1 
    FROM sales s 
    WHERE s.items LIKE '%"itemId":' + CAST(i.id AS VARCHAR) + '%'
  )
ORDER BY i.name;
```

### 3. Check Item in Multiple Sales

```sql
-- Count how many times an item appears in sales
SELECT 
    COUNT(*) as saleCount,
    SUM(CAST(JSON_VALUE(s.items, '$[0].quantity') AS INT)) as totalQuantitySold
FROM sales s
WHERE s.items LIKE '%"itemId":123%'  -- Replace 123 with item ID
GROUP BY s.id;
```

---

## 📊 Quick Reference Queries

### Inventory Items

```sql
-- Quick inventory check
SELECT 
    COUNT(*) as totalItems,
    SUM(stock) as totalStock,
    SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as outOfStock,
    SUM(CASE WHEN stock < 10 THEN 1 ELSE 0 END) as lowStock
FROM inventoryItems;
```

### Sales

```sql
-- Quick sales check
SELECT 
    COUNT(*) as totalSales,
    SUM(grandTotal) as totalRevenue,
    AVG(grandTotal) as averageSale,
    MAX(date) as lastSaleDate
FROM sales;
```

---

## 🛠️ Using Node.js/Application Level

### Check Inventory Item

```javascript
// In your routes or services
const InventoryItem = require('../models/InventoryItem');

// Find by ID
const item = await InventoryItem.findByPk(123);

// Find by name
const items = await InventoryItem.findAll({
  where: {
    name: { [Op.like]: '%Item Name%' }
  }
});

// Find by SKU
const item = await InventoryItem.findOne({
  where: { sku: 'SKU-12345' }
});
```

### Check Sales

```javascript
// In your routes or services
const Sale = require('../models/Sale');

// Find by ID
const sale = await Sale.findByPk(456);
console.log('Sale items:', sale.items); // Already parsed JSON

// Find sales with specific item
const sales = await Sale.findAll({
  where: {
    items: {
      [Op.like]: '%"itemId":123%'
    }
  }
});

// Parse items to find specific item
const sales = await Sale.findAll();
const salesWithItem = sales.filter(sale => {
  const items = sale.items; // Already parsed
  return items.some(item => item.itemId === 123);
});
```

---

## 📝 Common Use Cases

### Use Case 1: "Where is item SKU-12345?"

```sql
-- Step 1: Find the item
SELECT id, name, stock 
FROM inventoryItems 
WHERE sku = 'SKU-12345';

-- Step 2: Check if it's in any sales
SELECT id, date, items 
FROM sales 
WHERE items LIKE '%"sku":"SKU-12345"%';
```

### Use Case 2: "What items were sold in sale #456?"

```sql
-- Get sale details
SELECT id, date, items, grandTotal 
FROM sales 
WHERE id = 456;

-- The 'items' field contains JSON with all item details
-- Parse it in your application or use JSON functions
```

### Use Case 3: "How many units of item #123 were sold?"

```sql
-- This requires parsing JSON from sales.items
-- Better to do in application:

-- 1. Get all sales
SELECT id, items FROM sales;

-- 2. In application, parse JSON and sum quantities
-- JavaScript example:
const sales = await Sale.findAll();
let totalSold = 0;
sales.forEach(sale => {
  sale.items.forEach(item => {
    if (item.itemId === 123) {
      totalSold += item.quantity;
    }
  });
});
```

### Use Case 4: "Check if item exists and its stock"

```sql
-- Quick check
SELECT 
    id,
    name,
    sku,
    stock,
    salePrice,
    CASE 
        WHEN stock = 0 THEN 'Out of Stock'
        WHEN stock < 10 THEN 'Low Stock'
        ELSE 'In Stock'
    END as stockStatus
FROM inventoryItems
WHERE id = 123
   OR sku = 'SKU-12345'
   OR name LIKE '%Item Name%';
```

---

## 🚨 Troubleshooting

### Problem: "Item not found"

```sql
-- Check if item exists
SELECT * FROM inventoryItems WHERE id = 123;

-- Check if item was deleted (if soft delete)
SELECT * FROM inventoryItems WHERE id = 123 AND deletedAt IS NULL;
```

### Problem: "Sale not found"

```sql
-- Check if sale exists
SELECT * FROM sales WHERE id = 456;

-- Check recent sales
SELECT TOP 10 * FROM sales ORDER BY date DESC;
```

### Problem: "Item in sale but can't see details"

```sql
-- Sales store items as JSON, need to parse
SELECT 
    id,
    date,
    items  -- This is JSON string
FROM sales
WHERE id = 456;

-- In application, parse: JSON.parse(sale.items)
```

---

## 📋 Summary

**Inventory Items:**
- Table: `inventoryItems`
- Key fields: `id`, `name`, `sku`, `stock`, `purchasePrice`, `salePrice`
- Find by: ID, name, or SKU

**Sales:**
- Table: `sales`
- Key fields: `id`, `date`, `items` (JSON), `totalSales`, `grandTotal`
- Items stored as JSON in `items` field
- Find by: ID or date range

**Important Notes:**
- Sales items are stored as JSON, so parsing may be needed
- Use application-level queries for complex item searches
- Always check both inventoryItems and sales tables

