/**
 * Customer Data Validation Script
 * 
 * Usage: node scripts/validateCustomerData.js
 * 
 * This script checks for:
 * - Missing customer data in invoices
 * - Duplicate customer entries
 * - Invalid email formats
 * - Data inconsistencies
 */

const { sequelize } = require('../server/config/database');
const Invoice = require('../models/Invoice');

async function validateCustomerData() {
  console.log('🔍 Starting Customer Data Validation...\n');
  console.log('='.repeat(60));

  try {
    // 1. Check for missing customer data
    console.log('\n1️⃣ Checking for missing customer data...');
    const missingData = await sequelize.query(`
      SELECT 
        id,
        invoiceNumber,
        customerName,
        customerEmail,
        customerPhone,
        issueDate,
        status,
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
      console.log(`❌ Found ${missingData.length} invoices with missing customer data:\n`);
      missingData.slice(0, 10).forEach(inv => {
        console.log(`   Invoice #${inv.invoiceNumber}: ${inv.issue} (ID: ${inv.id})`);
      });
      if (missingData.length > 10) {
        console.log(`   ... and ${missingData.length - 10} more`);
      }
    } else {
      console.log('✅ No missing customer data found');
    }

    // 2. Check for duplicate customers
    console.log('\n2️⃣ Checking for duplicate customers...');
    const duplicates = await sequelize.query(`
      SELECT 
        customerName,
        customerEmail,
        COUNT(*) as invoiceCount,
        STRING_AGG(CAST(id AS VARCHAR), ', ') as invoiceIds
      FROM invoices
      WHERE customerName IS NOT NULL AND customerName != ''
      GROUP BY customerName, customerEmail
      HAVING COUNT(*) > 1
      ORDER BY invoiceCount DESC
    `, { type: sequelize.QueryTypes.SELECT });

    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} potential duplicate customers:\n`);
      duplicates.slice(0, 10).forEach(dup => {
        console.log(`   "${dup.customerName}" - ${dup.invoiceCount} invoices`);
      });
      if (duplicates.length > 10) {
        console.log(`   ... and ${duplicates.length - 10} more`);
      }
    } else {
      console.log('✅ No duplicate customers found');
    }

    // 3. Check for invalid emails
    console.log('\n3️⃣ Checking for invalid email formats...');
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
      console.log(`❌ Found ${invalidEmails.length} invoices with invalid email format:\n`);
      invalidEmails.slice(0, 10).forEach(inv => {
        console.log(`   Invoice #${inv.invoiceNumber}: "${inv.customerEmail}"`);
      });
      if (invalidEmails.length > 10) {
        console.log(`   ... and ${invalidEmails.length - 10} more`);
      }
    } else {
      console.log('✅ All emails are valid');
    }

    // 4. Summary statistics
    console.log('\n4️⃣ Data Completeness Summary:');
    const stats = await sequelize.query(`
      SELECT 
        COUNT(*) as totalInvoices,
        SUM(CASE WHEN customerName IS NULL OR customerName = '' THEN 1 ELSE 0 END) as missingName,
        SUM(CASE WHEN customerEmail IS NULL OR customerEmail = '' THEN 1 ELSE 0 END) as missingEmail,
        SUM(CASE WHEN customerPhone IS NULL OR customerPhone = '' THEN 1 ELSE 0 END) as missingPhone,
        SUM(CASE WHEN customerTRN IS NULL OR customerTRN = '' THEN 1 ELSE 0 END) as missingTRN
      FROM invoices
    `, { type: sequelize.QueryTypes.SELECT });

    const stat = stats[0];
    const total = parseInt(stat.totalInvoices);
    
    console.log(`\n   Total Invoices: ${total}`);
    console.log(`   Missing Name: ${stat.missingName} (${((stat.missingName / total) * 100).toFixed(2)}%)`);
    console.log(`   Missing Email: ${stat.missingEmail} (${((stat.missingEmail / total) * 100).toFixed(2)}%)`);
    console.log(`   Missing Phone: ${stat.missingPhone} (${((stat.missingPhone / total) * 100).toFixed(2)}%)`);
    console.log(`   Missing TRN: ${stat.missingTRN} (${((stat.missingTRN / total) * 100).toFixed(2)}%)`);

    // 5. Data quality score
    const completenessScore = (
      ((total - stat.missingName) / total) * 0.3 +
      ((total - stat.missingEmail) / total) * 0.3 +
      ((total - stat.missingPhone) / total) * 0.2 +
      ((total - stat.missingTRN) / total) * 0.2
    ) * 100;

    console.log(`\n   📊 Data Quality Score: ${completenessScore.toFixed(2)}%`);

    if (completenessScore >= 90) {
      console.log('   ✅ Excellent data quality!');
    } else if (completenessScore >= 75) {
      console.log('   ⚠️  Good, but could be improved');
    } else {
      console.log('   ❌ Data quality needs attention');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Validation complete!\n');

  } catch (error) {
    console.error('❌ Error validating data:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Run validation
if (require.main === module) {
  validateCustomerData();
}

module.exports = { validateCustomerData };

