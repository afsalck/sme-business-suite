/**
 * Add Email Domain Mapping
 * 
 * Easily add new email domains to allow users to login
 * 
 * Usage:
 *   node scripts/add-email-domain.js <domain> <companyId>
 * 
 * Examples:
 *   node scripts/add-email-domain.js customera.com 1
 *   node scripts/add-email-domain.js customerb.com 2
 */

const { sequelize } = require('../server/config/database');
const CompanyEmailDomain = require('../models/CompanyEmailDomain');
const Company = require('../models/Company');

async function addEmailDomain(domain, companyId) {
  try {
    if (!domain || !companyId) {
      console.log('❌ Usage: node scripts/add-email-domain.js <domain> <companyId>');
      console.log('   Example: node scripts/add-email-domain.js customera.com 1');
      process.exit(1);
    }

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Validate companyId exists
    const company = await Company.findOne({
      where: { companyId: parseInt(companyId) }
    });

    if (!company) {
      console.log(`❌ Company with companyId = ${companyId} does not exist!`);
      console.log('\n📋 Available companies:');
      const companies = await Company.findAll({
        attributes: ['companyId', 'name']
      });
      companies.forEach(c => {
        console.log(`   companyId ${c.companyId}: ${c.name}`);
      });
      process.exit(1);
    }

    // Normalize domain (lowercase, no @)
    const normalizedDomain = domain.toLowerCase().replace('@', '');

    // Check if domain already exists
    const existing = await CompanyEmailDomain.findOne({
      where: { emailDomain: normalizedDomain }
    });

    if (existing) {
      // Update existing
      await existing.update({
        companyId: parseInt(companyId),
        isActive: true
      });
      console.log(`✅ Updated existing mapping:`);
      console.log(`   ${normalizedDomain} → companyId ${companyId}`);
    } else {
      // Create new
      await CompanyEmailDomain.create({
        emailDomain: normalizedDomain,
        companyId: parseInt(companyId),
        isActive: true
      });
      console.log(`✅ Created new mapping:`);
      console.log(`   ${normalizedDomain} → companyId ${companyId}`);
    }

    // Show company info
    console.log(`\n📋 Company: ${company.name} (companyId: ${company.companyId})`);

    // Show all domains for this company
    const allDomains = await CompanyEmailDomain.findAll({
      where: { companyId: parseInt(companyId), isActive: true },
      attributes: ['emailDomain']
    });

    console.log(`\n📧 Allowed domains for companyId ${companyId}:`);
    allDomains.forEach(d => {
      console.log(`   - ${d.emailDomain}`);
    });

    console.log('\n✅ Domain added successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Users with @' + normalizedDomain + ' can now login');
    console.log('2. They will be assigned companyId = ' + companyId);
    console.log('3. They will see data for companyId = ' + companyId);
    console.log('4. No server restart needed (cache refreshes automatically)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get command line arguments
const domain = process.argv[2];
const companyId = process.argv[3];

addEmailDomain(domain, companyId);

