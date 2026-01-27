const { Op, fn, col, literal, Transaction } = require('sequelize');
const dayjs = require('dayjs');
const { sequelize } = require('../config/database');
const Invoice = require('../../models/Invoice');
const CompanyVatSettings = require('../../models/CompanyVatSettings');
const VatAdjustment = require('../../models/VatAdjustment');

const VAT_RATE = 0.05;

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Bankers rounding (round half to even) for compliance with UAE FTA guidance.
 */
function bankersRound(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  const scaled = value * factor;
  const integer = Math.floor(scaled);
  const fraction = scaled - integer;

  if (Math.abs(fraction - 0.5) < Number.EPSILON) {
    // Halfway case – round to even
    return (integer % 2 === 0 ? integer : integer + 1) / factor;
  }

  return Math.round(scaled) / factor;
}

async function getVatSettings(options = {}, transaction = null) {
  const companyId = options.companyId || 1;
  
  let settings = await CompanyVatSettings.findByPk(
    companyId,
    { 
      rejectOnEmpty: false,
      transaction
    }
  );

  if (!settings) {
    // Create default settings if they don't exist
    settings = await CompanyVatSettings.create({
      companyId,
      trn: null,
      vatEnabled: false,
      filingFrequency: 'monthly',
      filingDay: 28
    }, { transaction });
  }
  
  return settings;
}

async function updateVatSettings(payload) {
  try {
    const companyId = payload.companyId || 1;
    
    // Ensure settings exist
    const [settings, created] = await CompanyVatSettings.findOrCreate({
      where: { companyId },
      defaults: {
        trn: payload.trn || null,
        vatEnabled: Boolean(payload.vatEnabled),
        filingFrequency: payload.filingFrequency || 'monthly',
        filingDay: payload.filingDay || 28
      }
    });

    // Use raw SQL to avoid timezone issues with updatedAt (SQL Server datetime doesn't accept timezone)
    const setClauses = [];
    
    if (payload.trn !== undefined) {
      setClauses.push(`trn = ${payload.trn ? `N'${payload.trn.replace(/'/g, "''")}'` : 'NULL'}`);
    }
    if (payload.vatEnabled !== undefined) {
      setClauses.push(`vatEnabled = ${Boolean(payload.vatEnabled) ? 1 : 0}`);
    }
    if (payload.filingFrequency) {
      setClauses.push(`filingFrequency = N'${payload.filingFrequency.replace(/'/g, "''")}'`);
    }
    if (payload.filingDay !== undefined) {
      setClauses.push(`filingDay = ${payload.filingDay}`);
    }
    if (payload.lastFiledAt) {
      const lastFiledAtFormatted = dayjs(payload.lastFiledAt).format('YYYY-MM-DD HH:mm:ss');
      setClauses.push(`lastFiledAt = '${lastFiledAtFormatted}'`);
    }

    // Always update updatedAt with properly formatted date (no timezone)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    setClauses.push(`updatedAt = '${now}'`);

    if (setClauses.length > 0) {
      const sql = `
        UPDATE company_vat_settings
        SET ${setClauses.join(', ')}
        WHERE companyId = ${companyId}
      `;
      
      await sequelize.query(sql, {
        type: sequelize.QueryTypes.UPDATE
      });
    }

    // Reload settings to return updated values
    await settings.reload();
    console.log('[VAT] Settings saved:', settings.toJSON ? settings.toJSON() : settings);
    return settings;
  } catch (error) {
    console.error('[VAT] updateVatSettings error:', error);
    throw error;
  }
}

/**
 * Compute VAT breakdown for an invoice payload (no DB writes).
 */
