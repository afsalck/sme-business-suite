const reportService = require('../services/reportService');
const { sequelize } = require('../config/database');
const { CustomReport, ScheduledReport, ReportExecution } = require('../../models/reportAssociations');
const dayjs = require('dayjs');
const fs = require('fs').promises;
const path = require('path');

/**
 * Get all custom reports
 */
async function getReports(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { reportType, isFavorite } = req.query;
    const { buildWhereClause } = require('../utils/queryHelpers');

    const where = buildWhereClause(req, {});
    if (reportType) where.reportType = reportType;
    if (isFavorite !== undefined) where.isFavorite = isFavorite === 'true';

    const reports = await CustomReport.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    res.json(reports.map(r => r.get({ plain: true })));
  } catch (error) {
    console.error('[Reports] Get reports error:', error);
    res.status(500).json({ message: 'Failed to fetch reports', error: error.message });
  }
}

/**
 * Get report by ID
 */
async function getReport(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { id } = req.params;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const report = await CustomReport.findByPk(parseInt(id));
    if (!report || report.companyId !== companyId) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json(report.get({ plain: true }));
  } catch (error) {
    console.error('[Reports] Get report error:', error);
    res.status(500).json({ message: 'Failed to fetch report', error: error.message });
  }
}

/**
 * Create custom report
 */
