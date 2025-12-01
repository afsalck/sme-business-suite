const { sequelize } = require('../config/database');

async function fixEmployeeColumns() {
  try {
    console.log('🔧 Fixing employees table columns...\n');
    await sequelize.authenticate();
    console.log('✅ SQL Server connection established successfully.');

    // Check if old columns exist and remove them if they do
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'employees' 
      AND COLUMN_NAME IN ('name', 'position', 'salary')
    `);

    if (columns && columns.length > 0) {
      console.log('📦 Removing old columns that conflict with new HR fields...');
      
      for (const col of columns) {
        const columnName = col.COLUMN_NAME;
        try {
          await sequelize.query(`ALTER TABLE [employees] DROP COLUMN [${columnName}]`);
          console.log(`   ✅ Removed column '${columnName}'`);
        } catch (err) {
          // Column might be referenced or not exist, skip
          console.log(`   ⚠️  Could not remove '${columnName}': ${err.message}`);
        }
      }
    } else {
      console.log('   ℹ️  Old columns (name, position, salary) do not exist or already removed');
    }

    console.log('\n✅ Employee columns fix completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart your server');
    console.log('   2. Test employee endpoints');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error fixing employee columns:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

fixEmployeeColumns();

