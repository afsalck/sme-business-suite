/**
 * Manual test script for notification system
 * Run: node server/test-notifications-manual.js
 * 
 * This will manually trigger all expiry checks and show what notifications would be created.
 */

// Fix paths - script should be run from server directory
const path = require('path');
const { runAllExpiryChecks, checkPassportExpiries, checkVisaExpiries } = require(path.join(__dirname, 'services', 'notificationService'));
const { sequelize } = require(path.join(__dirname, 'config', 'database'));
const Employee = require(path.join(__dirname, '..', 'models', 'Employee'));
const Notification = require(path.join(__dirname, '..', 'models', 'Notification'));
const User = require(path.join(__dirname, '..', 'models', 'User'));
const dayjs = require('dayjs');

async function testNotifications() {
  console.log('='.repeat(60));
  console.log('🧪 Testing Notification System');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Check database connection
    await sequelize.authenticate();
    console.log('✅ Database connected');
    console.log('');

    // Check if notifications table exists
    try {
      const count = await Notification.count();
      console.log(`✅ Notifications table exists (${count} notifications)`);
    } catch (error) {
      console.error('❌ Notifications table does NOT exist!');
      console.error('   Please run: server/create-notifications-table.sql');
      console.error('   Error:', error.message);
      return;
    }
    console.log('');

    // Check employees with expiry dates
    console.log('📋 Checking employees with expiry dates...');
    const employees = await Employee.findAll({
      attributes: ['id', 'fullName', 'passportExpiry', 'visaExpiry'],
      raw: true
    });

    console.log(`   Found ${employees.length} employees`);
    
    const today = dayjs();
    const employeesWithExpiry = employees.filter(emp => {
      if (!emp.passportExpiry && !emp.visaExpiry) return false;
      const passportDays = emp.passportExpiry ? dayjs(emp.passportExpiry).diff(today, 'day') : 999;
      const visaDays = emp.visaExpiry ? dayjs(emp.visaExpiry).diff(today, 'day') : 999;
      return (passportDays >= 0 && passportDays <= 60) || (visaDays >= 0 && visaDays <= 60);
    });

    console.log(`   Employees with expiries in next 60 days: ${employeesWithExpiry.length}`);
    
    if (employeesWithExpiry.length > 0) {
      console.log('');
      console.log('   Employees with upcoming expiries:');
      employeesWithExpiry.forEach(emp => {
        if (emp.passportExpiry) {
          const days = dayjs(emp.passportExpiry).diff(today, 'day');
          console.log(`     - ${emp.fullName}: Passport expires in ${days} days (${dayjs(emp.passportExpiry).format('YYYY-MM-DD')})`);
        }
        if (emp.visaExpiry) {
          const days = dayjs(emp.visaExpiry).diff(today, 'day');
          console.log(`     - ${emp.fullName}: Visa expires in ${days} days (${dayjs(emp.visaExpiry).format('YYYY-MM-DD')})`);
        }
      });
    }
    console.log('');

    // Check admin users
    console.log('👥 Checking admin users...');
    const admins = await User.findAll({
      where: { role: 'admin' },
      attributes: ['uid', 'email', 'displayName'],
      raw: true
    });
    console.log(`   Found ${admins.length} admin users:`);
    admins.forEach(admin => {
      console.log(`     - ${admin.displayName || admin.email} (${admin.uid})`);
    });
    console.log('');

    if (admins.length === 0) {
      console.warn('⚠️  No admin users found! Notifications will not be created.');
      console.warn('   Create an admin user or update an existing user role to "admin"');
      console.log('');
    }

    // Run expiry checks
    console.log('🔍 Running expiry checks...');
    console.log('');
    
    const results = await runAllExpiryChecks();
    
    console.log('📊 Results:');
    console.log(`   Passport notifications: ${results.passport?.length || 0}`);
    console.log(`   Visa notifications: ${results.visa?.length || 0}`);
    console.log(`   Contract notifications: ${results.contract?.length || 0}`);
    console.log(`   Trade license notifications: ${results.tradeLicense?.length || 0}`);
    console.log(`   VAT filing notifications: ${results.vatFiling?.length || 0}`);
    console.log(`   Invoice due notifications: ${results.invoiceDue?.length || 0}`);
    console.log('');

    // Check created notifications
    console.log('📬 Checking created notifications...');
    const allNotifications = await Notification.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10,
      raw: true
    });

    console.log(`   Total notifications in database: ${await Notification.count()}`);
    console.log(`   Latest 10 notifications:`);
    
    if (allNotifications.length === 0) {
      console.log('     (No notifications found)');
    } else {
      allNotifications.forEach((notif, idx) => {
        const created = dayjs(notif.createdAt).format('YYYY-MM-DD HH:mm:ss');
        console.log(`     ${idx + 1}. [${notif.type}] ${notif.title} - ${notif.status} (${created})`);
      });
    }
    console.log('');

    // Summary
    console.log('='.repeat(60));
    console.log('📋 Summary:');
    console.log('='.repeat(60));
    console.log(`   Employees checked: ${employees.length}`);
    console.log(`   Employees with expiries: ${employeesWithExpiry.length}`);
    console.log(`   Admin users: ${admins.length}`);
    console.log(`   Notifications created in this run: ${(results.passport?.length || 0) + (results.visa?.length || 0) + (results.contract?.length || 0) + (results.tradeLicense?.length || 0) + (results.vatFiling?.length || 0) + (results.invoiceDue?.length || 0)}`);
    console.log(`   Total notifications in database: ${await Notification.count()}`);
    console.log('');

    if (employeesWithExpiry.length > 0 && admins.length > 0) {
      console.log('✅ System is ready. Notifications should be created for expiring documents.');
      console.log('   Check the notifications bell icon in the app or run this script again.');
    } else if (employeesWithExpiry.length === 0) {
      console.log('ℹ️  No employees found with expiries in the next 60 days.');
      console.log('   To test: Update an employee\'s passportExpiry or visaExpiry to be 60 days from today.');
    } else if (admins.length === 0) {
      console.log('⚠️  No admin users found. Notifications cannot be created.');
    }

    console.log('');
    console.log('💡 Tip: The cron job runs daily at 9 AM UAE time.');
    console.log('   You can also manually trigger it by running this script.');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error testing notifications:', error);
    console.error('   Stack:', error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Run the test
testNotifications().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

