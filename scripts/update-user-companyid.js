/**
 * Update user's companyId based on email domain
 * Usage: node scripts/update-user-companyid.js <email> [companyId]
 * Example: node scripts/update-user-companyid.js info@afsal.com 7
 */

const { sequelize } = require('../server/config/database');
const { getCompanyIdFromEmail } = require('../server/services/companyDomainService');

async function updateUserCompanyId(email, providedCompanyId = null) {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Get companyId from email domain if not provided
    let companyId;
    if (providedCompanyId) {
      companyId = parseInt(providedCompanyId);
    } else {
      companyId = await getCompanyIdFromEmail(email, false); // Don't auto-create
      if (!companyId) {
        console.error(`❌ No companyId found for email domain: ${email}`);
        console.log('   Use: node scripts/update-user-companyid.js <email> <companyId>');
        process.exit(1);
      }
    }

    console.log(`📋 Updating user:`);
    console.log(`   Email: ${email}`);
    console.log(`   Company ID: ${companyId}\n`);

    // Update user's companyId
    const [result] = await sequelize.query(
      `UPDATE users SET companyId = :companyId WHERE email = :email`,
      {
        replacements: { companyId: companyId, email: email },
        type: sequelize.QueryTypes.UPDATE
      }
    );

    // Verify update
    const [users] = await sequelize.query(
      `SELECT uid, email, companyId FROM users WHERE email = :email`,
      {
        replacements: { email: email },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (users && users.length > 0) {
      console.log('✅ User updated successfully!');
      console.log('   User details:', users[0]);
    } else {
      console.log('⚠️  User not found in database');
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

const email = process.argv[2];
const companyId = process.argv[3] ? parseInt(process.argv[3]) : null;

if (!email) {
  console.error('❌ Error: Email is required');
  console.log('\nUsage: node scripts/update-user-companyid.js <email> [companyId]');
  console.log('Example: node scripts/update-user-companyid.js info@afsal.com 7');
  process.exit(1);
}

updateUserCompanyId(email, companyId);


