// Simple test script for notifications
// Run: node server/test-notifications-simple.js

console.log('Starting notification test...\n');

const path = require('path');

async function test() {
  try {
    console.log('1. Loading modules...');
    const { sequelize } = require(path.join(__dirname, 'config', 'database'));
    const { runAllExpiryChecks } = require(path.join(__dirname, 'services', 'notificationService'));
    const Notification = require(path.join(__dirname, '..', 'models', 'Notification'));
    const Employee = require(path.join(__dirname, '..', 'models', 'Employee'));
    const User = require(path.join(__dirname, '..', 'models', 'User'));
    console.log('   ✅ Modules loaded');
    
    console.log('2. Connecting to database...');
    await sequelize.authenticate();
    console.log('   ✅ Connected!');
    
    console.log('3. Checking notifications table...');
    try {
      // First check if table exists using raw SQL
      const [results] = await sequelize.query(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'notifications'
      `);
      
      if (results.length === 0 || results[0].count === 0) {
        console.error('   ❌ Table does NOT exist in database!');
        console.error('   Run: server/create-notifications-table.sql');
        process.exit(1);
      }
      
      // Try to count using Sequelize
      try {
        const count = await Notification.count();
        console.log(`   ✅ Table exists (${count} notifications)`);
      } catch (countErr) {
        console.error('   ⚠️  Table exists but Sequelize cannot access it');
        console.error('   Error:', countErr.message);
        // Try raw SQL count instead
        const [countResult] = await sequelize.query('SELECT COUNT(*) as count FROM dbo.notifications');
        console.log(`   ✅ Table exists (${countResult[0].count} notifications via raw SQL)`);
      }
    } catch (err) {
      console.error('   ❌ Error checking table:', err.message);
      process.exit(1);
    }
    
    console.log('4. Checking employees...');
    const employees = await Employee.findAll({ raw: true });
    console.log(`   Found ${employees.length} employees`);
    
    const dayjs = require('dayjs');
    const today = dayjs();
    const withExpiry = employees.filter(e => {
      if (!e.passportExpiry && !e.visaExpiry) return false;
      const pDays = e.passportExpiry ? dayjs(e.passportExpiry).diff(today, 'day') : 999;
      const vDays = e.visaExpiry ? dayjs(e.visaExpiry).diff(today, 'day') : 999;
      return (pDays >= 0 && pDays <= 60) || (vDays >= 0 && vDays <= 60);
    });
    console.log(`   Employees with expiries in 60 days: ${withExpiry.length}`);
    
    console.log('5. Checking admin users...');
    const admins = await User.findAll({ where: { role: 'admin' }, raw: true });
    console.log(`   Found ${admins.length} admin users`);
    
    console.log('6. Running expiry checks...');
    const results = await runAllExpiryChecks();
    console.log('   Results:', {
      passport: results.passport?.length || 0,
      visa: results.visa?.length || 0,
      contract: results.contract?.length || 0
    });
    
    console.log('7. Checking notifications...');
    try {
      const total = await Notification.count();
      console.log(`   Total notifications: ${total}`);
    } catch (countErr) {
      // If Sequelize count fails, use raw SQL
      console.log('   ⚠️  Using raw SQL to count...');
      const [countResult] = await sequelize.query('SELECT COUNT(*) as count FROM dbo.notifications');
      console.log(`   Total notifications: ${countResult[0].count}`);
    }
    
    console.log('\n✅ Test completed!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

test();

