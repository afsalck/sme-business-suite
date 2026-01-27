/**
 * Update biz.com domain mapping to companyId = 1
 * 
 * Usage:
 *   node scripts/update-biz-domain-mapping.js
 */

const { sequelize } = require('../server/config/database');
const CompanyEmailDomain = require('../models/CompanyEmailDomain');

async function updateBizDomainMapping() {
  try {
    console.log('🔄 Updating biz.com domain mapping to companyId = 1...');
    
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Use raw SQL to avoid date issues
    await sequelize.query(
      `UPDATE company_email_domains SET companyId = 1, isActive = 1 WHERE emailDomain = 'biz.com'`,
      { type: sequelize.QueryTypes.UPDATE }
    );

    // Check if it exists, if not create it
    const mapping = await CompanyEmailDomain.findOne({
      where: { emailDomain: 'biz.com' }
    });

    if (!mapping) {
      await sequelize.query(
        `INSERT INTO company_email_domains (companyId, emailDomain, isActive) VALUES (1, 'biz.com', 1)`,
        { type: sequelize.QueryTypes.INSERT }
      );
      console.log('✅ Created: biz.com → companyId 1');
    } else {
      console.log('✅ Updated: biz.com → companyId 1');
    }

    // Verify
    const verify = await CompanyEmailDomain.findOne({
      where: { emailDomain: 'biz.com' },
      attributes: ['emailDomain', 'companyId', 'isActive']
    });

    console.log('\n📊 Current mapping:');
    console.log(`   ${verify.emailDomain} → companyId ${verify.companyId} (${verify.isActive ? 'Active' : 'Inactive'})`);

    console.log('\n✅ Domain mapping updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateBizDomainMapping();