async function computeInvoiceVat(invoicePayload, settings) {
  const vatSettings = settings || await getVatSettings({ companyId: 1 });
  const items = invoicePayload.items || [];
  const invoiceVatType = (invoicePayload.vatType || 'standard').toLowerCase();

  let taxableSubtotal = 0;
  let zeroRatedSubtotal = 0;
  let exemptSubtotal = 0;
  let discountTotal = normalizeNumber(invoicePayload.totalDiscount || invoicePayload.discount || 0);

  const computedItems = items.map((item) => {
    const quantity = normalizeNumber(item.quantity, 1);
    const unitPrice = normalizeNumber(item.unitPrice ?? item.price, 0);
    const lineDiscount = normalizeNumber(item.discount, 0);
    const lineSubtotal = quantity * unitPrice - lineDiscount;
    const lineVatType = (item.vatType || invoiceVatType).toLowerCase();

    let lineVatAmount = 0;
    if (lineVatType === 'standard') {
      lineVatAmount = bankersRound(lineSubtotal * VAT_RATE);
      taxableSubtotal += lineSubtotal;
    } else if (lineVatType === 'zero') {
      zeroRatedSubtotal += lineSubtotal;
    } else {
      exemptSubtotal += lineSubtotal;
    }

    return {
      ...item,
      quantity,
      unitPrice,
      vatType: lineVatType,
      vatAmount: lineVatAmount,
      lineSubtotal,
      lineTotal: lineSubtotal + lineVatAmount
    };
  });

  const taxableAfterDiscount = Math.max(0, taxableSubtotal - discountTotal);
  const vatAmount = bankersRound(taxableAfterDiscount * VAT_RATE);
  const subtotal = taxableSubtotal + zeroRatedSubtotal + exemptSubtotal;
  const totalWithVAT = subtotal - discountTotal + vatAmount;

  if (
    vatSettings.vatEnabled &&
    taxableSubtotal > 0 &&
    (!invoicePayload.supplierTRN || invoicePayload.supplierTRN.trim() === '')
  ) {
    throw new Error("Supplier TRN is required for standard-rated invoices when VAT is enabled.");
  }

  return {
    items: computedItems,
    taxableSubtotal: bankersRound(taxableSubtotal),
    zeroRatedSubtotal: bankersRound(zeroRatedSubtotal),
    exemptSubtotal: bankersRound(exemptSubtotal),
    subtotal: bankersRound(subtotal),
    discountTotal: bankersRound(discountTotal),
    vatAmount,
    totalWithVAT: bankersRound(totalWithVAT),
    vatType: invoiceVatType
  };
}

async function getVatSummary({ from, to, companyId }, transaction = null) {
  // Use raw SQL to avoid timezone issues with SQL Server datetime
  let sql = `
    SELECT 
      id, invoiceNumber, customerName, customerTRN, vatType,
      taxableSubtotal, zeroRatedSubtotal, exemptSubtotal, discountTotal,
      vatAmount, totalWithVAT
    FROM invoices
    WHERE 1=1
  `;
  const replacements = [];
  
  // Filter by companyId if provided (multi-tenancy)
  if (companyId) {
    sql += ' AND companyId = ?';
    replacements.push(companyId);
  }
  
  if (from) {
    const fromDate = dayjs(from).startOf('day').format('YYYY-MM-DD HH:mm:ss');
    sql += ' AND issueDate >= ?';
    replacements.push(fromDate);
  }
  if (to) {
    const toDate = dayjs(to).endOf('day').format('YYYY-MM-DD HH:mm:ss');
    sql += ' AND issueDate <= ?';
    replacements.push(toDate);
  }

  const invoices = await sequelize.query(sql, {
    replacements,
    type: sequelize.QueryTypes.SELECT,
    transaction
  });

  let taxableSales = 0;
  let zeroRatedSales = 0;
  let exemptSales = 0;
  let totalVatCollected = 0;

  invoices.forEach((inv) => {
    taxableSales += normalizeNumber(inv.taxableSubtotal || 0);
    zeroRatedSales += normalizeNumber(inv.zeroRatedSubtotal || 0);
    exemptSales += normalizeNumber(inv.exemptSubtotal || 0);
    totalVatCollected += normalizeNumber(inv.vatAmount || 0);
  });

  const adjustmentWhere = {};
  if (companyId) {
    adjustmentWhere.companyId = companyId;
  }
  
  const adjustments = await VatAdjustment.findAll({
    where: adjustmentWhere,
    attributes: [
      [fn('SUM', col('vatImpact')), 'vatImpact']
    ],
    raw: true,
    transaction
  });
  const adjustmentVat = normalizeNumber(adjustments[0]?.vatImpact || 0);
  const netVatPayable = bankersRound(totalVatCollected + adjustmentVat);

  return {
    totalInvoicesCount: invoices.length,
    taxableSales: bankersRound(taxableSales),
    zeroRatedSales: bankersRound(zeroRatedSales),
    exemptSales: bankersRound(exemptSales),
    totalVatCollected: bankersRound(totalVatCollected),
    adjustmentVat: bankersRound(adjustmentVat),
    netVatPayable
  };
}

/**
 * Get VAT report data within a transaction for consistency.
 * Ensures data snapshot is consistent even if invoices change during export.
 */
