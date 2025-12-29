/**
 * Onboard New Customer
 * 
 * Complete script to onboard a new customer with their company and email domain
 * 
 * Usage:
 *   node scripts/onboard-new-customer.js <companyName> <emailDomain> [companyId]
 * 
 * Examples:
 *   node scripts/onboard-new-customer.js "Customer A Trading LLC" customera.com
 *   node scripts/onboard-new-customer.js "Customer B Enterprises" customerb.com 3
 */

const { sequelize } = require('../server/config/database');
const Company = require('../models/Company');
const CompanyEmailDomain = require('../models/CompanyEmailDomain');

async function onboardCustomer(companyName, emailDomain, providedCompanyId = null) {
  try {
    if (!companyName || !emailDomain) {
      console.log('❌ Usage: node scripts/onboard-new-customer.js <companyName> <emailDomain> [companyId]');
      console.log('   Example: node scripts/onboard-new-customer.js "Customer A Trading LLC" customera.com');
      process.exit(1);
    }

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Determine companyId
    let companyId;
    if (providedCompanyId) {
      companyId = parseInt(providedCompanyId);
      // Check if companyId already exists
      const existing = await Company.findOne({
        where: { companyId }
      });
      if (existing) {
        console.log(`❌ Company with companyId = ${companyId} already exists!`);
        console.log(`   Existing: ${existing.name}`);
        process.exit(1);
      }
    } else {
      // Get next available companyId
      const result = await sequelize.query(
        'SELECT MAX(companyId) + 1 AS nextId FROM companies',
        { type: sequelize.QueryTypes.SELECT }
      );
      companyId = result[0]?.nextId || 1;
    }

    // Normalize domain
    const normalizedDomain = emailDomain.toLowerCase().replace('@', '');

    console.log('📋 Onboarding Details:');
    console.log(`   Company Name: ${companyName}`);
    console.log(`   Email Domain: ${normalizedDomain}`);
    console.log(`   Company ID: ${companyId}`);
    console.log('');

    // Step 1: Create company
    console.log('📋 Step 1: Creating company...');
    const company = await Company.create({
      companyId: companyId,
      name: companyName,
      shopName: `${companyName} Shop`,
      email: `info@${normalizedDomain}`,
      // Other fields can be updated later
    });
    console.log(`✅ Company created: ${company.name} (companyId: ${company.companyId})`);

    // Step 2: Add email domain mapping
    console.log('\n📋 Step 2: Adding email domain mapping...');
    try {
      // Use raw SQL to avoid date conversion issues
      const checkQuery = `SELECT id FROM company_email_domains WHERE emailDomain = :domain`;
      const existing = await sequelize.query(checkQuery, {
        replacements: { domain: normalizedDomain },
        type: sequelize.QueryTypes.SELECT
      });

      if (existing && existing.length > 0) {
        // Update existing mapping
        await sequelize.query(
          `UPDATE company_email_domains SET companyId = :companyId, isActive = 1 WHERE emailDomain = :domain`,
          {
            replacements: { companyId: companyId, domain: normalizedDomain },
            type: sequelize.QueryTypes.UPDATE
          }
        );
        console.log(`✅ Updated domain mapping: ${normalizedDomain} → companyId ${companyId}`);
      } else {
        // Create new mapping
        await sequelize.query(
          `INSERT INTO company_email_domains (companyId, emailDomain, isActive) VALUES (:companyId, :domain, 1)`,
          {
            replacements: { companyId: companyId, domain: normalizedDomain },
            type: sequelize.QueryTypes.INSERT
          }
        );
        console.log(`✅ Created domain mapping: ${normalizedDomain} → companyId ${companyId}`);
      }
    } catch (mappingError) {
      console.error(`❌ Error creating domain mapping: ${mappingError.message}`);
      throw mappingError;
    }

    // Step 3: Show summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Customer Onboarded Successfully!');
    console.log('='.repeat(60));
    console.log(`\n📋 Company Details:`);
    console.log(`   Company ID: ${company.companyId}`);
    console.log(`   Company Name: ${company.name}`);
    console.log(`   Shop Name: ${company.shopName || 'Not set'}`);
    console.log(`   Email: ${company.email || 'Not set'}`);
    
    console.log(`\n📧 Email Domain:`);
    console.log(`   ${normalizedDomain} → companyId ${companyId}`);

    // Show all domains for this company
    const allDomains = await CompanyEmailDomain.findAll({
      where: { companyId: companyId, isActive: true },
      attributes: ['emailDomain']
    });

    if (allDomains.length > 1) {
      console.log(`\n📧 All domains for this company:`);
      allDomains.forEach(d => {
        console.log(`   - ${d.emailDomain}`);
      });
    }

    console.log('\n📋 Next Steps:');
    console.log('1. Update company details (address, phone, TRN) in companies table if needed');
    console.log('2. Create users in Firebase with @' + normalizedDomain + ' emails');
    console.log('3. Users can now login and will automatically get companyId = ' + companyId);
    console.log('4. Users will see only data for companyId = ' + companyId);
    console.log('5. No server restart needed!');

    console.log('\n💡 SQL to update company details:');
    console.log(`UPDATE companies SET address = 'Your Address', phone = '+971-...', trn = 'TRN...' WHERE companyId = ${companyId};`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error onboarding customer:', error.message);
    if (error.errors) {
      error.errors.forEach(e => {
        console.error(`   - ${e.message}`);
      });
    }
    process.exit(1);
  }
}

// Get command line arguments
const companyName = process.argv[2];
const emailDomain = process.argv[3];
const companyId = process.argv[4];

onboardCustomer(companyName, emailDomain, companyId);

