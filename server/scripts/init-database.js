const { sequelize, testConnection } = require('../config/database');
const User = require('../../models/User');
const Employee = require('../../models/Employee');
const Invoice = require('../../models/Invoice');
const Expense = require('../../models/Expense');
const Sale = require('../../models/Sale');
const InventoryItem = require('../../models/InventoryItem');

async function initDatabase() {
  try {
    console.log('🔧 Initializing SQL Server database...\n');
    
    // Test connection
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Cannot connect to SQL Server. Please check your connection settings.');
      process.exit(1);
    }
    
    // Sync all models (create tables if they don't exist)
    console.log('📦 Creating tables...');
    // Use 'force: false' to only create if not exists, avoid 'alter' which has issues with constraints
    await sequelize.sync({ force: false }); // Creates tables if they don't exist
    
    console.log('\n✅ Database initialized successfully!');
    console.log('   Tables created:');
    console.log('   - users');
    console.log('   - employees');
    console.log('   - invoices');
    console.log('   - expenses');
    console.log('   - sales');
    console.log('   - inventoryItems');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error initializing database:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

initDatabase();