async function getVatReportData({ from, to, companyId }, transaction = null) {
  // Use raw SQL to avoid timezone issues with SQL Server datetime
  let sql = 'SELECT * FROM invoices WHERE 1=1';
  const replacements = [];
  
  // Filter by companyId if provided (multi-tenancy)
  if (companyId) {
    sql += ' AND companyId = ?';
    replacements.push(companyId);
  }
  
  if (from) {
    const fromDate = dayjs(from).startOf('day').format('YYYY-MM-DD HH:mm:ss');
    sql += ' AND issueDate >= ?';
    replacements.push(fromDate);
  }
  if (to) {
    const toDate = dayjs(to).endOf('day').format('YYYY-MM-DD HH:mm:ss');
    sql += ' AND issueDate <= ?';
    replacements.push(toDate);
  }
  
  sql += ' ORDER BY issueDate ASC';

  console.log('[VAT] Fetching report data:', { from, to, sql, replacements });

  const invoices = await sequelize.query(sql, {
    replacements,
    type: sequelize.QueryTypes.SELECT,
    transaction
  });

  console.log(`[VAT] Found ${invoices.length} invoices`);

  // Map raw SQL results to report rows
  const rows = invoices.map((inv) => ({
    invoiceDate: inv.issueDate ? dayjs(inv.issueDate).format('YYYY-MM-DD') : '',
    invoiceNumber: inv.invoiceNumber || '',
    customerName: inv.customerName || '',
    customerTRN: inv.customerTRN || '',
    taxableAmount: bankersRound(normalizeNumber(inv.taxableSubtotal || 0)),
    vatAmount: bankersRound(normalizeNumber(inv.vatAmount || 0)),
    totalAmount: bankersRound(normalizeNumber(inv.totalWithVAT || inv.total || 0)),
    zeroRatedAmount: bankersRound(normalizeNumber(inv.zeroRatedSubtotal || 0)),
    exemptAmount: bankersRound(normalizeNumber(inv.exemptSubtotal || 0)),
    vatType: inv.vatType || 'standard'
  }));

  // Get summary within same transaction
  const summary = await getVatSummary({ from, to, companyId }, transaction);
  return { rows, summary };
}

/**
 * Export VAT report as CSV (FTA-ready format).
 * Uses transaction to ensure consistent snapshot.
 */
async function exportVatCsv(res, params) {
  // Use transaction for consistent snapshot
  const transaction = await sequelize.transaction();
  
  try {
    console.log('[VAT] Starting CSV export with params:', params);
    const { rows } = await getVatReportData(params, transaction);
    
    // Set headers before writing (must be before any data is written)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="vat-report-${params.from || 'all'}-${params.to || 'today'}.csv"`);

    // FTA-ready CSV format: invoiceDate, invoiceNumber, customerName, customerTRN, taxableAmount, vatAmount, totalAmount
    res.write('invoiceDate,invoiceNumber,customerName,customerTRN,taxableAmount,vatAmount,totalAmount,zeroRatedAmount,exemptAmount,vatType\r\n');
    
    // Stream-friendly: write rows one by one
    if (rows && rows.length > 0) {
      console.log(`[VAT] Writing ${rows.length} rows to CSV`);
      for (const row of rows) {
        const line = [
          row.invoiceDate || '',
          row.invoiceNumber || '',
          `"${(row.customerName || '').replace(/"/g, '""')}"`,
          row.customerTRN || '',
          (row.taxableAmount || 0).toFixed(2),
          (row.vatAmount || 0).toFixed(2),
          (row.totalAmount || 0).toFixed(2),
          (row.zeroRatedAmount || 0).toFixed(2),
          (row.exemptAmount || 0).toFixed(2),
          row.vatType || 'standard'
        ].join(',');
        res.write(`${line}\r\n`);
      }
    } else {
      console.log('[VAT] No rows to export');
    }
    
    await transaction.commit();
    res.end();
    console.log('[VAT] CSV export completed successfully');
  } catch (error) {
    // Only rollback if transaction is still active
    if (transaction && !transaction.finished) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('[VAT] Rollback error (ignoring):', rollbackError.message);
      }
    }
    console.error('[VAT] CSV export error:', error);
    console.error('[VAT] Error stack:', error.stack);
    
    // If headers not sent yet, send error response
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Failed to export CSV',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } else {
      // Headers already sent, just end the response
      res.end();
    }
    throw error;
  }
}

/**
 * Export VAT report as PDF with professional styling.
 * Uses transaction to ensure consistent snapshot.
 */
