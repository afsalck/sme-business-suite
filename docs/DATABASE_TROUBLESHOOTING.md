# Database Troubleshooting Guide

## Quick Data Validation Queries

### 1. Check for Missing Customer Data in Invoices

```sql
-- Find invoices with missing customer information
SELECT 
    id,
    invoiceNumber,
    customerName,
    customerEmail,
    customerPhone,
    customerTRN,
    issueDate,
    status,
    CASE 
        WHEN customerName IS NULL OR customerName = '' THEN 'Missing Name'
        WHEN customerEmail IS NULL OR customerEmail = '' THEN 'Missing Email'
        WHEN customerPhone IS NULL OR customerPhone = '' THEN 'Missing Phone'
        ELSE 'OK'
    END AS dataIssue
FROM invoices
WHERE 
    customerName IS NULL OR customerName = ''
    OR customerEmail IS NULL OR customerEmail = ''
    OR customerPhone IS NULL OR customerPhone = ''
ORDER BY issueDate DESC;
```

### 2. Check for Duplicate Customer Names

```sql
-- Find potential duplicate customers (same name/email)
SELECT 
    customerName,
    customerEmail,
    COUNT(*) as invoiceCount,
    STRING_AGG(CAST(id AS VARCHAR), ', ') as invoiceIds,
    MIN(issueDate) as firstInvoice,
    MAX(issueDate) as lastInvoice
FROM invoices
WHERE customerName IS NOT NULL
GROUP BY customerName, customerEmail
HAVING COUNT(*) > 1
ORDER BY invoiceCount DESC;
```

### 3. Check for Invalid Email Addresses

```sql
-- Find invoices with invalid email format
SELECT 
    id,
    invoiceNumber,
    customerName,
    customerEmail,
    issueDate
FROM invoices
WHERE 
    customerEmail IS NOT NULL 
    AND customerEmail != ''
    AND (
        customerEmail NOT LIKE '%@%.%'
        OR customerEmail LIKE '@%'
        OR customerEmail LIKE '%@'
        OR LEN(customerEmail) < 5
    )
ORDER BY issueDate DESC;
```

### 4. Check for Missing TRN in B2B Invoices

```sql
-- Find invoices that should have TRN but don't
-- (Assuming B2B customers should have TRN)
SELECT 
    id,
    invoiceNumber,
    customerName,
    customerEmail,
    customerTRN,
    issueDate,
    total
FROM invoices
WHERE 
    (customerTRN IS NULL OR customerTRN = '')
    AND total > 1000  -- Assuming large invoices are B2B
ORDER BY total DESC;
```

### 5. Check for Orphaned Data (If Using Customer Model)

```sql
-- Find invoices with invalid customerId
SELECT 
    i.id,
    i.invoiceNumber,
    i.customerId,
    i.customerName,
    i.issueDate
FROM invoices i
LEFT JOIN customers c ON i.customerId = c.id
WHERE i.customerId IS NOT NULL 
    AND c.id IS NULL;
```

### 6. Check for Data Inconsistencies

```sql
-- Compare customerId data with direct customer fields
SELECT 
    i.id,
    i.invoiceNumber,
    i.customerId,
    i.customerName as invoiceCustomerName,
    c.name as customerTableName,
    i.customerEmail as invoiceEmail,
    c.email as customerTableEmail,
    CASE 
        WHEN i.customerName != c.name THEN 'Name Mismatch'
        WHEN i.customerEmail != c.email THEN 'Email Mismatch'
        ELSE 'OK'
    END AS inconsistency
FROM invoices i
INNER JOIN customers c ON i.customerId = c.id
WHERE 
    i.customerName != c.name 
    OR i.customerEmail != c.email;
```

---

## Complete Data Health Check Script

