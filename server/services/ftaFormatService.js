/**
 * FTA (Federal Tax Authority) Format Generation Service
 * Generates VAT return files in FTA-compliant XML format
 */

const dayjs = require('dayjs');
const fs = require('fs').promises;
const path = require('path');

/**
 * Generate FTA-compliant XML for VAT return
 * Based on UAE FTA VAT return format requirements
 */
function generateFtaXml(filingData, companySettings) {
  const {
    filingPeriod,
    periodStartDate,
    periodEndDate,
    taxableSales,
    zeroRatedSales,
    exemptSales,
    totalVatCollected,
    vatAdjustments,
    netVatPayable,
    totalInvoices,
    items = []
  } = filingData;

  const {
    trn,
    companyName = 'Company Name', // Should come from company settings
    address = '',
    email = '',
    phone = ''
  } = companySettings;

  if (!trn) {
    throw new Error('Company TRN is required for FTA filing');
  }

  // Format dates for FTA (YYYY-MM-DD)
  const formatDate = (date) => dayjs(date).format('YYYY-MM-DD');
  
  // Format amounts (2 decimal places, no commas)
  const formatAmount = (amount) => parseFloat(amount || 0).toFixed(2);

  // Generate XML according to FTA format
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<VATReturn xmlns="http://www.emaratax.gov.ae/FTA/2015/Return">
  <Header>
    <Version>1.0</Version>
    <VATReturnRequestID>${generateReturnRequestId()}</VATReturnRequestID>
    <RequestDate>${formatDate(new Date())}</RequestDate>
    <RequestTime>${dayjs().format('HH:mm:ss')}</RequestTime>
  </Header>
  <Body>
    <VATReturn>
      <Period>
        <StartDate>${formatDate(periodStartDate)}</StartDate>
        <EndDate>${formatDate(periodEndDate)}</EndDate>
      </Period>
      <TaxablePerson>
        <TRN>${trn}</TRN>
        <Name>${escapeXml(companyName)}</Name>
        <Address>${escapeXml(address)}</Address>
        <Email>${escapeXml(email)}</Email>
        <Phone>${escapeXml(phone)}</Phone>
      </TaxablePerson>
      <Sales>
        <StandardRatedSupplies>
          <Total>${formatAmount(taxableSales)}</Total>
          <VATAmount>${formatAmount(totalVatCollected)}</VATAmount>
        </StandardRatedSupplies>
        <ZeroRatedSupplies>
          <Total>${formatAmount(zeroRatedSales)}</Total>
        </ZeroRatedSupplies>
        <ExemptSupplies>
          <Total>${formatAmount(exemptSales)}</Total>
        </ExemptSupplies>
        <TotalSales>${formatAmount(taxableSales + zeroRatedSales + exemptSales)}</TotalSales>
      </Sales>
      <Adjustments>
        <VATAdjustment>${formatAmount(vatAdjustments)}</VATAdjustment>
      </Adjustments>
      <NetVATPayable>${formatAmount(netVatPayable)}</NetVATPayable>
      <InvoiceDetails>
        <TotalInvoices>${totalInvoices}</TotalInvoices>
        ${items.map(item => generateInvoiceXml(item)).join('\n        ')}
      </InvoiceDetails>
    </VATReturn>
  </Body>
</VATReturn>`;

  return xml;
}

/**
 * Generate XML for individual invoice in FTA format
 */
function generateInvoiceXml(item) {
  const formatDate = (date) => date ? dayjs(date).format('YYYY-MM-DD') : '';
  const formatAmount = (amount) => parseFloat(amount || 0).toFixed(2);

  return `<Invoice>
          <InvoiceNumber>${escapeXml(item.invoiceNumber || '')}</InvoiceNumber>
          <InvoiceDate>${formatDate(item.invoiceDate)}</InvoiceDate>
          <CustomerTRN>${escapeXml(item.customerTRN || '')}</CustomerTRN>
          <CustomerName>${escapeXml(item.customerName || '')}</CustomerName>
          <TaxableAmount>${formatAmount(item.taxableAmount)}</TaxableAmount>
          <ZeroRatedAmount>${formatAmount(item.zeroRatedAmount)}</ZeroRatedAmount>
          <ExemptAmount>${formatAmount(item.exemptAmount)}</ExemptAmount>
          <VATAmount>${formatAmount(item.vatAmount)}</VATAmount>
          <TotalAmount>${formatAmount(item.totalAmount)}</TotalAmount>
        </Invoice>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate unique return request ID
 */
function generateReturnRequestId() {
  const timestamp = dayjs().format('YYYYMMDDHHmmss');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `VAT-${timestamp}-${random}`;
}

/**
 * Save FTA XML file
 */
async function saveFtaXmlFile(xmlContent, filingPeriod, companyId = 1) {
  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../../uploads/vat-filings');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate filename
    const filename = `VAT-Return-${filingPeriod}-${dayjs().format('YYYYMMDD-HHmmss')}.xml`;
    const filepath = path.join(uploadsDir, filename);

    // Write file
    await fs.writeFile(filepath, xmlContent, 'utf8');

    // Return relative path for database storage
    return `vat-filings/${filename}`;
  } catch (error) {
    console.error('[FTA] Error saving XML file:', error);
    throw new Error(`Failed to save FTA XML file: ${error.message}`);
  }
}