async function exportVatPdf(res, params) {
  // Use transaction for consistent snapshot
  const transaction = await sequelize.transaction();
  
  try {
    console.log('[VAT] Starting PDF export with params:', params);
    const { rows, summary } = await getVatReportData(params, transaction);
    const settings = await getVatSettings({ companyId: 1 }, transaction);
    
    // Get settings as plain object
    const settingsData = settings.toJSON ? settings.toJSON() : settings;
    
    const { jsPDF } = require('jspdf');
    const { applyPlugin } = require('jspdf-autotable');
    
    // Apply the plugin to jsPDF (required in v5+)
    applyPlugin(jsPDF);
    
    console.log(`[VAT] Generating PDF with ${rows.length} rows`);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    
    // Header section
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, 595, 80, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('VAT Summary Report', 40, 35);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (settingsData.trn) {
      doc.text(`Company TRN: ${settingsData.trn}`, 40, 55);
    }
    doc.text(`Period: ${params.from || 'All Time'} to ${params.to || dayjs().format('YYYY-MM-DD')}`, 40, 70);
    
    // Summary section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 40, 110);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let yPos = 130;
    const summaryItems = [
      { label: 'Total Invoices', value: summary.totalInvoicesCount },
      { label: 'Taxable Sales', value: `AED ${summary.taxableSales.toFixed(2)}` },
      { label: 'Zero-rated Sales', value: `AED ${summary.zeroRatedSales.toFixed(2)}` },
      { label: 'Exempt Sales', value: `AED ${summary.exemptSales.toFixed(2)}` },
      { label: 'VAT Collected', value: `AED ${summary.totalVatCollected.toFixed(2)}` },
      { label: 'VAT Adjustments', value: `AED ${summary.adjustmentVat.toFixed(2)}` },
      { label: 'Net VAT Payable', value: `AED ${summary.netVatPayable.toFixed(2)}` }
    ];
    
    summaryItems.forEach((item) => {
      doc.setFont('helvetica', 'normal');
      doc.text(`${item.label}:`, 40, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(item.value.toString(), 200, yPos);
      yPos += 15;
    });

    // Invoice details table
    if (rows.length > 0) {
      doc.autoTable({
        startY: yPos + 20,
        head: [[
          'Date', 'Invoice #', 'Customer', 'TRN', 
          'Taxable', 'Zero-rated', 'Exempt', 'VAT', 'Total', 'Type'
        ]],
        body: rows.map((row) => [
          row.invoiceDate || '',
          row.invoiceNumber || '',
          (row.customerName || '').substring(0, 20),
          row.customerTRN || '-',
          (row.taxableAmount || 0).toFixed(2),
          (row.zeroRatedAmount || 0).toFixed(2),
          (row.exemptAmount || 0).toFixed(2),
          (row.vatAmount || 0).toFixed(2),
          (row.totalAmount || 0).toFixed(2),
          row.vatType || 'standard'
        ]),
        styles: {
          fontSize: 8,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { left: 40, right: 40 }
      });
    } else {
      doc.setFontSize(10);
      doc.text('No invoices found for the selected period.', 40, yPos + 30);
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${i} of ${pageCount} | Generated on ${dayjs().format('DD MMM YYYY HH:mm')}`,
        40,
        doc.internal.pageSize.height - 20
      );
    }

    await transaction.commit();
    
    // Generate PDF buffer
    const buffer = doc.output('arraybuffer');
    
    // Set headers before sending
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="vat-report-${params.from || 'all'}-${params.to || 'today'}.pdf"`);
    
    // Send PDF
    res.send(Buffer.from(buffer));
    console.log('[VAT] PDF export completed successfully');
  } catch (error) {
    // Only rollback if transaction is still active
    if (transaction && !transaction.finished) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('[VAT] Rollback error (ignoring):', rollbackError.message);
      }
    }
    console.error('[VAT] PDF export error:', error);
    console.error('[VAT] Error stack:', error.stack);
    
    // If headers not sent yet, send error response
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Failed to export PDF',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } else {
      // Headers already sent, just end the response
      res.end();
    }
    throw error;
  }
}

async function createVatAdjustment(payload, user) {
  return VatAdjustment.create({
    companyId: payload.companyId || 1,
    type: payload.type,
    amount: bankersRound(payload.amount),
    vatImpact: bankersRound(payload.vatImpact ?? payload.amount),
    referenceNumber: payload.referenceNumber || null,
    reason: payload.reason || null,
    supportingDocument: payload.supportingDocument || null,
    createdByUid: user?.uid || null,
    createdByDisplayName: user?.displayName || null,
    createdByEmail: user?.email || null
  });
}

function getNextFilingDeadline(settings) {
  const filingDay = settings.filingDay || 28;
  const now = dayjs();
  let base = now.date(filingDay);

  if (settings.filingFrequency === 'quarterly') {
    const quarterStart = Math.floor(now.month() / 3) * 3;
    base = dayjs().month(quarterStart).date(filingDay);
    if (base.isBefore(now)) {
      base = base.add(3, 'month');
    }
  } else {
    if (base.isBefore(now)) {
      base = base.add(1, 'month');
    }
  }

  return base.endOf('day').toDate();
}

module.exports = {
  VAT_RATE,
  bankersRound,
  getVatSettings,
  updateVatSettings,
  computeInvoiceVat,
  getVatSummary,
  getVatReportData,
  exportVatCsv,
  exportVatPdf,
  createVatAdjustment,
  getNextFilingDeadline
};

