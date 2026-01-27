/**
 * VAT Filing Service
 * Handles VAT return preparation, FTA format generation, and submission tracking
 */

const { sequelize } = require('../config/database');
const dayjs = require('dayjs');
const { VatFiling, VatFilingItem } = require('../../models/vatFilingAssociations');
const { getVatSummary, getVatReportData } = require('./vatService');
const { getVatSettings } = require('./vatService');
const { generateFtaXml, generateFtaCsv, saveFtaXmlFile, saveFtaCsvFile } = require('./ftaFormatService');
const Invoice = require('../../models/Invoice');
const VatAdjustment = require('../../models/VatAdjustment');

/**
 * Create a new VAT filing for a period
 */
async function createVatFiling({ periodStartDate, periodEndDate, companyId = 1, createdBy = 'system' }) {
  const transaction = await sequelize.transaction();

  try {
    console.log('[VAT Filing] Creating filing for period:', { periodStartDate, periodEndDate });

    // Check if filing already exists for this period
    const filingPeriod = dayjs(periodStartDate).format('YYYY-MM');
    const existing = await VatFiling.findOne({
      where: {
        companyId,
        filingPeriod
      },
      transaction
    });

    if (existing) {
      throw new Error(`VAT filing already exists for period ${filingPeriod}`);
    }

    // Get VAT summary for the period
    const summary = await getVatSummary({
      from: periodStartDate,
      to: periodEndDate,
      companyId
    }, transaction);

    // Get detailed report data
    const { rows: reportRows } = await getVatReportData({
      from: periodStartDate,
      to: periodEndDate,
      companyId
    }, transaction);

    // Get VAT settings
    const settings = await getVatSettings({ companyId }, transaction);

    // Calculate due date (28th of following month for monthly filing)
    const dueDate = dayjs(periodEndDate).add(1, 'month').date(28).format('YYYY-MM-DD');

    // Create filing record using raw SQL to avoid date issues
    const formattedStartDate = dayjs(periodStartDate).format('YYYY-MM-DD');
    const formattedEndDate = dayjs(periodEndDate).format('YYYY-MM-DD');
    const formattedDueDate = dayjs(dueDate).format('YYYY-MM-DD');
    const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');

    const [filingResult] = await sequelize.query(`
      INSERT INTO [dbo].[vat_filings]
        ([companyId], [filingPeriod], [filingType], [periodStartDate], [periodEndDate], [dueDate], [taxableSales], [zeroRatedSales], [exemptSales], [totalVatCollected], [vatAdjustments], [netVatPayable], [totalInvoices], [status], [createdBy], [createdAt], [updatedAt])
      OUTPUT INSERTED.id, INSERTED.companyId, INSERTED.filingPeriod, INSERTED.filingType, INSERTED.periodStartDate, INSERTED.periodEndDate, INSERTED.dueDate, INSERTED.taxableSales, INSERTED.zeroRatedSales, INSERTED.exemptSales, INSERTED.totalVatCollected, INSERTED.vatAdjustments, INSERTED.netVatPayable, INSERTED.totalInvoices, INSERTED.status, INSERTED.createdBy, INSERTED.createdAt, INSERTED.updatedAt
      VALUES (?, ?, 'monthly', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
    `, {
      replacements: [
        companyId,
        filingPeriod,
        formattedStartDate,
        formattedEndDate,
        formattedDueDate,
        summary.taxableSales || 0,
        summary.zeroRatedSales || 0,
        summary.exemptSales || 0,
        summary.totalVatCollected || 0,
        summary.adjustmentVat || 0,
        summary.netVatPayable || 0,
        summary.totalInvoicesCount || 0,
        createdBy,
        formattedNow,
        formattedNow
      ],
      transaction,
      type: sequelize.QueryTypes.SELECT
    });

    const filingRows = Array.isArray(filingResult) ? filingResult : [filingResult];
    const insertedFiling = filingRows[0];

    if (!insertedFiling || !insertedFiling.id) {
      throw new Error('Failed to create VAT filing - invalid result structure');
    }

    const filingId = insertedFiling.id;

    // Create filing items
    for (const row of reportRows) {
      const formattedInvoiceDate = row.invoiceDate ? dayjs(row.invoiceDate).format('YYYY-MM-DD') : null;
      const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');

      await sequelize.query(`
        INSERT INTO [dbo].[vat_filing_items]
          ([vatFilingId], [invoiceId], [itemType], [invoiceNumber], [invoiceDate], [customerName], [customerTRN], [taxableAmount], [zeroRatedAmount], [exemptAmount], [vatAmount], [totalAmount], [createdAt])
        VALUES (?, ?, 'invoice', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, {
        replacements: [
          filingId,
          null, // invoiceId - would need to lookup
          row.invoiceNumber || '',
          formattedInvoiceDate,
          row.customerName || '',
          row.customerTRN || '',
          row.taxableAmount || 0,
          row.zeroRatedAmount || 0,
          row.exemptAmount || 0,
          row.vatAmount || 0,
          row.totalAmount || 0,
          formattedNow
        ],
        transaction
      });
    }

    await transaction.commit();
    console.log('[VAT Filing] ✓ Filing created with ID:', filingId);

    // Reload filing with items
    const filing = await VatFiling.findByPk(filingId, {
      include: [{
        model: VatFilingItem,
        as: 'items'
      }]
    });

    return filing ? filing.get({ plain: true }) : insertedFiling;
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('[VAT Filing] ✗ Error creating filing:', error);
    throw error;
  }
}

/**
 * Generate FTA format files for a filing
 */
async function generateFtaFiles(filingId, companyId = 1) {
  try {
    console.log('[VAT Filing] Generating FTA files for filing:', filingId);

    const filing = await VatFiling.findByPk(filingId, {
      include: [{
        model: VatFilingItem,
        as: 'items'
      }]
    });

    if (!filing) {
      throw new Error('VAT filing not found');
    }

    if (filing.companyId !== companyId) {
      throw new Error('Unauthorized access to filing');
    }

    // Get company VAT settings
    const settings = await getVatSettings({ companyId });

    if (!settings.trn) {
      throw new Error('Company TRN is required for FTA filing');
    }

    // Prepare filing data
    const filingData = {
      filingPeriod: filing.filingPeriod,
      periodStartDate: filing.periodStartDate,
      periodEndDate: filing.periodEndDate,
      taxableSales: parseFloat(filing.taxableSales || 0),
      zeroRatedSales: parseFloat(filing.zeroRatedSales || 0),
      exemptSales: parseFloat(filing.exemptSales || 0),
      totalVatCollected: parseFloat(filing.totalVatCollected || 0),
      vatAdjustments: parseFloat(filing.vatAdjustments || 0),
      netVatPayable: parseFloat(filing.netVatPayable || 0),
      totalInvoices: filing.totalInvoices || 0,
      items: filing.items ? filing.items.map(item => item.get({ plain: true })) : []
    };

    const companySettings = {
      trn: settings.trn,
      companyName: 'Company Name', // TODO: Get from company settings
      address: '',
      email: '',
      phone: ''
    };

    // Generate XML
    const xmlContent = generateFtaXml(filingData, companySettings);
    const xmlPath = await saveFtaXmlFile(xmlContent, filing.filingPeriod, companyId);

    // Generate CSV (backup format)
    const csvContent = generateFtaCsv(filingData, filingData.items);
    const csvPath = await saveFtaCsvFile(csvContent, filing.filingPeriod, companyId);

    // Update filing with file paths
    const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');
    await sequelize.query(`
      UPDATE [dbo].[vat_filings]
      SET [ftaXmlFile] = ?, [ftaPdfFile] = ?, [updatedAt] = ?
      WHERE [id] = ? AND [companyId] = ?
    `, {
      replacements: [xmlPath, csvPath, formattedNow, filingId, companyId]
    });

    console.log('[VAT Filing] ✓ FTA files generated:', { xmlPath, csvPath });

    return {
      xmlPath,
      csvPath,
      xmlContent,
      csvContent
    };
  } catch (error) {
    console.error('[VAT Filing] ✗ Error generating FTA files:', error);
    throw error;
  }
}

/**
 * Submit VAT filing to FTA (marks as submitted, actual API integration would go here)
 */
async function submitVatFiling(filingId, companyId = 1, submittedBy = 'system') {
  const transaction = await sequelize.transaction();

  try {
    const filing = await VatFiling.findByPk(filingId, { transaction });

    if (!filing) {
      throw new Error('VAT filing not found');
    }

    if (filing.companyId !== companyId) {
      throw new Error('Unauthorized access to filing');
    }

    if (filing.status !== 'draft') {
      throw new Error(`Cannot submit filing with status: ${filing.status}`);
    }

    // Generate FTA files if not already generated
    if (!filing.ftaXmlFile) {
      await generateFtaFiles(filingId, companyId);
    }

    // TODO: Actual FTA API submission would go here
    // For now, we just mark it as submitted
    const formattedSubmittedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const ftaReferenceNumber = `FTA-${dayjs().format('YYYYMMDD')}-${Math.floor(Math.random() * 10000)}`;

    await sequelize.query(`
      UPDATE [dbo].[vat_filings]
      SET [status] = 'submitted', [submittedAt] = ?, [submittedBy] = ?, [ftaReferenceNumber] = ?, [updatedAt] = ?
      WHERE [id] = ? AND [companyId] = ?
    `, {
      replacements: [formattedSubmittedAt, submittedBy, ftaReferenceNumber, formattedNow, filingId, companyId],
      transaction
    });

    await transaction.commit();
    console.log('[VAT Filing] ✓ Filing submitted:', ftaReferenceNumber);

    // Reload filing
    const updatedFiling = await VatFiling.findByPk(filingId, {
      include: [{
        model: VatFilingItem,
        as: 'items'
      }]
    });

    return updatedFiling ? updatedFiling.get({ plain: true }) : filing.get({ plain: true });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('[VAT Filing] ✗ Error submitting filing:', error);
    throw error;
  }
}

/**
 * Get all VAT filings
 */
async function getVatFilings({ companyId = 1, status = null } = {}) {
  const where = { companyId };
  if (status) {
    where.status = status;
  }

  const filings = await VatFiling.findAll({
    where,
    include: [{
      model: VatFilingItem,
      as: 'items'
    }],
    order: [['filingPeriod', 'DESC']]
  });

  return filings.map(f => f.get({ plain: true }));
}

/**
 * Get VAT filing by ID
 */
async function getVatFiling(filingId, companyId = 1) {
  const filing = await VatFiling.findByPk(filingId, {
    include: [{
      model: VatFilingItem,
      as: 'items'
    }]
  });

  if (!filing) {
    throw new Error('VAT filing not found');
  }

  if (filing.companyId !== companyId) {
    throw new Error('Unauthorized access to filing');
  }

  return filing.get({ plain: true });
}

module.exports = {
  createVatFiling,
  generateFtaFiles,
  submitVatFiling,
  getVatFilings,
  getVatFiling
};

