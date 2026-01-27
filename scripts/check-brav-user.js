/**
 * Check brav.com user and fix
 */

const { sequelize } = require('../server/config/database');
const { Op } = require('sequelize');
const User = require('../models/User');
const CompanyEmailDomain = require('../models/CompanyEmailDomain');

async function checkAndFix() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Check user
    const user = await User.findOne({
      where: { email: { [Op.like]: '%brav.com%' } }
    });

    if (user) {
      console.log('📋 Found user:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Current companyId: ${user.companyId}`);
      console.log(`   Created: ${user.createdAt}`);
    } else {
      console.log('❌ User not found');
    }

    // Check domain mapping
    const mapping = await CompanyEmailDomain.findOne({
      where: { emailDomain: 'brav.com' }
    });

    if (mapping) {
      console.log('\n📋 Domain mapping found:');
      console.log(`   brav.com → companyId ${mapping.companyId}`);
    } else {
      console.log('\n❌ Domain mapping NOT found for brav.com');
      console.log('   This means brav.com was not in database when user logged in');
    }

    // Check if auto-create happened
    const companies = await sequelize.query(
      "SELECT companyId, name FROM companies WHERE name LIKE '%brav%'",
      { type: sequelize.QueryTypes.SELECT }
    );

    if (companies.length > 0) {
      console.log('\n📋 Auto-created company found:');
      companies.forEach(c => {
        console.log(`   companyId: ${c.companyId}, name: ${c.name}`);
      });
    } else {
      console.log('\n❌ No auto-created company found');
      console.log('   This means auto-create did NOT happen');
      console.log('   User was assigned companyId = 1 (default)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('💡 Solution: Enable blocking to prevent this');
    console.log('   Edit server/services/companyDomainService.js');
    console.log('   Set: BLOCK_UNMAPPED_DOMAINS = true');
    console.log('   Then restart server');
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAndFix();

