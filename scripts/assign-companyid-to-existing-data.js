/**
 * Assign companyId to Existing Data
 * 
 * This script assigns companyId to:
 * 1. Existing users based on email domain
 * 2. Existing invoices, inventory items, and sales (assigns to companyId = 1 by default, or based on creator)
 * 
 * Usage:
 *   node scripts/assign-companyid-to-existing-data.js
 */

const { sequelize } = require('../server/config/database');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const InventoryItem = require('../models/InventoryItem');
const Sale = require('../models/Sale');

// Email domain to companyId mapping (should match authMiddleware.js)
const companyMap = {
  'biz.com': 1,              // Only biz.com → companyId = 1
  // Add more domains as needed
};

// Default companyId for unmapped domains
const DEFAULT_COMPANY_ID = 1;

/**
 * Get companyId from email domain
 * Uses database mappings if available, falls back to hardcoded map
 */
async function getCompanyIdFromEmail(email) {
  if (!email) return DEFAULT_COMPANY_ID;
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return DEFAULT_COMPANY_ID;
  
  try {
    // Try database first (if table exists)
    const CompanyEmailDomain = require('../models/CompanyEmailDomain');
    const mapping = await CompanyEmailDomain.findOne({
      where: {
        emailDomain: domain,
        isActive: true
      },
      attributes: ['companyId']
    });
    
    if (mapping) {
      return mapping.companyId;
    }
  } catch (error) {
    // Table might not exist yet, fall back to hardcoded map
    console.log(`[Assignment Script] Using hardcoded mapping for ${domain} (database table not available)`);
  }
  
  // Fallback to hardcoded map
  return companyMap[domain] || DEFAULT_COMPANY_ID;
}

async function assignCompanyIdToUsers() {
  console.log('\n📋 Step 1: Assigning companyId to existing users...');
  
  try {
    const users = await User.findAll({
      where: {
        companyId: 1 // Get all users (assuming default is 1, or use NULL if needed)
      }
    });
    
    console.log(`Found ${users.length} users to process`);
    
    let updated = 0;
    for (const user of users) {
      const email = user.email;
      const currentCompanyId = user.companyId || DEFAULT_COMPANY_ID;
      const newCompanyId = await getCompanyIdFromEmail(email);
      
      if (currentCompanyId !== newCompanyId) {
        await user.update({ companyId: newCompanyId });
        console.log(`  ✅ Updated ${email}: companyId ${currentCompanyId} → ${newCompanyId}`);
        updated++;
      } else {
        console.log(`  ⏭️  Skipped ${email}: already has companyId ${currentCompanyId}`);
      }
    }
    
    console.log(`✅ Updated ${updated} users`);
    return { success: true, updated };
  } catch (error) {
    console.error('❌ Error assigning companyId to users:', error.message);
    return { success: false, error: error.message };
  }
}

async function assignCompanyIdToInvoices() {
  console.log('\n📋 Step 2: Assigning companyId to existing invoices...');
  
  try {
    // Get all invoices
    const invoices = await Invoice.findAll({
      where: {
        companyId: 1 // Get all invoices with default companyId
      }
    });
    
    console.log(`Found ${invoices.length} invoices to process`);
    
    let updated = 0;
    let assignedByCreator = 0;
    let assignedDefault = 0;
    
    for (const invoice of invoices) {
      let newCompanyId = DEFAULT_COMPANY_ID;
      
      // Try to get companyId from creator's email
      if (invoice.createdByEmail) {
        const creatorCompanyId = await getCompanyIdFromEmail(invoice.createdByEmail);
        if (creatorCompanyId !== DEFAULT_COMPANY_ID) {
          newCompanyId = creatorCompanyId;
          assignedByCreator++;
        } else {
          assignedDefault++;
        }
      } else {
        assignedDefault++;
      }
      
      if (invoice.companyId !== newCompanyId) {
        // Use raw SQL to avoid date conversion issues
        await sequelize.query(
          `UPDATE invoices SET companyId = :companyId WHERE id = :id`,
          {
            replacements: { companyId: newCompanyId, id: invoice.id },
            type: sequelize.QueryTypes.UPDATE
          }
        );
        console.log(`  ✅ Updated Invoice ${invoice.invoiceNumber}: companyId ${invoice.companyId} → ${newCompanyId}`);
        updated++;
      }
    }
    
    console.log(`✅ Updated ${updated} invoices`);
    console.log(`   - ${assignedByCreator} assigned based on creator email`);
    console.log(`   - ${assignedDefault} assigned default companyId (${DEFAULT_COMPANY_ID})`);
    
    return { success: true, updated, assignedByCreator, assignedDefault };
  } catch (error) {
    console.error('❌ Error assigning companyId to invoices:', error.message);
    return { success: false, error: error.message };
  }
}

async function assignCompanyIdToInventoryItems() {
  console.log('\n📋 Step 3: Assigning companyId to existing inventory items...');
  
  try {
    const items = await InventoryItem.findAll({
      where: {
        companyId: 1 // Get all items with default companyId
      }
    });
    
    console.log(`Found ${items.length} inventory items to process`);
    
    let updated = 0;
    let assignedByCreator = 0;
    let assignedDefault = 0;
    
    for (const item of items) {
      let newCompanyId = DEFAULT_COMPANY_ID;
      
      // Try to get companyId from creator's email
      if (item.createdByEmail) {
        const creatorCompanyId = await getCompanyIdFromEmail(item.createdByEmail);
        if (creatorCompanyId !== DEFAULT_COMPANY_ID) {
          newCompanyId = creatorCompanyId;
          assignedByCreator++;
        } else {
          assignedDefault++;
        }
      } else {
        assignedDefault++;
      }
      
      if (item.companyId !== newCompanyId) {
        await item.update({ companyId: newCompanyId });
        console.log(`  ✅ Updated Item ${item.name} (ID: ${item.id}): companyId ${item.companyId} → ${newCompanyId}`);
        updated++;
      }
    }
    
    console.log(`✅ Updated ${updated} inventory items`);
    console.log(`   - ${assignedByCreator} assigned based on creator email`);
    console.log(`   - ${assignedDefault} assigned default companyId (${DEFAULT_COMPANY_ID})`);
    
    return { success: true, updated, assignedByCreator, assignedDefault };
  } catch (error) {
    console.error('❌ Error assigning companyId to inventory items:', error.message);
    return { success: false, error: error.message };
  }
}

