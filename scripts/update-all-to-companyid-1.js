/**
 * Update All Data to companyId = 1
 * 
 * This script updates all existing data to companyId = 1
 * and sets biz.com → companyId = 1 mapping
 * 
 * Usage:
 *   node scripts/update-all-to-companyid-1.js
 */

const { sequelize } = require('../server/config/database');
const CompanyEmailDomain = require('../models/CompanyEmailDomain');

async function updateAllToCompanyId1() {
  try {
    console.log('🔄 Updating all data to companyId = 1...');
    console.log('='.repeat(60));
    
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Step 1: Update email domain mapping
    console.log('📋 Step 1: Updating email domain mapping...');
    try {
      const [mapping, created] = await CompanyEmailDomain.findOrCreate({
        where: { emailDomain: 'biz.com' },
        defaults: {
          companyId: 1,
          isActive: true
        }
      });

      if (!created) {
        await mapping.update({ companyId: 1, isActive: true });
        console.log('  ✅ Updated: biz.com → companyId 1');
      } else {
        console.log('  ✅ Created: biz.com → companyId 1');
      }
    } catch (error) {
      console.error('  ❌ Error updating domain mapping:', error.message);
    }

    // Step 2: Update all invoices
    console.log('\n📋 Step 2: Updating invoices...');
    try {
      const [invoiceCount] = await sequelize.query(
        `UPDATE invoices SET companyId = 1 WHERE companyId != 1`,
        { type: sequelize.QueryTypes.UPDATE }
      );
      console.log(`  ✅ Updated ${invoiceCount} invoices`);
    } catch (error) {
      console.error('  ❌ Error updating invoices:', error.message);
    }

    // Step 3: Update all inventory items
    console.log('\n📋 Step 3: Updating inventory items...');
    try {
      const [itemCount] = await sequelize.query(
        `UPDATE inventoryItems SET companyId = 1 WHERE companyId != 1`,
        { type: sequelize.QueryTypes.UPDATE }
      );
      console.log(`  ✅ Updated ${itemCount} inventory items`);
    } catch (error) {
      console.error('  ❌ Error updating inventory items:', error.message);
    }

    // Step 4: Update all sales
    console.log('\n📋 Step 4: Updating sales...');
    try {
      const [saleCount] = await sequelize.query(
        `UPDATE sales SET companyId = 1 WHERE companyId != 1`,
        { type: sequelize.QueryTypes.UPDATE }
      );
      console.log(`  ✅ Updated ${saleCount} sales`);
    } catch (error) {
      console.error('  ❌ Error updating sales:', error.message);
    }

    // Step 5: Update other tables if they exist
    const otherTables = [
      'expenses',
      'employees',
      'payments',
      'journal_entries',
      'general_ledger',
      'vat_filings',
      'vat_adjustments'
    ];

    for (const tableName of otherTables) {
      try {
        const checkTableQuery = `
          IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'${tableName}') AND type in (N'U'))
          BEGIN
            SELECT COUNT(*) as count FROM ${tableName} WHERE companyId != 1 OR companyId IS NULL;
          END
        `;
        
        const result = await sequelize.query(checkTableQuery, {
          type: sequelize.QueryTypes.SELECT
        });

        if (result && result.length > 0 && result[0].count > 0) {
          const updateQuery = `UPDATE ${tableName} SET companyId = 1 WHERE companyId != 1 OR companyId IS NULL`;
          const [updateCount] = await sequelize.query(updateQuery, {
            type: sequelize.QueryTypes.UPDATE
          });
          console.log(`  ✅ Updated ${updateCount} ${tableName}`);
        }
      } catch (error) {
        // Table might not exist or have companyId column, skip
        // console.log(`  ⏭️  Skipped ${tableName} (${error.message})`);
      }
    }

    // Step 6: Show summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Data Summary by Company:');
    console.log('='.repeat(60));

    const summaryQueries = [
      { name: 'Users', query: 'SELECT companyId, COUNT(*) as count FROM users GROUP BY companyId' },
      { name: 'Invoices', query: 'SELECT companyId, COUNT(*) as count FROM invoices GROUP BY companyId' },
      { name: 'Inventory Items', query: 'SELECT companyId, COUNT(*) as count FROM inventoryItems GROUP BY companyId' },
      { name: 'Sales', query: 'SELECT companyId, COUNT(*) as count FROM sales GROUP BY companyId' }
    ];

    for (const { name, query } of summaryQueries) {
      try {
        const results = await sequelize.query(query, {
          type: sequelize.QueryTypes.SELECT
        });
        console.log(`\n${name}:`);
        for (const row of results) {
          console.log(`   Company ${row.companyId}: ${row.count} records`);
        }
      } catch (error) {
        console.log(`\n${name}: Error - ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All updates completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Update authMiddleware.js: biz.com → companyId 1');
    console.log('2. Restart server');
    console.log('3. Test login with @biz.com email');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Update failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

updateAllToCompanyId1();

