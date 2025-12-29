// Quick test - just check if table exists
console.log('=== Notification Table Test ===\n');

const { sequelize } = require('./config/database');

async function quickTest() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected!\n');

    console.log('Checking if notifications table exists...');
    const [tableCheck] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'notifications'
    `);
    
    if (tableCheck.length === 0) {
      console.log('❌ Table NOT found in INFORMATION_SCHEMA');
      console.log('   Run: server/create-notifications-table.sql\n');
    } else {
      console.log('✅ Table found in INFORMATION_SCHEMA\n');
      
      console.log('Trying to query table directly...');
      try {
        const [rows] = await sequelize.query('SELECT COUNT(*) as count FROM dbo.notifications');
        console.log(`✅ Can query table! Count: ${rows[0].count}\n`);
      } catch (queryErr) {
        console.log('❌ Cannot query table:', queryErr.message);
        console.log('   This might be a permissions issue\n');
      }
    }

    console.log('Testing Sequelize model...');
    const Notification = require('../models/Notification');
    try {
      const count = await Notification.count();
      console.log(`✅ Sequelize model works! Count: ${count}\n`);
    } catch (modelErr) {
      console.log('❌ Sequelize model error:', modelErr.message);
      console.log('   This might be a model configuration issue\n');
    }

    await sequelize.close();
    console.log('=== Test Complete ===');
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

quickTest();

