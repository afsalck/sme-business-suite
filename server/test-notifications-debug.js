// Debug test - write to file
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'test-output.txt');

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  fs.appendFileSync(logFile, line);
  console.log(msg); // Also log to console
}

log('=== Starting Test ===');

try {
  log('Loading database config...');
  const { sequelize } = require('./config/database');
  
  log('Authenticating...');
  sequelize.authenticate().then(() => {
    log('✅ Connected!');
    
    log('Checking table...');
    return sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'notifications'
    `);
  }).then(([results]) => {
    if (results.length === 0) {
      log('❌ Table NOT found');
    } else {
      log('✅ Table found!');
      
      log('Querying table...');
      return sequelize.query('SELECT COUNT(*) as count FROM dbo.notifications');
    }
  }).then(([rows]) => {
    if (rows) {
      log(`✅ Count: ${rows[0].count}`);
    }
    
    log('Testing model...');
    const Notification = require('../models/Notification');
    return Notification.count();
  }).then((count) => {
    log(`✅ Model works! Count: ${count}`);
    log('=== Test Complete ===');
    process.exit(0);
  }).catch((error) => {
    log(`❌ Error: ${error.message}`);
    log(`Stack: ${error.stack}`);
    process.exit(1);
  });
} catch (error) {
  log(`❌ Fatal: ${error.message}`);
  process.exit(1);
}