```sql
-- ============================================
-- COMPREHENSIVE DATA HEALTH CHECK
-- ============================================

-- 1. Summary Statistics
SELECT 
    'Total Invoices' as metric,
    COUNT(*) as value
FROM invoices
UNION ALL
SELECT 
    'Invoices with Missing Name',
    COUNT(*)
FROM invoices
WHERE customerName IS NULL OR customerName = ''
UNION ALL
SELECT 
    'Invoices with Missing Email',
    COUNT(*)
FROM invoices
WHERE customerEmail IS NULL OR customerEmail = ''
UNION ALL
SELECT 
    'Invoices with Missing Phone',
    COUNT(*)
FROM invoices
WHERE customerPhone IS NULL OR customerPhone = ''
UNION ALL
SELECT 
    'Invoices with Missing TRN',
    COUNT(*)
FROM invoices
WHERE customerTRN IS NULL OR customerTRN = ''
UNION ALL
SELECT 
    'Invoices with Invalid Email Format',
    COUNT(*)
FROM invoices
WHERE customerEmail IS NOT NULL 
    AND customerEmail != ''
    AND customerEmail NOT LIKE '%@%.%';

-- 2. Recent Invoices with Issues
SELECT TOP 50
    id,
    invoiceNumber,
    customerName,
    customerEmail,
    customerPhone,
    customerTRN,
    issueDate,
    status,
    total,
    CASE 
        WHEN customerName IS NULL OR customerName = '' THEN '❌'
        ELSE '✅'
    END AS hasName,
    CASE 
        WHEN customerEmail IS NULL OR customerEmail = '' THEN '❌'
        WHEN customerEmail NOT LIKE '%@%.%' THEN '⚠️'
        ELSE '✅'
    END AS hasValidEmail,
    CASE 
        WHEN customerPhone IS NULL OR customerPhone = '' THEN '❌'
        ELSE '✅'
    END AS hasPhone,
    CASE 
        WHEN customerTRN IS NULL OR customerTRN = '' THEN '❌'
        ELSE '✅'
    END AS hasTRN
FROM invoices
ORDER BY issueDate DESC;

-- 3. Customer Data Completeness Report
SELECT 
    customerName,
    COUNT(*) as invoiceCount,
    SUM(CASE WHEN customerEmail IS NOT NULL AND customerEmail != '' THEN 1 ELSE 0 END) as hasEmailCount,
    SUM(CASE WHEN customerPhone IS NOT NULL AND customerPhone != '' THEN 1 ELSE 0 END) as hasPhoneCount,
    SUM(CASE WHEN customerTRN IS NOT NULL AND customerTRN != '' THEN 1 ELSE 0 END) as hasTRNCount,
    CAST(SUM(CASE WHEN customerEmail IS NOT NULL AND customerEmail != '' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS DECIMAL(5,2)) as emailCompleteness,
    CAST(SUM(CASE WHEN customerPhone IS NOT NULL AND customerPhone != '' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS DECIMAL(5,2)) as phoneCompleteness
FROM invoices
WHERE customerName IS NOT NULL AND customerName != ''
GROUP BY customerName
HAVING COUNT(*) > 1
ORDER BY invoiceCount DESC;
```

---

## Node.js Data Validation Script

Create a script to run data checks programmatically:

