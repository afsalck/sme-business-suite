/**
 * Fix brav.com user - delete or update
 */

const { sequelize } = require('../server/config/database');
const User = require('../models/User');

async function fixBravUser() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Find user
    const user = await User.findOne({
      where: { email: 'afsal@brav.com' }
    });

    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('📋 Found user:');
    console.log(`   Email: ${user.email}`);
    console.log(`   companyId: ${user.companyId}`);
    console.log(`   UID: ${user.uid}`);

    console.log('\n⚠️  This user should not exist (brav.com is not authorized)');
    console.log('\nOptions:');
    console.log('1. Delete this user (recommended)');
    console.log('2. Keep user but they will be blocked on next login');

    // Delete the user
    await user.destroy();
    console.log('\n✅ User deleted successfully');
    console.log('\n📋 Next steps:');
    console.log('1. Restart your server (blocking is already enabled)');
    console.log('2. User will be blocked if they try to login again');
    console.log('3. Only @biz.com users can login now');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixBravUser();

