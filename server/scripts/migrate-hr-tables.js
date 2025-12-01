const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

async function migrateHRTables() {
  try {
    console.log('🔧 Migrating HR tables (contracts, leaveRequests)...\n');
    await sequelize.authenticate();
    console.log('✅ SQL Server connection established successfully.');

    const queryInterface = sequelize.getQueryInterface();

    // Check if contracts table exists
    const [contractsTable] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
      AND TABLE_NAME = 'contracts'
    `);

    if (!contractsTable || contractsTable.length === 0) {
      console.log('📦 Creating contracts table...');
      await queryInterface.createTable('contracts', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        contractNumber: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true
        },
        employeeId: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        contractType: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'full-time'
        },
        startDate: {
          type: DataTypes.DATE,
          allowNull: false
        },
        endDate: {
          type: DataTypes.DATE,
          allowNull: true
        },
        basicSalary: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        allowance: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0
        },
        designation: {
          type: DataTypes.STRING,
          allowNull: false
        },
        terms: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        pdfUrl: {
          type: DataTypes.STRING,
          allowNull: true
        },
        status: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'draft'
        },
        createdByUid: {
          type: DataTypes.STRING,
          allowNull: false
        },
        createdByDisplayName: {
          type: DataTypes.STRING,
          allowNull: true
        },
        createdByEmail: {
          type: DataTypes.STRING,
          allowNull: true
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        }
      });
      console.log('   ✅ Created contracts table');
    } else {
      console.log('   ℹ️  contracts table already exists');
    }

    // Check if leaveRequests table exists
    const [leaveRequestsTable] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
      AND TABLE_NAME = 'leaveRequests'
    `);

    if (!leaveRequestsTable || leaveRequestsTable.length === 0) {
      console.log('📦 Creating leaveRequests table...');
      await queryInterface.createTable('leaveRequests', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        employeeId: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        leaveType: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'annual'
        },
        startDate: {
          type: DataTypes.DATE,
          allowNull: false
        },
        endDate: {
          type: DataTypes.DATE,
          allowNull: false
        },
        totalDays: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        reason: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        status: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'pending'
        },
        approvedBy: {
          type: DataTypes.STRING,
          allowNull: true
        },
        approvedAt: {
          type: DataTypes.DATE,
          allowNull: true
        },
        rejectionReason: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        createdByUid: {
          type: DataTypes.STRING,
          allowNull: false
        },
        createdByDisplayName: {
          type: DataTypes.STRING,
          allowNull: true
        },
        createdByEmail: {
          type: DataTypes.STRING,
          allowNull: true
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        }
      });
      console.log('   ✅ Created leaveRequests table');
    } else {
      console.log('   ℹ️  leaveRequests table already exists');
    }

    // Update employees table with new HR fields if needed
    console.log('\n📦 Checking employees table for HR fields...');
    const columns = await queryInterface.describeTable('employees');

    const newFields = {
      fullName: { type: DataTypes.STRING, allowNull: true },
      nationality: { type: DataTypes.STRING, allowNull: true },
      emiratesId: { type: DataTypes.STRING, allowNull: true },
      passportNumber: { type: DataTypes.STRING, allowNull: true },
      insuranceExpiry: { type: DataTypes.DATE, allowNull: true },
      visaStatus: { type: DataTypes.STRING, allowNull: true, defaultValue: 'active' },
      insuranceStatus: { type: DataTypes.STRING, allowNull: true, defaultValue: 'active' },
      designation: { type: DataTypes.STRING, allowNull: true },
      contractType: { type: DataTypes.STRING, allowNull: true, defaultValue: 'full-time' },
      basicSalary: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
      allowance: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
      joiningDate: { type: DataTypes.DATE, allowNull: true },
      passportUrl: { type: DataTypes.STRING, allowNull: true },
      emiratesIdUrl: { type: DataTypes.STRING, allowNull: true },
      visaUrl: { type: DataTypes.STRING, allowNull: true },
      insuranceUrl: { type: DataTypes.STRING, allowNull: true }
    };

    for (const [fieldName, fieldConfig] of Object.entries(newFields)) {
      if (!columns[fieldName]) {
        await queryInterface.addColumn('employees', fieldName, fieldConfig);
        console.log(`   ✅ Added column '${fieldName}'`);
      }
    }

    // Migrate existing data: if name exists but fullName doesn't, copy it
    if (columns.name && !columns.fullName) {
      await sequelize.query(`
        UPDATE employees 
        SET fullName = name 
        WHERE fullName IS NULL
      `);
      console.log('   ✅ Migrated name to fullName');
    }

    if (columns.position && !columns.designation) {
      await sequelize.query(`
        UPDATE employees 
        SET designation = position 
        WHERE designation IS NULL
      `);
      console.log('   ✅ Migrated position to designation');
    }

    if (columns.salary && (!columns.basicSalary || !columns.allowance)) {
      await sequelize.query(`
        UPDATE employees 
        SET basicSalary = salary 
        WHERE basicSalary IS NULL OR basicSalary = 0
      `);
      console.log('   ✅ Migrated salary to basicSalary');
    }

    console.log('\n✅ HR migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Install multer: npm install multer');
    console.log('   2. Restart your server');
    console.log('   3. Test HR endpoints');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error migrating HR tables:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

migrateHRTables();