async function createReport(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const createdBy = req.user?.email || req.user?.uid || 'unknown';

    console.log('[Reports Controller] Creating report with data:', {
      body: req.body,
      companyId,
      createdBy
    });

    const { reportName, reportType, description, config, filters, dateRange, startDate, endDate } = req.body;

    if (!reportName || !reportType) {
      return res.status(400).json({ message: 'Report name and type are required' });
    }

    // Check if table exists
    try {
      await sequelize.query('SELECT TOP 1 id FROM [dbo].[custom_reports]');
    } catch (tableError) {
      console.error('[Reports] Table check failed:', tableError.message);
      throw new Error('Reports tables not found. Please run the database migration: server/create-reports-module.sql');
    }

    const formattedStartDate = startDate ? dayjs(startDate).format('YYYY-MM-DD') : null;
    const formattedEndDate = endDate ? dayjs(endDate).format('YYYY-MM-DD') : null;
    const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');

    // Escape JSON strings for SQL Server
    const configJson = JSON.stringify(config || {});
    const filtersJson = filters ? JSON.stringify(filters) : null;

    console.log('[Reports] Creating report:', { reportName, reportType, dateRange, configJson, filtersJson });

    const result = await sequelize.query(`
      INSERT INTO [dbo].[custom_reports]
        ([companyId], [templateId], [reportName], [reportType], [description], [config], [filters], [dateRange], [startDate], [endDate], [createdBy], [createdAt], [updatedAt])
      OUTPUT INSERTED.id, INSERTED.companyId, INSERTED.reportName, INSERTED.reportType, INSERTED.description, INSERTED.dateRange, INSERTED.createdBy, INSERTED.createdAt, INSERTED.updatedAt
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, {
      replacements: [
        companyId,
        null,
        reportName,
        reportType,
        description || null,
        configJson,
        filtersJson,
        dateRange || 'last_month',
        formattedStartDate,
        formattedEndDate,
        createdBy,
        formattedNow,
        formattedNow
      ],
      type: sequelize.QueryTypes.SELECT
    });

    // Sequelize returns [rows, metadata] for SELECT queries
    const rows = Array.isArray(result) ? result[0] : result;
    let insertedReport = null;

    if (Array.isArray(rows) && rows.length > 0) {
      insertedReport = rows[0];
    } else if (rows && typeof rows === 'object' && rows.id) {
      insertedReport = rows;
    }

    if (!insertedReport || !insertedReport.id) {
      console.error('[Reports] Unexpected insert result structure:');
      console.error('[Reports] Full result:', JSON.stringify(result, null, 2));
      console.error('[Reports] Rows:', JSON.stringify(rows, null, 2));
      throw new Error('Failed to create report - invalid result structure');
    }

    res.status(201).json(insertedReport);
  } catch (error) {
    console.error('[Reports] Create report error:', error);
    console.error('[Reports] Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to create report', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Generate/Execute report
 */
async function executeReport(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { id } = req.params;
    const { filters } = req.body;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    console.log(`[Reports Controller] Executing report ID: ${id}, Type: ${req.body?.reportType || 'unknown'}`);
    
    const reportData = await reportService.generateReportData(parseInt(id), filters || {}, companyId);

    console.log(`[Reports Controller] Report executed successfully. Records: ${reportData.recordCount || 0}`);
    
    res.json(reportData);
  } catch (error) {
    console.error('[Reports] Execute report error:', error);
    console.error('[Reports] Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to execute report', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Export report to Excel
 */
async function exportReport(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { id } = req.params;
    const { format = 'excel' } = req.query;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    // Generate report data
    const reportData = await reportService.generateReportData(parseInt(id), {}, companyId);
    
    console.log('[Export Report] Report data structure:', {
      hasData: !!reportData.data,
      hasSummary: !!reportData.summary,
      dataKeys: reportData.data ? Object.keys(reportData.data) : [],
      summaryKeys: reportData.summary ? Object.keys(reportData.summary) : []
    });
    
    // Get report name
    const report = await CustomReport.findByPk(parseInt(id));
    const reportName = report ? report.reportName : 'Report';

    if (format === 'excel') {
      // Combine data and summary for export - exportToExcel expects { invoices, sales, expenses, payments, summary }
      const exportData = {
        ...(reportData.data || {}), // invoices, sales, expenses, payments arrays
        summary: reportData.summary || {} // summary totals
      };
      
      console.log('[Export Report] Export data structure:', {
        hasInvoices: !!exportData.invoices,
        hasSales: !!exportData.sales,
        hasExpenses: !!exportData.expenses,
        hasPayments: !!exportData.payments,
        hasSummary: !!exportData.summary,
        invoiceCount: exportData.invoices?.length || 0,
        salesCount: exportData.sales?.length || 0
      });
      
      const filePath = await reportService.exportToExcel(exportData, reportName, companyId);
      
      // Read the file and send it directly as download
      const fullFilePath = path.join(__dirname, '../../uploads', filePath);
      const fileBuffer = await fs.readFile(fullFilePath);
      const filename = path.basename(filePath);
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', fileBuffer.length);
      
      // Send the file
      res.send(fileBuffer);
    } else {
      res.status(400).json({ message: 'Unsupported export format' });
    }
  } catch (error) {
    console.error('[Reports] Export report error:', error);
    res.status(500).json({ message: 'Failed to export report', error: error.message });
  }
}

/**
 * Get scheduled reports
 */
async function getScheduledReports(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const schedules = await ScheduledReport.findAll({
      where: { companyId },
      include: [{
        model: CustomReport,
        as: 'report'
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(schedules.map(s => s.get({ plain: true })));
  } catch (error) {
    console.error('[Reports] Get scheduled reports error:', error);
    res.status(500).json({ message: 'Failed to fetch scheduled reports', error: error.message });
  }
}

/**
 * Create scheduled report
 */
async function createScheduledReport(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const createdBy = req.user?.email || req.user?.uid || 'unknown';

    const { reportId, scheduleType, scheduleDay, scheduleTime, deliveryMethod, recipients, format } = req.body;

    if (!reportId || !scheduleType) {
      return res.status(400).json({ message: 'Report ID and schedule type are required' });
    }

    // Calculate next run time
    const nextRunAt = calculateNextRunTime(scheduleType, scheduleDay, scheduleTime);
    const formattedNextRun = nextRunAt ? dayjs(nextRunAt).format('YYYY-MM-DD HH:mm:ss') : null;
    const formattedTime = scheduleTime || '09:00:00';
    const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');

    const [result] = await sequelize.query(`
      INSERT INTO [dbo].[scheduled_reports]
        ([companyId], [reportId], [scheduleType], [scheduleDay], [scheduleTime], [deliveryMethod], [recipients], [format], [isActive], [nextRunAt], [createdBy], [createdAt], [updatedAt])
      OUTPUT INSERTED.id, INSERTED.companyId, INSERTED.reportId, INSERTED.scheduleType, INSERTED.nextRunAt, INSERTED.createdBy, INSERTED.createdAt, INSERTED.updatedAt
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `, {
      replacements: [
        companyId,
        reportId,
        scheduleType,
        scheduleDay || null,
        formattedTime,
        deliveryMethod || 'email',
        recipients ? JSON.stringify(recipients) : null,
        format || 'pdf',
        formattedNextRun,
        createdBy,
        formattedNow,
        formattedNow
      ],
      type: sequelize.QueryTypes.SELECT
    });

    const rows = Array.isArray(result) ? result : [result];
    const insertedSchedule = rows[0];

    if (!insertedSchedule || !insertedSchedule.id) {
      throw new Error('Failed to create scheduled report - invalid result structure');
    }

    res.status(201).json(insertedSchedule);
  } catch (error) {
    console.error('[Reports] Create scheduled report error:', error);
    res.status(500).json({ message: 'Failed to create scheduled report', error: error.message });
  }
}

/**
 * Calculate next run time for schedule
 */
function calculateNextRunTime(scheduleType, scheduleDay, scheduleTime) {
  const now = dayjs();
  const time = scheduleTime ? dayjs(scheduleTime, 'HH:mm:ss') : dayjs().hour(9).minute(0);

  switch (scheduleType) {
    case 'daily':
      let next = now.hour(time.hour()).minute(time.minute()).second(0);
      if (next.isBefore(now)) {
        next = next.add(1, 'day');
      }
      return next.toDate();
    case 'weekly':
      // scheduleDay: 1-7 (Monday-Sunday)
      const targetDay = scheduleDay || 1;
      let nextWeek = now.day(targetDay).hour(time.hour()).minute(time.minute()).second(0);
      if (nextWeek.isBefore(now)) {
        nextWeek = nextWeek.add(1, 'week');
      }
      return nextWeek.toDate();
    case 'monthly':
      // scheduleDay: 1-31 (day of month)
      const dayOfMonth = scheduleDay || 1;
      let nextMonth = now.date(dayOfMonth).hour(time.hour()).minute(time.minute()).second(0);
      if (nextMonth.isBefore(now)) {
        nextMonth = nextMonth.add(1, 'month');
      }
      return nextMonth.toDate();
    default:
      return null;
  }
}

module.exports = {
  getReports,
  getReport,
  createReport,
  executeReport,
  exportReport,
  getScheduledReports,
  createScheduledReport
};

