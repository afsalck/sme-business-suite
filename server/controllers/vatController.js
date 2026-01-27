const {
  getVatSettings,
  updateVatSettings,
  computeInvoiceVat,
  getVatSummary,
  exportVatCsv,
  exportVatPdf,
  createVatAdjustment,
  getNextFilingDeadline
} = require('../services/vatService');

async function getSettings(req, res) {
  try {
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const settings = await getVatSettings({ companyId });
    res.json(settings);
  } catch (error) {
    console.error('[VAT] Get settings error:', error);
    res.status(500).json({ message: 'Failed to load VAT settings' });
  }
}

async function updateSettingsHandler(req, res) {
  try {
    console.log('[VAT] Updating settings:', req.body);
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const payload = {
      companyId,
      ...req.body
    };
    const updated = await updateVatSettings(payload);
    console.log('[VAT] Settings updated successfully:', updated.toJSON ? updated.toJSON() : updated);
    res.json(updated);
  } catch (error) {
    console.error('[VAT] Update settings error:', error);
    console.error('[VAT] Error stack:', error.stack);
    res.status(500).json({ 
      message: error.message || 'Failed to update VAT settings',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

async function getSummary(req, res) {
  try {
    const summary = await getVatSummary({
      from: req.query.from,
      to: req.query.to
    });
    res.json(summary);
  } catch (error) {
    console.error('[VAT] Summary error:', error);
    res.status(500).json({ message: 'Failed to compute VAT summary' });
  }
}

async function getReport(req, res) {
  try {
    const params = {
      from: req.query.from,
      to: req.query.to
    };
    const format = (req.query.format || 'csv').toLowerCase();

    console.log('[VAT] Exporting report:', { format, ...params });

    if (format === 'pdf') {
      await exportVatPdf(res, params);
    } else {
      await exportVatCsv(res, params);
    }
  } catch (error) {
    console.error('[VAT] Report export error:', error);
    console.error('[VAT] Error stack:', error.stack);
    
    // If headers already sent, we can't send JSON response
    if (res.headersSent) {
      return res.end();
    }
    
    res.status(500).json({ 
      message: 'Failed to generate VAT report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function computeVatPreview(req, res) {
  try {
    console.log('[VAT] Computing VAT preview:', {
      itemsCount: req.body?.items?.length || 0,
      vatType: req.body?.vatType,
      hasSupplierTRN: !!req.body?.supplierTRN,
      hasCustomerTRN: !!req.body?.customerTRN
    });
    
    const breakdown = await computeInvoiceVat(req.body || {});
    
    console.log('[VAT] VAT computed successfully:', {
      taxableSubtotal: breakdown.taxableSubtotal,
      vatAmount: breakdown.vatAmount,
      totalWithVAT: breakdown.totalWithVAT
    });
    
    res.json(breakdown);
  } catch (error) {
    console.error('[VAT] Compute error:', error);
    console.error('[VAT] Error stack:', error.stack);
    res.status(400).json({ 
      message: error.message || 'Failed to compute VAT',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

async function createAdjustmentHandler(req, res) {
  try {
    const adjustment = await createVatAdjustment(req.body || {}, req.user);
    res.status(201).json(adjustment);
  } catch (error) {
    console.error('[VAT] Adjustment error:', error);
    res.status(400).json({ message: error.message || 'Failed to create VAT adjustment' });
  }
}

async function getFilingDeadline(req, res) {
  try {
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const settings = await getVatSettings({ companyId });
    const deadline = getNextFilingDeadline(settings);
    res.json({ nextFilingDate: deadline });
  } catch (error) {
    console.error('[VAT] Filing deadline error:', error);
    res.status(500).json({ message: 'Failed to compute filing deadline' });
  }
}

module.exports = {
  getSettings,
  updateSettingsHandler,
  getSummary,
  getReport,
  computeVatPreview,
  createAdjustmentHandler,
  getFilingDeadline
};

