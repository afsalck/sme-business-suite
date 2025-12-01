const { sequelize, testConnection } = require('../config/database');
const { QueryTypes } = require('sequelize');

/**
 * Update the status CHECK constraint to include all valid status values
 */
async function updateStatusConstraint() {
  try {
    console.log('🔧 Updating status CHECK constraint...\n');
    
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Cannot connect to SQL Server.');
      process.exit(1);
    }

    // Find the constraint name
    const constraintInfo = await sequelize.query(
      `SELECT 
        cc.CONSTRAINT_NAME,
        cc.CHECK_CLAUSE
      FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
      JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu 
        ON cc.CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
      WHERE ccu.TABLE_NAME = 'invoices' 
        AND ccu.COLUMN_NAME = 'status'`,
      { type: QueryTypes.SELECT }
    );

    if (constraintInfo.length === 0) {
      console.log('⚠️  No CHECK constraint found for status column');
      await sequelize.close();
      process.exit(1);
    }

    const constraintName = constraintInfo[0].CONSTRAINT_NAME;
    console.log(`📋 Found constraint: ${constraintName}`);
    console.log(`   Current: ${constraintInfo[0].CHECK_CLAUSE}\n`);

    // Drop the old constraint
    console.log('🗑️  Dropping old constraint...');
    await sequelize.query(
      `ALTER TABLE invoices DROP CONSTRAINT ${constraintName}`,
      { type: QueryTypes.RAW }
    );
    console.log('   ✅ Old constraint dropped\n');

    // Add new constraint with all valid status values
    console.log('➕ Adding new constraint with all status values...');
    const newConstraint = `ALTER TABLE invoices ADD CONSTRAINT CK_invoices_status 
      CHECK ([status] IN (N'draft', N'sent', N'viewed', N'paid', N'overdue', N'cancelled'))`;
    
    await sequelize.query(newConstraint, { type: QueryTypes.RAW });
    console.log('   ✅ New constraint added');
    console.log('   Valid values: draft, sent, viewed, paid, overdue, cancelled\n');

    console.log('✅ Status constraint updated successfully!');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('   Stack:', error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

updateStatusConstraint();

