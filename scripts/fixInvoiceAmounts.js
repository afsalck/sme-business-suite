/**
 * Script to fix invoice paidAmount and outstandingAmount for all existing invoices
 * This recalculates amounts based on actual payment statuses (excluding cancelled/failed/refunded)
 */

const { sequelize } = require('../server/config/database');
const { recalculateInvoiceAmounts } = require('../server/services/paymentService');

async function fixAllInvoices() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Get all invoices
    const invoices = await sequelize.query(`
      SELECT [id], [invoiceNumber], [totalWithVAT], [paidAmount], [outstandingAmount]
      FROM [dbo].[invoices]
      ORDER BY [id]
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    console.log(`📋 Found ${invoices.length} invoices to process\n`);

    let fixed = 0;
    let errors = 0;

    for (const invoice of invoices) {
      try {
        console.log(`Processing Invoice ${invoice.id} (${invoice.invoiceNumber})...`);
        console.log(`  Current: paidAmount=${invoice.paidAmount}, outstandingAmount=${invoice.outstandingAmount}`);

        // Recalculate amounts
        const result = await recalculateInvoiceAmounts({
          invoiceId: invoice.id
        });

        console.log(`  Updated: paidAmount=${result.paidAmount}, outstandingAmount=${result.outstandingAmount}`);

        // Check if values changed
        const paidChanged = parseFloat(invoice.paidAmount || 0) !== parseFloat(result.paidAmount);
        const outstandingChanged = parseFloat(invoice.outstandingAmount || 0) !== parseFloat(result.outstandingAmount);

        if (paidChanged || outstandingChanged) {
          console.log(`  ✅ Fixed! (paidAmount ${paidChanged ? 'changed' : 'unchanged'}, outstandingAmount ${outstandingChanged ? 'changed' : 'unchanged'})\n`);
          fixed++;
        } else {
          console.log(`  ✓ Already correct\n`);
        }
      } catch (error) {
        console.error(`  ✗ Error processing invoice ${invoice.id}:`, error.message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Script completed!`);
    console.log(`   Total invoices: ${invoices.length}`);
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Already correct: ${invoices.length - fixed - errors}`);
    console.log(`   Errors: ${errors}`);
    console.log('='.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
fixAllInvoices();

