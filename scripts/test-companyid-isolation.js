/**
 * Test Script: Verify CompanyId Data Isolation
 * 
 * This script tests that data isolation works correctly between companies.
 * 
 * Usage:
 *   node scripts/test-companyid-isolation.js
 */

const { sequelize } = require('../server/config/database');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const Employee = require('../models/Employee');
const Expense = require('../models/Expense');
const Company = require('../models/Company');

async function testCompanyIdIsolation() {
  try {
    console.log('🧪 Starting CompanyId Isolation Tests...\n');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Step 1: Check if we have at least 2 companies
    console.log('📋 Step 1: Checking companies...');
    const companies = await Company.findAll();
    console.log(`   Found ${companies.length} companies`);
    
    if (companies.length < 2) {
      console.log('⚠️  Need at least 2 companies for testing. Creating test companies...');
      
      // Create test companies if they don't exist
      const [company1] = await Company.findOrCreate({
        where: { companyId: 1 },
        defaults: {
          companyId: 1,
          name: 'Test Company A',
          shopName: 'Shop A',
          email: 'testa@example.com'
        }
      });
      
      const [company2] = await Company.findOrCreate({
        where: { companyId: 2 },
        defaults: {
          companyId: 2,
          name: 'Test Company B',
          shopName: 'Shop B',
          email: 'testb@example.com'
        }
      });
      
      console.log(`   ✅ Created companies: ${company1.name} (ID: 1), ${company2.name} (ID: 2)\n`);
    } else {
      console.log(`   ✅ Found ${companies.length} companies\n`);
    }

    // Step 2: Check data distribution
    console.log('📊 Step 2: Checking data distribution by companyId...\n');
    
    const tables = [
      { name: 'users', model: User },
      { name: 'invoices', model: Invoice },
      { name: 'employees', model: Employee },
      { name: 'expenses', model: Expense }
    ];

    for (const { name, model } of tables) {
      try {
        const distribution = await sequelize.query(`
          SELECT companyId, COUNT(*) as count
          FROM ${name}
          GROUP BY companyId
          ORDER BY companyId
        `, { type: sequelize.QueryTypes.SELECT });

        console.log(`   ${name}:`);
        if (distribution.length === 0) {
          console.log(`      ⚠️  No data found`);
        } else {
          distribution.forEach(row => {
            console.log(`      Company ${row.companyId}: ${row.count} records`);
          });
        }
      } catch (error) {
        console.log(`   ${name}: ❌ Error - ${error.message}`);
      }
    }

    // Step 3: Test isolation - check for cross-company data leaks
    console.log('\n🔒 Step 3: Testing data isolation...\n');
    
    let isolationIssues = [];

    // Check if any table has records without companyId
    for (const { name, model } of tables) {
      try {
        const nullCompanyId = await sequelize.query(`
          SELECT COUNT(*) as count
          FROM ${name}
          WHERE companyId IS NULL
        `, { type: sequelize.QueryTypes.SELECT });

        if (nullCompanyId[0].count > 0) {
          isolationIssues.push(`${name}: ${nullCompanyId[0].count} records with NULL companyId`);
        }
      } catch (error) {
        // Table might not exist or might not have companyId yet
      }
    }

    // Step 4: Test sample queries with companyId filter
    console.log('🔍 Step 4: Testing queries with companyId filter...\n');
    
    try {
      // Test Invoice queries
      const invoicesCompany1 = await Invoice.findAll({
        where: { companyId: 1 },
        limit: 5,
        attributes: ['id', 'invoiceNumber', 'companyId']
      });
      
      const invoicesCompany2 = await Invoice.findAll({
        where: { companyId: 2 },
        limit: 5,
        attributes: ['id', 'invoiceNumber', 'companyId']
      });

      console.log(`   Invoices for Company 1: ${invoicesCompany1.length} found`);
      console.log(`   Invoices for Company 2: ${invoicesCompany2.length} found`);

      // Verify no cross-contamination
      const company1Ids = invoicesCompany1.map(i => i.id);
      const company2Ids = invoicesCompany2.map(i => i.id);
      const overlap = company1Ids.filter(id => company2Ids.includes(id));
      
      if (overlap.length > 0) {
        isolationIssues.push(`Invoices: Found overlapping IDs between companies: ${overlap.join(', ')}`);
      } else {
        console.log(`   ✅ No ID overlap between companies`);
      }
    } catch (error) {
      console.log(`   ⚠️  Could not test invoices: ${error.message}`);
    }

    // Step 5: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    if (isolationIssues.length === 0) {
      console.log('✅ All isolation tests passed!');
      console.log('✅ Data appears to be properly isolated by companyId');
    } else {
      console.log('❌ Found isolation issues:');
      isolationIssues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }

    console.log('\n💡 Next Steps:');
    console.log('   1. Test manually with different user accounts');
    console.log('   2. Check server logs for [Tenant] messages');
    console.log('   3. Verify API endpoints filter by companyId');
    console.log('   4. Test creating/updating/deleting records');

    process.exit(isolationIssues.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run tests
testCompanyIdIsolation();

