const { sequelize, testConnection } = require('../config/database');
const Invoice = require('../../models/Invoice');
const { generateInvoiceNumber } = require('../utils/invoiceNumberGenerator');
const { QueryTypes } = require('sequelize');

/**
 * Update existing invoices that have empty invoiceNumber
 */
async function updateExistingInvoiceNumbers() {
  try {
    console.log('🔧 Updating existing invoice numbers...\n');
    
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Cannot connect to SQL Server.');
      process.exit(1);
    }

    // Find invoices with empty or null invoiceNumber
    const invoices = await Invoice.findAll({
      where: {
        [require('sequelize').Op.or]: [
          { invoiceNumber: '' },
          { invoiceNumber: null },
          { invoiceNumber: { [require('sequelize').Op.like]: '' } }
        ]
      }
    });

    if (invoices.length === 0) {
      console.log('✅ No invoices need updating. All invoices have invoice numbers.');
      await sequelize.close();
      process.exit(0);
    }

    console.log(`📦 Found ${invoices.length} invoice(s) without invoice numbers. Updating...\n`);

    for (const invoice of invoices) {
      try {
        const newInvoiceNumber = await generateInvoiceNumber();
        await invoice.update({ invoiceNumber: newInvoiceNumber });
        console.log(`   ✅ Updated invoice ID ${invoice.id} with number: ${newInvoiceNumber}`);
      } catch (error) {
        console.error(`   ❌ Failed to update invoice ID ${invoice.id}: ${error.message}`);
      }
    }

    console.log('\n✅ Update completed!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('   Stack:', error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

updateExistingInvoiceNumbers();

