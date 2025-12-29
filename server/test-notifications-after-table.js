// Test notifications after table creation
// Run: node server/test-notifications-after-table.js

console.log('=== Testing Notifications System ===\n');

const path = require('path');
const { sequelize } = require(path.join(__dirname, 'config', 'database'));
const { runAllExpiryChecks } = require(path.join(__dirname, 'services', 'notificationService'));
const Notification = require(path.join(__dirname, '..', 'models', 'Notification'));
const Employee = require(path.join(__dirname, '..', 'models', 'Employee'));
const User = require(path.join(__dirname, '..', 'models', 'User'));

async function test() {
  try {
    // 1. Connect to database
    console.log('1. Connecting to database...');
    await sequelize.authenticate();
    console.log('   ✅ Connected!\n');

    // 2. Verify table exists
    console.log('2. Verifying notifications table...');
    const [tableCheck] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'notifications'
    `);
    
    if (tableCheck[0].count === 0) {
      console.log('   ❌ Table does NOT exist!');
      console.log('   Run: server/create-notifications-table.sql\n');
      process.exit(1);
    }
    console.log('   ✅ Table exists!\n');

    // 3. Check current notification count
    console.log('3. Checking current notifications...');
    const [currentCount] = await sequelize.query('SELECT COUNT(*) as count FROM dbo.notifications');
    console.log(`   Current notifications: ${currentCount[0].count}\n`);

    // 4. Check employees with expiries
    console.log('4. Checking employees with upcoming expiries...');
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 60);
    
    const employees = await Employee.findAll({
      where: {
        [sequelize.Sequelize.Op.or]: [
          {
            passportExpiry: {
              [sequelize.Sequelize.Op.between]: [today, futureDate]
            }
          },
          {
            visaExpiry: {
              [sequelize.Sequelize.Op.between]: [today, futureDate]
            }
          }
        ]
      }
    });
    console.log(`   Found ${employees.length} employees with expiries in next 60 days`);
    if (employees.length > 0) {
      employees.forEach(emp => {
        console.log(`   - ${emp.fullName}: Passport=${emp.passportExpiry ? new Date(emp.passportExpiry).toLocaleDateString() : 'N/A'}, Visa=${emp.visaExpiry ? new Date(emp.visaExpiry).toLocaleDateString() : 'N/A'}`);
      });
    }
    console.log('');

    // 5. Check admin users
    console.log('5. Checking admin users...');
    const admins = await User.findAll({
      where: {
        role: 'admin'
      }
    });
    console.log(`   Found ${admins.length} admin users`);
    if (admins.length === 0) {
      console.log('   ⚠️  WARNING: No admin users found! Notifications will not be created.');
      console.log('   Notifications are sent to admin users only.\n');
    } else {
      admins.forEach(admin => {
        console.log(`   - ${admin.email} (UID: ${admin.uid})`);
      });
      console.log('');
    }

    // 6. Run expiry checks
    console.log('6. Running expiry checks...');
    console.log('   This will create notifications for employees with upcoming expiries...\n');
    
    const results = await runAllExpiryChecks();
    
    console.log('   Results:');
    console.log(`   - Passport expiries: ${results.passport?.length || 0} notifications`);
    console.log(`   - Visa expiries: ${results.visa?.length || 0} notifications`);
    console.log(`   - Contract expiries: ${results.contract?.length || 0} notifications`);
    console.log(`   - License expiries: ${results.license?.length || 0} notifications`);
    console.log(`   - VAT due: ${results.vat?.length || 0} notifications`);
    console.log(`   - Invoice due: ${results.invoice?.length || 0} notifications\n`);

    // 7. Check final notification count
    console.log('7. Checking final notification count...');
    const [finalCount] = await sequelize.query('SELECT COUNT(*) as count FROM dbo.notifications');
    const newNotifications = finalCount[0].count - currentCount[0].count;
    console.log(`   Total notifications: ${finalCount[0].count}`);
    console.log(`   New notifications created: ${newNotifications}\n`);

    // 8. Show recent notifications
    if (finalCount[0].count > 0) {
      console.log('8. Recent notifications:');
      const [recent] = await sequelize.query(`
        SELECT TOP 5 
          id, type, title, status, createdAt, userId
        FROM dbo.notifications
        ORDER BY createdAt DESC
      `);
      recent.forEach(notif => {
        console.log(`   - [${notif.status}] ${notif.type}: ${notif.title} (${new Date(notif.createdAt).toLocaleString()})`);
      });
      console.log('');
    }

    console.log('=== Test Complete ===');
    console.log('\nNext steps:');
    console.log('1. Restart your Node.js server (if running)');
    console.log('2. Refresh your browser');
    console.log('3. Check the notification bell icon in the top navigation');
    console.log('4. Or use the browser console test (see TEST_NOTIFICATIONS_BROWSER.md)');
    
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

test();

