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

async function getVatSettings(options = {}) {
  const settings = await CompanyVatSettings.findByPk(
    options.companyId || 1,
    { rejectOnEmpty: false }
  );

  if (!settings) {
    return CompanyVatSettings.build({ companyId: 1 });
  }
  return settings;
}

async function updateVatSettings(payload) {
  const [settings, created] = await CompanyVatSettings.findOrCreate({
    where: { companyId: payload.companyId || 1 },
    defaults: {
      trn: payload.trn || null,
      vatEnabled: Boolean(payload.vatEnabled),
      filingFrequency: payload.filingFrequency || 'monthly',
      filingDay: payload.filingDay || 28
    }
  });

  settings.trn = payload.trn || null;
  settings.vatEnabled = Boolean(payload.vatEnabled);
  settings.filingFrequency = payload.filingFrequency || settings.filingFrequency;
  settings.filingDay = payload.filingDay || settings.filingDay;
  if (payload.lastFiledAt) {
    settings.lastFiledAt = new Date(payload.lastFiledAt);
  }

  await settings.save();
  return settings;
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

async function getVatSummary({ from, to }) {
  const where = {};
  if (from || to) {
    where.issueDate = {};
    if (from) where.issueDate[Op.gte] = new Date(from);
    if (to) where.issueDate[Op.lte] = new Date(to);
  }

  const invoices = await Invoice.findAll({
    where,
    attributes: [
      'id',
      'invoiceNumber',
      'customerName',
      'customerTRN',
      'vatType',
      'taxableSubtotal',
      'zeroRatedSubtotal',
      'exemptSubtotal',
      'discountTotal',
      'vatAmount',
      'totalWithVAT'
    ],
    raw: true
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

  const adjustments = await VatAdjustment.findAll({
    attributes: [
      [fn('SUM', col('vatImpact')), 'vatImpact']
    ],
    raw: true
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

async function getVatReportData({ from, to }) {
  const where = {};
  if (from || to) {
    where.issueDate = {};
    if (from) where.issueDate[Op.gte] = new Date(from);
    if (to) where.issueDate[Op.lte] = new Date(to);
  }

  const invoices = await Invoice.findAll({
    where,
    order: [['issueDate', 'ASC']]
  });

  const rows = invoices.map((inv) => ({
    invoiceDate: dayjs(inv.issueDate).format('YYYY-MM-DD'),
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customerName,
    customerTRN: inv.customerTRN || '',
    taxableAmount: bankersRound(inv.taxableSubtotal || 0),
    vatAmount: bankersRound(inv.vatAmount || 0),
    totalAmount: bankersRound(inv.totalWithVAT || inv.total || 0),
    zeroRatedAmount: bankersRound(inv.zeroRatedSubtotal || 0),
    exemptAmount: bankersRound(inv.exemptSubtotal || 0),
    vatType: inv.vatType || 'standard'
  }));

  const summary = await getVatSummary({ from, to });
  return { rows, summary };
}

async function exportVatCsv(res, params) {
  const { rows } = await getVatReportData(params);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="vat-report.csv"');

  // Stream-friendly: write header first
  res.write('invoiceDate,invoiceNumber,customerName,customerTRN,taxableAmount,vatAmount,totalAmount,zeroRatedAmount,exemptAmount,vatType\r\n');
  rows.forEach((row) => {
    const line = [
      row.invoiceDate,
      row.invoiceNumber,
      `"${row.customerName?.replace(/"/g, '""') || ''}"`,
      row.customerTRN,
      row.taxableAmount.toFixed(2),
      row.vatAmount.toFixed(2),
      row.totalAmount.toFixed(2),
      row.zeroRatedAmount.toFixed(2),
      row.exemptAmount.toFixed(2),
      row.vatType
    ].join(',');
    res.write(`${line}\r\n`);
  });
  res.end();
}

async function exportVatPdf(res, params) {
  const { rows, summary } = await getVatReportData(params);
  const { jsPDF } = require('jspdf');
  const autoTable = require('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  doc.setFontSize(16);
  doc.text('VAT Summary Report', 40, 40);
  doc.setFontSize(10);
  doc.text(`Period: ${params.from || 'Start'} to ${params.to || 'Today'}`, 40, 60);

  doc.text(`Taxable Sales: AED ${summary.taxableSales.toFixed(2)}`, 40, 80);
  doc.text(`VAT Collected: AED ${summary.totalVatCollected.toFixed(2)}`, 40, 95);
  doc.text(`Zero-rated Sales: AED ${summary.zeroRatedSales.toFixed(2)}`, 40, 110);
  doc.text(`Exempt Sales: AED ${summary.exemptSales.toFixed(2)}`, 40, 125);
  doc.text(`Net VAT Payable: AED ${summary.netVatPayable.toFixed(2)}`, 40, 140);

  autoTable(doc, {
    startY: 160,
    head: [['Date', 'Invoice #', 'Customer', 'TRN', 'Taxable', 'Zero-rated', 'Exempt', 'VAT', 'Total', 'Type']],
    body: rows.map((row) => [
      row.invoiceDate,
      row.invoiceNumber,
      row.customerName,
      row.customerTRN,
      row.taxableAmount.toFixed(2),
      row.zeroRatedAmount.toFixed(2),
      row.exemptAmount.toFixed(2),
      row.vatAmount.toFixed(2),
      row.totalAmount.toFixed(2),
      row.vatType
    ])
  });

  const buffer = doc.output('arraybuffer');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="vat-report.pdf"');
  res.send(Buffer.from(buffer));
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

