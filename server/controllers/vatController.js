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
    const settings = await getVatSettings({ companyId: 1 });
    res.json(settings);
  } catch (error) {
    console.error('[VAT] Get settings error:', error);
    res.status(500).json({ message: 'Failed to load VAT settings' });
  }
}

async function updateSettingsHandler(req, res) {
  try {
    const updated = await updateVatSettings(req.body || {});
    res.json(updated);
  } catch (error) {
    console.error('[VAT] Update settings error:', error);
    res.status(500).json({ message: error.message || 'Failed to update VAT settings' });
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

    if (format === 'pdf') {
      await exportVatPdf(res, params);
    } else {
      await exportVatCsv(res, params);
    }
  } catch (error) {
    console.error('[VAT] Report export error:', error);
    res.status(500).json({ message: 'Failed to generate VAT report' });
  }
}

async function computeVatPreview(req, res) {
  try {
    const breakdown = await computeInvoiceVat(req.body || {});
    res.json(breakdown);
  } catch (error) {
    console.error('[VAT] Compute error:', error);
    res.status(400).json({ message: error.message || 'Failed to compute VAT' });
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
    const settings = await getVatSettings({ companyId: 1 });
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

