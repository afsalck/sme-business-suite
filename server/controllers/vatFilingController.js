const vatFilingService = require('../services/vatFilingService');
const { sequelize } = require('../config/database');
const path = require('path');
const fs = require('fs').promises;

/**
 * Create VAT Filing
 */
async function createVatFiling(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { periodStartDate, periodEndDate } = req.body;
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const createdBy = req.user?.email || req.user?.uid || 'unknown';

    if (!periodStartDate || !periodEndDate) {
      return res.status(400).json({ message: 'Period start and end dates are required' });
    }

    const filing = await vatFilingService.createVatFiling({
      periodStartDate,
      periodEndDate,
      companyId,
      createdBy
    });

    res.status(201).json(filing);
  } catch (error) {
    console.error('[VAT Filing] Create error:', error);
    res.status(500).json({ message: 'Failed to create VAT filing', error: error.message });
  }
}

/**
 * Get VAT Filings
 */
async function getVatFilings(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { status } = req.query;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const filings = await vatFilingService.getVatFilings({
      companyId,
      status: status || null
    });

    res.json(filings);
  } catch (error) {
    console.error('[VAT Filing] Get filings error:', error);
    res.status(500).json({ message: 'Failed to fetch VAT filings', error: error.message });
  }
}

/**
 * Get VAT Filing by ID
 */
async function getVatFiling(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { id } = req.params;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const filing = await vatFilingService.getVatFiling(parseInt(id), companyId);

    res.json(filing);
  } catch (error) {
    console.error('[VAT Filing] Get filing error:', error);
    res.status(500).json({ message: 'Failed to fetch VAT filing', error: error.message });
  }
}

/**
 * Generate FTA Files
 */
async function generateFtaFiles(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { id } = req.params;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const files = await vatFilingService.generateFtaFiles(parseInt(id), companyId);

    res.json({
      message: 'FTA files generated successfully',
      xmlPath: files.xmlPath,
      csvPath: files.csvPath
    });
  } catch (error) {
    console.error('[VAT Filing] Generate files error:', error);
    res.status(500).json({ message: 'Failed to generate FTA files', error: error.message });
  }
}

/**
 * Download FTA XML File
 */
async function downloadFtaXml(req, res) {
  try {
    const { id } = req.params;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const filing = await vatFilingService.getVatFiling(parseInt(id), companyId);

    if (!filing.ftaXmlFile) {
      return res.status(404).json({ message: 'FTA XML file not found. Please generate files first.' });
    }

    const filePath = path.join(__dirname, '../../uploads', filing.ftaXmlFile);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ message: 'FTA XML file not found on server' });
    }

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="VAT-Return-${filing.filingPeriod}.xml"`);
    
    const fileContent = await fs.readFile(filePath, 'utf8');
    res.send(fileContent);
  } catch (error) {
    console.error('[VAT Filing] Download XML error:', error);
    res.status(500).json({ message: 'Failed to download FTA XML file', error: error.message });
  }
}

/**
 * Download FTA CSV File
 */
async function downloadFtaCsv(req, res) {
  try {
    const { id } = req.params;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const filing = await vatFilingService.getVatFiling(parseInt(id), companyId);

    if (!filing.ftaPdfFile) { // CSV is stored in pdfFile field for now
      return res.status(404).json({ message: 'FTA CSV file not found. Please generate files first.' });
    }

    const filePath = path.join(__dirname, '../../uploads', filing.ftaPdfFile);

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ message: 'FTA CSV file not found on server' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="VAT-Return-${filing.filingPeriod}.csv"`);
    
    const fileContent = await fs.readFile(filePath, 'utf8');
    res.send(fileContent);
  } catch (error) {
    console.error('[VAT Filing] Download CSV error:', error);
    res.status(500).json({ message: 'Failed to download FTA CSV file', error: error.message });
  }
}

/**
 * Submit VAT Filing
 */
async function submitVatFiling(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { id } = req.params;
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const submittedBy = req.user?.email || req.user?.uid || 'unknown';

    const filing = await vatFilingService.submitVatFiling(parseInt(id), companyId, submittedBy);

    res.json({
      message: 'VAT filing submitted successfully',
      filing
    });
  } catch (error) {
    console.error('[VAT Filing] Submit error:', error);
    res.status(500).json({ message: 'Failed to submit VAT filing', error: error.message });
  }
}

module.exports = {
  createVatFiling,
  getVatFilings,
  getVatFiling,
  generateFtaFiles,
  downloadFtaXml,
  downloadFtaCsv,
  submitVatFiling
};

