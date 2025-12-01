/**
 * Test Notifications System
 * 
 * Run this script to manually test the notification system:
 * node test-notifications.js
 */

const { sequelize } = require('./config/database');
const { runAllExpiryChecks } = require('./services/notificationService');
const Notification = require('../models/Notification');
const User = require('../models/User');

async function testNotifications() {
  console.log('='.repeat(60));
  console.log('🧪 Testing Notifications System');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 1. Test database connection
    console.log('1️⃣  Testing database connection...');
    await sequelize.authenticate();
    console.log('   ✅ Database connected');
    console.log('');

    // 2. Check if notifications table exists
    console.log('2️⃣  Checking notifications table...');
    try {
      const count = await Notification.count();
      console.log(`   ✅ Notifications table exists (${count} notifications)`);
    } catch (error) {
      console.error('   ❌ Notifications table not found!');
      console.error('   💡 Run: server/create-notifications-table.sql');
      process.exit(1);
    }
    console.log('');

    // 3. Check admin users
    console.log('3️⃣  Checking admin users...');
    const admins = await User.findAll({ where: { role: 'admin' } });
    if (admins.length === 0) {
      console.warn('   ⚠️  No admin users found. Notifications are sent to admins only.');
    } else {
      console.log(`   ✅ Found ${admins.length} admin user(s)`);
      admins.forEach(admin => {
        console.log(`      - ${admin.email} (${admin.uid})`);
      });
    }
    console.log('');

    // 4. Run expiry checks
    console.log('4️⃣  Running expiry checks...');
    try {
      const results = await runAllExpiryChecks();
      
      const totalCreated = Object.values(results).reduce(
        (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 
        0
      );
      
      console.log('   ✅ Expiry checks completed');
      console.log(`   📊 Results:`);
      console.log(`      - Passport expiries: ${results.passport?.length || 0}`);
      console.log(`      - Visa expiries: ${results.visa?.length || 0}`);
      console.log(`      - Contract expiries: ${results.contract?.length || 0}`);
      console.log(`      - License expiries: ${results.license?.length || 0}`);
      console.log(`      - VAT due: ${results.vat?.length || 0}`);
      console.log(`      - Invoice due: ${results.invoice?.length || 0}`);
      console.log(`      - Total created: ${totalCreated}`);
    } catch (error) {
      console.error('   ❌ Error running expiry checks:', error.message);
      console.error('   Stack:', error.stack);
    }
    console.log('');

    // 5. Check recent notifications
    console.log('5️⃣  Checking recent notifications...');
    const recentNotifications = await Notification.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']]
    });
    
    if (recentNotifications.length === 0) {
      console.log('   ℹ️  No notifications found');
      console.log('   💡 This is normal if no items are expiring soon');
    } else {
      console.log(`   ✅ Found ${recentNotifications.length} recent notification(s):`);
      recentNotifications.forEach(notif => {
        const data = notif.get({ plain: true });
        console.log(`      - [${data.type}] ${data.title} (${data.status})`);
        console.log(`        User: ${data.userId}, Created: ${new Date(data.createdAt).toLocaleString()}`);
      });
    }
    console.log('');

    // 6. Check unread count per user
    console.log('6️⃣  Checking unread notifications per user...');
    if (admins.length > 0) {
      for (const admin of admins) {
        const unreadCount = await Notification.count({
          where: {
            userId: admin.uid,
            status: 'unread'
          }
        });
        console.log(`   ${admin.email}: ${unreadCount} unread notification(s)`);
      }
    }
    console.log('');

    // 7. Summary
    console.log('='.repeat(60));
    console.log('✅ Test completed successfully!');
    console.log('='.repeat(60));
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Check the frontend notification bell (top-right)');
    console.log('   2. Visit /notifications page to see all notifications');
    console.log('   3. Verify email digest is sent (if SMTP configured)');
    console.log('   4. Check server logs for cron job execution');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ Test failed!');
    console.error('='.repeat(60));
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the test
testNotifications();

