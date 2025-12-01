const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

async function migrateExpenseTable() {
  try {
    console.log('🔧 Migrating expenses table...\n');
    await sequelize.authenticate();
    console.log('✅ SQL Server connection established successfully.');

    const queryInterface = sequelize.getQueryInterface();
    const tableName = 'expenses';

    // Check if table exists using raw query (more reliable for SQL Server)
    const [results] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
      AND TABLE_NAME = 'expenses'
    `);
    
    if (!results || results.length === 0) {
      console.error(`❌ Table '${tableName}' does not exist. Please create it first using Sequelize sync or init-database.js.`);
      console.log('\n💡 You can create the table by running:');
      console.log('   const Expense = require("./models/Expense");');
      console.log('   await Expense.sync({ alter: true });');
      process.exit(1);
    }

    console.log('📦 Adding new columns to expenses table...');

    let columns;
    try {
      columns = await queryInterface.describeTable(tableName);
    } catch (err) {
      console.error(`❌ Error describing table: ${err.message}`);
      process.exit(1);
    }

    // Add supplier
    if (!columns.supplier) {
      await queryInterface.addColumn(tableName, 'supplier', {
        type: DataTypes.STRING,
        allowNull: true
      });
      console.log('   ✅ Added column \'supplier\'');
    }

    // Add paymentType
    if (!columns.paymentType) {
      await queryInterface.addColumn(tableName, 'paymentType', {
        type: DataTypes.STRING,
        allowNull: true
      });
      console.log('   ✅ Added column \'paymentType\'');
    }

    // Add receiptUrl
    if (!columns.receiptUrl) {
      await queryInterface.addColumn(tableName, 'receiptUrl', {
        type: DataTypes.STRING,
        allowNull: true
      });
      console.log('   ✅ Added column \'receiptUrl\'');
    }

    // Add vatApplicable
    if (!columns.vatApplicable) {
      await queryInterface.addColumn(tableName, 'vatApplicable', {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      });
      console.log('   ✅ Added column \'vatApplicable\'');
    }

    // Add vatAmount
    if (!columns.vatAmount) {
      await queryInterface.addColumn(tableName, 'vatAmount', {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
      });
      console.log('   ✅ Added column \'vatAmount\'');
    }

    // Add totalAmount
    if (!columns.totalAmount) {
      await queryInterface.addColumn(tableName, 'totalAmount', {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      });
      console.log('   ✅ Added column \'totalAmount\'');
    }

    // Add deletedAt
    if (!columns.deletedAt) {
      await queryInterface.addColumn(tableName, 'deletedAt', {
        type: DataTypes.DATE,
        allowNull: true
      });
      console.log('   ✅ Added column \'deletedAt\'');
    }

    // Add updatedByUid
    if (!columns.updatedByUid) {
      await queryInterface.addColumn(tableName, 'updatedByUid', {
        type: DataTypes.STRING,
        allowNull: true
      });
      console.log('   ✅ Added column \'updatedByUid\'');
    }

    // Add updatedByDisplayName
    if (!columns.updatedByDisplayName) {
      await queryInterface.addColumn(tableName, 'updatedByDisplayName', {
        type: DataTypes.STRING,
        allowNull: true
      });
      console.log('   ✅ Added column \'updatedByDisplayName\'');
    }

    // Add updatedByEmail
    if (!columns.updatedByEmail) {
      await queryInterface.addColumn(tableName, 'updatedByEmail', {
        type: DataTypes.STRING,
        allowNull: true
      });
      console.log('   ✅ Added column \'updatedByEmail\'');
    }

    // Update existing expenses: set totalAmount = amount if totalAmount is 0
    console.log('\n📊 Updating existing expenses...');
    await sequelize.query(`
      UPDATE expenses 
      SET totalAmount = amount 
      WHERE totalAmount = 0 OR totalAmount IS NULL
    `);
    console.log('   ✅ Updated existing expenses with totalAmount');

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:\n   1. Restart your server\n   2. Test creating/editing expenses');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error migrating expenses table:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

migrateExpenseTable();