```javascript
// scripts/validateCustomerData.js
const { sequelize } = require('../server/config/database');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');

async function validateCustomerData() {
  console.log('🔍 Starting Customer Data Validation...\n');

  try {
    // 1. Check for missing customer data
    const missingData = await sequelize.query(`
      SELECT 
        id,
        invoiceNumber,
        customerName,
        customerEmail,
        customerPhone,
        issueDate,
        CASE 
          WHEN customerName IS NULL OR customerName = '' THEN 'Missing Name'
          WHEN customerEmail IS NULL OR customerEmail = '' THEN 'Missing Email'
          WHEN customerPhone IS NULL OR customerPhone = '' THEN 'Missing Phone'
          ELSE 'OK'
        END AS issue
      FROM invoices
      WHERE 
        customerName IS NULL OR customerName = ''
        OR customerEmail IS NULL OR customerEmail = ''
        OR customerPhone IS NULL OR customerPhone = ''
      ORDER BY issueDate DESC
    `, { type: sequelize.QueryTypes.SELECT });

    if (missingData.length > 0) {
      console.log('❌ Found invoices with missing customer data:');
      console.table(missingData);
    } else {
      console.log('✅ No missing customer data found');
    }

    // 2. Check for duplicate customers
    const duplicates = await sequelize.query(`
      SELECT 
        customerName,
        customerEmail,
        COUNT(*) as invoiceCount,
        STRING_AGG(CAST(id AS VARCHAR), ', ') as invoiceIds
      FROM invoices
      WHERE customerName IS NOT NULL
      GROUP BY customerName, customerEmail
      HAVING COUNT(*) > 1
      ORDER BY invoiceCount DESC
    `, { type: sequelize.QueryTypes.SELECT });

    if (duplicates.length > 0) {
      console.log('\n⚠️  Found potential duplicate customers:');
      console.table(duplicates);
    } else {
      console.log('\n✅ No duplicate customers found');
    }

    // 3. Check for invalid emails
    const invalidEmails = await sequelize.query(`
      SELECT 
        id,
        invoiceNumber,
        customerName,
        customerEmail
      FROM invoices
      WHERE 
        customerEmail IS NOT NULL 
        AND customerEmail != ''
        AND customerEmail NOT LIKE '%@%.%'
    `, { type: sequelize.QueryTypes.SELECT });

    if (invalidEmails.length > 0) {
      console.log('\n❌ Found invoices with invalid email format:');
      console.table(invalidEmails);
    } else {
      console.log('\n✅ All emails are valid');
    }

    // 4. Summary statistics
    const stats = await sequelize.query(`
      SELECT 
        COUNT(*) as totalInvoices,
        SUM(CASE WHEN customerName IS NULL OR customerName = '' THEN 1 ELSE 0 END) as missingName,
        SUM(CASE WHEN customerEmail IS NULL OR customerEmail = '' THEN 1 ELSE 0 END) as missingEmail,
        SUM(CASE WHEN customerPhone IS NULL OR customerPhone = '' THEN 1 ELSE 0 END) as missingPhone
      FROM invoices
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('\n📊 Data Completeness Summary:');
    console.table(stats);

  } catch (error) {
    console.error('❌ Error validating data:', error);
  } finally {
    await sequelize.close();
  }
}

// Run validation
validateCustomerData();
```

---

## API Endpoint for Data Health Check

```javascript
// routes/diagnosticsRoutes.js
const express = require('express');
const { sequelize } = require('../server/config/database');
const { authorizeRole } = require('../server/middleware/authMiddleware');

const router = express.Router();

