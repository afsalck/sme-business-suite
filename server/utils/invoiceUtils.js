const VAT_RATE = 0.05;

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Calculate invoice totals with support for discounts
 * @param {Array} items - Array of invoice items
 * @param {number} vatRate - VAT rate (default 0.05 for 5%)
 * @param {number} totalDiscount - Total discount amount (optional)
 * @returns {Object} Calculated totals
 */
function calculateInvoiceTotals(items, vatRate = VAT_RATE, totalDiscount = 0) {
  const processedItems = items.map((item) => {
    const quantity = normalizeNumber(item.quantity);
    const unitPrice = normalizeNumber(item.unitPrice || item.price);
    const itemDiscount = normalizeNumber(item.discount || 0);
    const rate = item.vatRate != null ? normalizeNumber(item.vatRate) : vatRate;
    
    // Calculate line total before VAT
    const lineSubtotal = quantity * unitPrice - itemDiscount;
    // Calculate VAT on line total
    const vatAmount = lineSubtotal * rate;
    // Line total including VAT
    const lineTotal = lineSubtotal + vatAmount;
    
    return {
      description: item.description || item.name,
      quantity,
      unitPrice,
      discount: itemDiscount,
      vatRate: rate,
      vatAmount,
      lineTotal
    };
  });

  // Calculate subtotal (sum of all line totals before VAT, minus item discounts)
  const subtotal = processedItems.reduce(
    (sum, item) => sum + (item.quantity * item.unitPrice - item.discount),
    0
  );
  
  // Apply total discount if provided
  const discountedSubtotal = Math.max(0, subtotal - normalizeNumber(totalDiscount));
  
  // Calculate VAT on discounted subtotal
  const vatAmount = discountedSubtotal * vatRate;
  
  // Grand total = discounted subtotal + VAT
  const grandTotal = discountedSubtotal + vatAmount;

  return {
    items: processedItems,
    subtotal,
    totalDiscount: normalizeNumber(totalDiscount),
    discountedSubtotal,
    vatAmount,
    grandTotal
  };
}

module.exports = {
  VAT_RATE,
  calculateInvoiceTotals
};

