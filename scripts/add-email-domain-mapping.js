/**
 * Script to add email domain mapping to company_email_domains table
 * Usage: node scripts/add-email-domain-mapping.js <emailDomain> <companyId>
 * Example: node scripts/add-email-domain-mapping.js afsal.com 1
 */

const { sequelize } = require('../server/config/database');

async function addEmailDomainMapping(emailDomain, companyId) {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Normalize domain
    const normalizedDomain = emailDomain.toLowerCase().trim();
    if (normalizedDomain.includes('@')) {
      const domain = normalizedDomain.split('@')[1];
      console.log(`⚠️  Full email provided, extracting domain: ${domain}`);
      normalizedDomain = domain;
    }

    console.log(`📋 Adding domain mapping:`);
    console.log(`   Domain: ${normalizedDomain}`);
    console.log(`   Company ID: ${companyId}\n`);

    // Check if domain already exists
    const [existing] = await sequelize.query(
      `SELECT * FROM company_email_domains WHERE emailDomain = :domain`,
      {
        replacements: { domain: normalizedDomain },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (existing && existing.length > 0) {
      // Update existing mapping
      await sequelize.query(
        `UPDATE company_email_domains 
         SET companyId = :companyId, isActive = 1, updatedAt = GETDATE()
         WHERE emailDomain = :domain`,
        {
          replacements: { companyId: companyId, domain: normalizedDomain },
          type: sequelize.QueryTypes.UPDATE
        }
      );
      console.log(`✅ Updated existing domain mapping: ${normalizedDomain} → companyId ${companyId}`);
    } else {
      // Create new mapping
      await sequelize.query(
        `INSERT INTO company_email_domains (companyId, emailDomain, isActive, createdAt, updatedAt)
         VALUES (:companyId, :domain, 1, GETDATE(), GETDATE())`,
        {
          replacements: { companyId: companyId, domain: normalizedDomain },
          type: sequelize.QueryTypes.INSERT
        }
      );
      console.log(`✅ Created domain mapping: ${normalizedDomain} → companyId ${companyId}`);
    }

    // Refresh cache in companyDomainService
    const { refreshCache } = require('../server/services/companyDomainService');
    await refreshCache();
    console.log('✅ Cache refreshed\n');

    console.log('============================================================');
    console.log('✅ Domain mapping added successfully!');
    console.log('============================================================');
    console.log(`📧 Email Domain: ${normalizedDomain}`);
    console.log(`🏢 Company ID: ${companyId}`);
    console.log('\n💡 Users with @' + normalizedDomain + ' emails can now login!');

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Get arguments from command line
const emailDomain = process.argv[2];
const companyId = parseInt(process.argv[3]) || 1;

if (!emailDomain) {
  console.error('❌ Error: Email domain is required');
  console.log('\nUsage: node scripts/add-email-domain-mapping.js <emailDomain> [companyId]');
  console.log('Example: node scripts/add-email-domain-mapping.js afsal.com 1');
  process.exit(1);
}

addEmailDomainMapping(emailDomain, companyId);