// GET /api/diagnostics/customer-data-health
router.get('/customer-data-health', authorizeRole('admin'), async (req, res) => {
  try {
    const results = {
      summary: {},
      missingData: [],
      duplicates: [],
      invalidEmails: [],
      statistics: {}
    };

    // Summary statistics
    const stats = await sequelize.query(`
      SELECT 
        COUNT(*) as totalInvoices,
        SUM(CASE WHEN customerName IS NULL OR customerName = '' THEN 1 ELSE 0 END) as missingName,
        SUM(CASE WHEN customerEmail IS NULL OR customerEmail = '' THEN 1 ELSE 0 END) as missingEmail,
        SUM(CASE WHEN customerPhone IS NULL OR customerPhone = '' THEN 1 ELSE 0 END) as missingPhone,
        SUM(CASE WHEN customerTRN IS NULL OR customerTRN = '' THEN 1 ELSE 0 END) as missingTRN
      FROM invoices
    `, { type: sequelize.QueryTypes.SELECT });

    results.statistics = stats[0];

    // Missing data
    results.missingData = await sequelize.query(`
      SELECT TOP 100
        id,
        invoiceNumber,
        customerName,
        customerEmail,
        customerPhone,
        issueDate,
        status
      FROM invoices
      WHERE 
        customerName IS NULL OR customerName = ''
        OR customerEmail IS NULL OR customerEmail = ''
        OR customerPhone IS NULL OR customerPhone = ''
      ORDER BY issueDate DESC
    `, { type: sequelize.QueryTypes.SELECT });

    // Duplicates
    results.duplicates = await sequelize.query(`
      SELECT 
        customerName,
        customerEmail,
        COUNT(*) as invoiceCount
      FROM invoices
      WHERE customerName IS NOT NULL
      GROUP BY customerName, customerEmail
      HAVING COUNT(*) > 1
      ORDER BY invoiceCount DESC
    `, { type: sequelize.QueryTypes.SELECT });

    // Invalid emails
    results.invalidEmails = await sequelize.query(`
      SELECT 
        id,
        invoiceNumber,
        customerName,
        customerEmail
      FROM invoices
      WHERE 
        customerEmail IS NOT NULL 
        AND customerEmail != ''
        AND customerEmail NOT LIKE '%@%.%'
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
```

---

## Common Issues and Solutions

### Issue 1: Missing Customer Name
```sql
-- Find and fix
SELECT id, invoiceNumber, issueDate 
FROM invoices 
WHERE customerName IS NULL OR customerName = '';

-- Update if you have backup data
-- UPDATE invoices SET customerName = 'Unknown Customer' 
-- WHERE customerName IS NULL OR customerName = '';
```

### Issue 2: Inconsistent Customer Data
```sql
-- Find invoices for same customer with different data
SELECT 
    customerName,
    COUNT(DISTINCT customerEmail) as emailVariations,
    COUNT(DISTINCT customerPhone) as phoneVariations,
    COUNT(*) as invoiceCount
FROM invoices
WHERE customerName IS NOT NULL
GROUP BY customerName
HAVING COUNT(DISTINCT customerEmail) > 1 
    OR COUNT(DISTINCT customerPhone) > 1;
```

### Issue 3: Orphaned Records (if using Customer model)
```sql
-- Find invoices with invalid customerId
SELECT i.* 
FROM invoices i
LEFT JOIN customers c ON i.customerId = c.id
WHERE i.customerId IS NOT NULL AND c.id IS NULL;

-- Fix: Set customerId to NULL or create missing customer
```

---

## Quick Check Commands

### Using SQL Server Management Studio (SSMS)
1. Connect to your database
2. Open "New Query"
3. Paste any of the SQL queries above
4. Execute (F5)

### Using Command Line
```bash
# Using sqlcmd (Windows)
sqlcmd -S localhost -d Biz -E -Q "SELECT COUNT(*) FROM invoices WHERE customerName IS NULL"

# Using Node.js script
node scripts/validateCustomerData.js
```

### Using API
```bash
# Get data health report
curl -X GET http://localhost:5004/api/diagnostics/customer-data-health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Best Practices

1. **Regular Checks**: Run validation queries weekly
2. **Data Entry Validation**: Validate at form level before saving
3. **Backup Before Fixes**: Always backup before bulk updates
4. **Log Issues**: Track data quality metrics over time
5. **Automated Alerts**: Set up alerts for critical data issues

---

## Emergency Data Fix Script

```sql
-- ⚠️ USE WITH CAUTION - BACKUP FIRST!
-- Fix common data issues

-- 1. Set default customer name for missing values
UPDATE invoices 
SET customerName = 'Unknown Customer'
WHERE customerName IS NULL OR customerName = '';

-- 2. Clean up email addresses (remove spaces)
UPDATE invoices 
SET customerEmail = LTRIM(RTRIM(customerEmail))
WHERE customerEmail IS NOT NULL;

-- 3. Standardize phone format (optional)
-- UPDATE invoices 
-- SET customerPhone = REPLACE(REPLACE(REPLACE(customerPhone, ' ', ''), '-', ''), '(', '')
-- WHERE customerPhone IS NOT NULL;
```

