const Invoice = require("../../models/Invoice");
const { Op } = require("sequelize");
const dayjs = require("dayjs");

/**
 * Generate unique invoice number in format: INV-YYYY-XXXX
 * Where YYYY is the year and XXXX is a sequential number
 */
async function generateInvoiceNumber() {
  const currentYear = dayjs().format("YYYY");
  const prefix = `INV-${currentYear}-`;

  try {
    // Find the latest invoice for this year
    const latestInvoice = await Invoice.findOne({
      where: {
        invoiceNumber: {
          [Op.like]: `${prefix}%`
        }
      },
      order: [["createdAt", "DESC"]],
      raw: true
    });

    let sequenceNumber = 1;

    if (latestInvoice && latestInvoice.invoiceNumber) {
      // Extract the sequence number from the latest invoice
      const match = latestInvoice.invoiceNumber.match(/-(\d+)$/);
      if (match) {
        sequenceNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Format sequence number with leading zeros (4 digits)
    const formattedSequence = sequenceNumber.toString().padStart(4, "0");
    return `${prefix}${formattedSequence}`;
  } catch (error) {
    console.error("[Invoice Number] Error generating invoice number:", error);
    // Fallback: use timestamp-based number
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}${timestamp}`;
  }
}

module.exports = { generateInvoiceNumber };