/**
 * Generate FTA-compliant CSV for manual submission (backup format)
 */
function generateFtaCsv(filingData, items) {
  const headers = [
    'Invoice Number',
    'Invoice Date',
    'Customer TRN',
    'Customer Name',
    'Taxable Amount',
    'Zero Rated Amount',
    'Exempt Amount',
    'VAT Amount',
    'Total Amount'
  ];

  const rows = items.map(item => [
    item.invoiceNumber || '',
    item.invoiceDate ? dayjs(item.invoiceDate).format('YYYY-MM-DD') : '',
    item.customerTRN || '',
    item.customerName || '',
    parseFloat(item.taxableAmount || 0).toFixed(2),
    parseFloat(item.zeroRatedAmount || 0).toFixed(2),
    parseFloat(item.exemptAmount || 0).toFixed(2),
    parseFloat(item.vatAmount || 0).toFixed(2),
    parseFloat(item.totalAmount || 0).toFixed(2)
  ]);

  // Add summary row
  rows.push([
    'TOTAL',
    '',
    '',
    '',
    parseFloat(filingData.taxableSales || 0).toFixed(2),
    parseFloat(filingData.zeroRatedSales || 0).toFixed(2),
    parseFloat(filingData.exemptSales || 0).toFixed(2),
    parseFloat(filingData.totalVatCollected || 0).toFixed(2),
    parseFloat((filingData.taxableSales || 0) + (filingData.zeroRatedSales || 0) + (filingData.exemptSales || 0)).toFixed(2)
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  return csv;
}

/**
 * Save FTA CSV file
 */
async function saveFtaCsvFile(csvContent, filingPeriod, companyId = 1) {
  try {
    const uploadsDir = path.join(__dirname, '../../uploads/vat-filings');
    await fs.mkdir(uploadsDir, { recursive: true });

    const filename = `VAT-Return-${filingPeriod}-${dayjs().format('YYYYMMDD-HHmmss')}.csv`;
    const filepath = path.join(uploadsDir, filename);

    await fs.writeFile(filepath, csvContent, 'utf8');

    return `vat-filings/${filename}`;
  } catch (error) {
    console.error('[FTA] Error saving CSV file:', error);
    throw new Error(`Failed to save FTA CSV file: ${error.message}`);
  }
}

module.exports = {
  generateFtaXml,
  generateFtaCsv,
  saveFtaXmlFile,
  saveFtaCsvFile,
  generateReturnRequestId
};

