/**
 * Clear Test Data Before Production Deployment
 * 
 * This script removes test data from the database before production deployment.
 * 
 * ⚠️ WARNING: This script will DELETE data. Always backup your database first!
 * 
 * Usage:
 *   node scripts/clear-test-data.js
 * 
 * Options:
 *   --company-id=1     Clear data for specific company ID (default: 1)
 *   --keep-inventory   Keep inventory items (only clear sales)
 *   --dry-run          Show what would be deleted without actually deleting
 */

const { sequelize } = require('../server/config/database');
const Sale = require('../models/Sale');
const InventoryItem = require('../models/InventoryItem');
const User = require('../models/User');

// Parse command line arguments
const args = process.argv.slice(2);
const companyId = parseInt(args.find(arg => arg.startsWith('--company-id='))?.split('=')[1] || '1');
const keepInventory = args.includes('--keep-inventory');
const dryRun = args.includes('--dry-run');

async function clearTestData() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No data will be deleted\n');
    } else {
      console.log('⚠️  WARNING: This will DELETE data from the database!');
      console.log(`   Company ID: ${companyId}`);
      console.log(`   Keep Inventory: ${keepInventory ? 'Yes' : 'No'}\n`);
    }

    // Count existing data
    const salesCount = await Sale.count({ where: { companyId } });
    const inventoryCount = await InventoryItem.count({ where: { companyId } });
    const testUsersCount = await User.count({
      where: {
        email: {
          [sequelize.Op.like]: '%test%'
        }
      }
    });

    console.log('📊 Current Data Count:');
    console.log(`   Sales: ${salesCount}`);
    console.log(`   Inventory Items: ${inventoryCount}`);
    console.log(`   Test Users (emails with "test"): ${testUsersCount}\n`);

    if (dryRun) {
      console.log('🔍 Would delete:');
      console.log(`   ${salesCount} sales`);
      if (!keepInventory) {
        console.log(`   ${inventoryCount} inventory items`);
      }
      console.log(`   ${testUsersCount} test users`);
      console.log('\n✅ Dry run complete. Use without --dry-run to actually delete.');
      return;
    }

    // Start transaction for safety
    const transaction = await sequelize.transaction();

    try {
      // Clear test sales
      console.log('🗑️  Deleting test sales...');
      const deletedSales = await Sale.destroy({
        where: { companyId },
        transaction
      });
      console.log(`   ✅ Deleted ${deletedSales} sales`);

      // Clear test inventory (if not keeping)
      if (!keepInventory) {
        console.log('🗑️  Deleting test inventory items...');
        const deletedItems = await InventoryItem.destroy({
          where: { companyId },
          transaction
        });
        console.log(`   ✅ Deleted ${deletedItems} inventory items`);
      } else {
        console.log('ℹ️  Keeping inventory items (--keep-inventory flag set)');
      }

      // Clear test users (be careful - this might delete important users!)
      console.log('🗑️  Checking for test users...');
      const deletedUsers = await User.destroy({
        where: {
          email: {
            [sequelize.Op.like]: '%test%'
          }
        },
        transaction
      });
      if (deletedUsers > 0) {
        console.log(`   ⚠️  Deleted ${deletedUsers} test users (emails containing "test")`);
        console.log('   ⚠️  Make sure your admin account was not deleted!');
      } else {
        console.log('   ℹ️  No test users found to delete');
      }

      // Commit transaction
      await transaction.commit();
      
      console.log('\n✅ Test data cleared successfully!');
      console.log('\n📋 Next steps:');
      console.log('   1. Verify your admin account still exists');
      console.log('   2. Test the application to ensure everything works');
      console.log('   3. Proceed with deployment');
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error clearing test data:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Confirm before running (unless dry-run)
if (!dryRun) {
  console.log('⚠️  WARNING: This script will DELETE data from your database!');
  console.log('   Make sure you have a backup before proceeding.\n');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  setTimeout(() => {
    clearTestData();
  }, 5000);
} else {
  clearTestData();
}
