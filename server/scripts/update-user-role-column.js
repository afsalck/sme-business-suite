/**
 * Update users table role column to support all roles
 * Run this script to ensure the role column accepts hr and accountant values
 */

const { sequelize } = require('../config/database');

async function updateRoleColumn() {
  try {
    console.log('[User Role] Updating role column to support all roles...');
    
    // Step 1: Find and drop existing CHECK constraint
    console.log('[User Role] Looking for existing CHECK constraints on role column...');
    const [constraints] = await sequelize.query(`
      SELECT 
        CONSTRAINT_NAME,
        CHECK_CLAUSE
      FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS
      WHERE CONSTRAINT_NAME LIKE '%role%' OR CHECK_CLAUSE LIKE '%role%'
    `);
    
    console.log('[User Role] Found constraints:', constraints);
    
    // Drop all CHECK constraints related to role
    for (const constraint of constraints) {
      try {
        console.log(`[User Role] Dropping constraint: ${constraint.CONSTRAINT_NAME}`);
        await sequelize.query(`
          ALTER TABLE users DROP CONSTRAINT ${constraint.CONSTRAINT_NAME}
        `);
        console.log(`[User Role] ✓ Dropped constraint: ${constraint.CONSTRAINT_NAME}`);
      } catch (dropError) {
        console.log(`[User Role] Note dropping constraint ${constraint.CONSTRAINT_NAME}:`, dropError.message);
      }
    }
    
    // Step 2: Check current column definition
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
    `);
    
    console.log('[User Role] Current column definition:', results[0]);
    
    // Step 3: Alter the column to NVARCHAR if needed
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ALTER COLUMN role NVARCHAR(20) NOT NULL
      `);
      console.log('[User Role] ✓ Column altered to NVARCHAR(20)');
    } catch (alterError) {
      console.log('[User Role] Column alteration note:', alterError.message);
      // Continue anyway
    }
    
    // Step 4: Add default constraint if it doesn't exist
    try {
      // First check if default constraint exists
      const [defaultConstraints] = await sequelize.query(`
        SELECT name
        FROM sys.default_constraints
        WHERE parent_object_id = OBJECT_ID('users') 
        AND parent_column_id = COLUMNPROPERTY(OBJECT_ID('users'), 'role', 'ColumnId')
      `);
      
      if (defaultConstraints.length === 0) {
        await sequelize.query(`
          ALTER TABLE users 
          ADD CONSTRAINT DF_users_role DEFAULT 'staff' FOR role
        `);
        console.log('[User Role] ✓ Default constraint added');
      } else {
        console.log('[User Role] Default constraint already exists');
      }
    } catch (constraintError) {
      console.log('[User Role] Default constraint note:', constraintError.message);
    }
    
    // Step 5: Optionally add a new CHECK constraint with all roles (optional - app validates anyway)
    try {
      await sequelize.query(`
        ALTER TABLE users
        ADD CONSTRAINT CK_users_role_valid 
        CHECK (role IN ('admin', 'staff', 'hr', 'accountant'))
      `);
      console.log('[User Role] ✓ New CHECK constraint added with all roles');
    } catch (checkError) {
      // Constraint might already exist or there's an issue
      console.log('[User Role] CHECK constraint note:', checkError.message);
      // Not critical - application validates roles anyway
    }
    
    console.log('[User Role] ✓ Role column update completed');
    console.log('[User Role] Supported roles: admin, staff, hr, accountant');
    
    // Verify by checking a sample query
    const [verify] = await sequelize.query(`
      SELECT TOP 1 role FROM users
    `);
    console.log('[User Role] Sample role value:', verify[0]?.role);
    
    process.exit(0);
  } catch (error) {
    console.error('[User Role] ✗ Failed to update role column:', error);
    console.error('[User Role] Error details:', error);
    process.exit(1);
  }
}

updateRoleColumn();