async function assignCompanyIdToSales() {
  console.log('\n📋 Step 4: Assigning companyId to existing sales...');
  
  try {
    const sales = await Sale.findAll({
      where: {
        companyId: 1 // Get all sales with default companyId
      }
    });
    
    console.log(`Found ${sales.length} sales to process`);
    
    let updated = 0;
    let assignedByCreator = 0;
    let assignedDefault = 0;
    
    for (const sale of sales) {
      let newCompanyId = DEFAULT_COMPANY_ID;
      
      // Try to get companyId from creator's email
      if (sale.createdByEmail) {
        const creatorCompanyId = await getCompanyIdFromEmail(sale.createdByEmail);
        if (creatorCompanyId !== DEFAULT_COMPANY_ID) {
          newCompanyId = creatorCompanyId;
          assignedByCreator++;
        } else {
          assignedDefault++;
        }
      } else {
        assignedDefault++;
      }
      
      if (sale.companyId !== newCompanyId) {
        await sale.update({ companyId: newCompanyId });
        console.log(`  ✅ Updated Sale ID ${sale.id}: companyId ${sale.companyId} → ${newCompanyId}`);
        updated++;
      }
    }
    
    console.log(`✅ Updated ${updated} sales`);
    console.log(`   - ${assignedByCreator} assigned based on creator email`);
    console.log(`   - ${assignedDefault} assigned default companyId (${DEFAULT_COMPANY_ID})`);
    
    return { success: true, updated, assignedByCreator, assignedDefault };
  } catch (error) {
    console.error('❌ Error assigning companyId to sales:', error.message);
    return { success: false, error: error.message };
  }
}

async function showSummary() {
  console.log('\n📊 Data Summary by Company:');
  
  try {
    // Count users by companyId
    const userCounts = await sequelize.query(`
      SELECT companyId, COUNT(*) as count
      FROM users
      GROUP BY companyId
      ORDER BY companyId
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('\n👥 Users by Company:');
    for (const row of userCounts) {
      console.log(`   Company ${row.companyId}: ${row.count} users`);
    }
    
    // Count invoices by companyId
    const invoiceCounts = await sequelize.query(`
      SELECT companyId, COUNT(*) as count
      FROM invoices
      GROUP BY companyId
      ORDER BY companyId
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('\n📄 Invoices by Company:');
    for (const row of invoiceCounts) {
      console.log(`   Company ${row.companyId}: ${row.count} invoices`);
    }
    
    // Count inventory items by companyId
    const itemCounts = await sequelize.query(`
      SELECT companyId, COUNT(*) as count
      FROM inventoryItems
      GROUP BY companyId
      ORDER BY companyId
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('\n📦 Inventory Items by Company:');
    for (const row of itemCounts) {
      console.log(`   Company ${row.companyId}: ${row.count} items`);
    }
    
    // Count sales by companyId
    const saleCounts = await sequelize.query(`
      SELECT companyId, COUNT(*) as count
      FROM sales
      GROUP BY companyId
      ORDER BY companyId
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('\n💰 Sales by Company:');
    for (const row of saleCounts) {
      console.log(`   Company ${row.companyId}: ${row.count} sales`);
    }
    
  } catch (error) {
    console.error('❌ Error generating summary:', error.message);
  }
}

async function main() {
  console.log('🔄 Starting companyId assignment for existing data...');
  console.log('='.repeat(60));
  
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
  
  console.log('\n📝 Email Domain Mapping:');
  for (const [domain, companyId] of Object.entries(companyMap)) {
    console.log(`   ${domain} → companyId ${companyId}`);
  }
  console.log(`   (default) → companyId ${DEFAULT_COMPANY_ID}`);
  
  // Step 1: Assign companyId to users
  const usersResult = await assignCompanyIdToUsers();
  if (!usersResult.success) {
    console.error('❌ Failed to assign companyId to users');
    process.exit(1);
  }
  
  // Step 2: Assign companyId to invoices
  const invoicesResult = await assignCompanyIdToInvoices();
  if (!invoicesResult.success) {
    console.error('❌ Failed to assign companyId to invoices');
    process.exit(1);
  }
  
  // Step 3: Assign companyId to inventory items
  const itemsResult = await assignCompanyIdToInventoryItems();
  if (!itemsResult.success) {
    console.error('❌ Failed to assign companyId to inventory items');
    process.exit(1);
  }
  
  // Step 4: Assign companyId to sales
  const salesResult = await assignCompanyIdToSales();
  if (!salesResult.success) {
    console.error('❌ Failed to assign companyId to sales');
    process.exit(1);
  }
  
  // Show summary
  await showSummary();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ CompanyId assignment completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Verify the data summary above');
  console.log('2. Login as different users and verify they see their data');
  console.log('3. If data is assigned to wrong company, you can manually update:');
  console.log('   UPDATE invoices SET companyId = 2 WHERE id IN (...);');
  console.log('='.repeat(60));
  
  process.exit(0);
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

