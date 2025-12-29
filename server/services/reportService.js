/**
 * Report Service
 * Handles report generation, scheduling, and execution
 */

const { sequelize } = require('../config/database');
const dayjs = require('dayjs');
const { CustomReport, ReportExecution, ScheduledReport } = require('../../models/reportAssociations');
const Invoice = require('../../models/Invoice');
const Expense = require('../../models/Expense');
const Sale = require('../../models/Sale');
const Payment = require('../../models/Payment');
const { Op, fn, col } = require('sequelize');
const XLSX = require('xlsx');
const fs = require('fs').promises;
const path = require('path');

/**
 * Generate report data based on report configuration
 */
async function generateReportData(reportId, filters = {}, companyId = 1) {
  const startTime = Date.now();
  let execution = null;
  
  try {
    execution = await createExecution(reportId, null, 'manual', companyId, 'admin@biz.com');
  } catch (execError) {
    console.error('[Report Service] Error creating execution record:', execError);
    // Continue even if execution record creation fails
  }

  try {
    const report = await CustomReport.findByPk(reportId);
    if (!report || report.companyId !== companyId) {
      throw new Error('Report not found or unauthorized');
    }

    const config = report.config || {};
    const reportType = report.reportType;
    const dateRange = report.dateRange || 'last_month';
    
    console.log(`[Report Service] Generating ${reportType} report (ID: ${reportId}) for date range: ${dateRange}`);
    
    // Calculate date range
    const { startDate, endDate } = calculateDateRange(dateRange, report.startDate, report.endDate);
    
    console.log(`[Report Service] Date range: ${startDate} to ${endDate}`);
    
    // Merge filters
    const finalFilters = { ...report.filters, ...filters };

    let data = [];
    let summary = {};

    switch (reportType) {
      case 'financial':
        data = await generateFinancialReport(startDate, endDate, finalFilters, companyId);
        break;
      case 'sales':
        data = await generateSalesReport(startDate, endDate, finalFilters, companyId);
        break;
      case 'expenses':
        data = await generateExpensesReport(startDate, endDate, finalFilters, companyId);
        break;
      case 'payroll':
        data = await generatePayrollReport(startDate, endDate, finalFilters, companyId);
        break;
      case 'compliance':
        data = await generateComplianceReport(startDate, endDate, finalFilters, companyId);
        break;
      default:
        data = await generateCustomReport(config, startDate, endDate, finalFilters, companyId);
    }

    const executionTime = Date.now() - startTime;

    // Calculate record count based on report type
    let recordCount = 0;
    if (Array.isArray(data)) {
      recordCount = data.length;
    } else if (data && typeof data === 'object') {
      // For object-based reports, count the total records
      if (data.invoices) recordCount += Array.isArray(data.invoices) ? data.invoices.length : 0;
      if (data.expenses) recordCount += Array.isArray(data.expenses) ? data.expenses.length : 0;
      if (data.payments) recordCount += Array.isArray(data.payments) ? data.payments.length : 0;
      if (data.byCustomer) recordCount += Array.isArray(data.byCustomer) ? data.byCustomer.length : 0;
      if (data.byCategory) recordCount += Array.isArray(data.byCategory) ? data.byCategory.length : 0;
      // If no arrays found, set to 1 to indicate data exists
      if (recordCount === 0 && Object.keys(data).length > 0) recordCount = 1;
    }

    // Update execution if it was created
    if (execution && execution.id) {
      try {
        await updateExecution(execution.id, 'completed', executionTime, recordCount);
      } catch (updateError) {
        console.error('[Report Service] Error updating execution:', updateError);
      }
    }

    // Update report
    try {
      const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');
      await sequelize.query(`
        UPDATE [dbo].[custom_reports]
        SET [lastRunAt] = ?, [lastRunBy] = ?, [resultCount] = ?, [executionTime] = ?, [updatedAt] = ?
        WHERE [id] = ? AND [companyId] = ?
      `, {
        replacements: [formattedNow, 'admin@biz.com', recordCount, executionTime, formattedNow, reportId, companyId]
      });
    } catch (updateError) {
      console.error('[Report Service] Error updating report:', updateError);
      // Don't fail the report generation if update fails
    }

    // Extract summary from data if it exists
    if (data && typeof data === 'object' && data.summary) {
      summary = data.summary;
    }

    console.log(`[Report Service] Report generated successfully. Records: ${recordCount}, Time: ${executionTime}ms`);

    return {
      data,
      summary,
      executionTime,
      recordCount,
      dateRange: { startDate, endDate }
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`[Report Service] Error generating report:`, error);
    
    if (execution && execution.id) {
      try {
        await updateExecution(execution.id, 'failed', executionTime, 0, error.message);
      } catch (updateError) {
        console.error('[Report Service] Error updating failed execution:', updateError);
      }
    }
    
    throw error;
  }
}

/**
 * Generate Financial Report
 */
async function generateFinancialReport(startDate, endDate, filters, companyId) {
  try {
    // Format dates as SQL Server DATETIME strings (YYYY-MM-DD HH:mm:ss) to avoid timezone issues
    const startStr = dayjs(startDate).format('YYYY-MM-DD HH:mm:ss');
    const endStr = dayjs(endDate).format('YYYY-MM-DD HH:mm:ss');
    
    // Use raw SQL query to avoid Sequelize date conversion issues with SQL Server
    const invoicesRaw = await sequelize.query(`
      SELECT [id], [invoiceNumber], [customerName], [issueDate], [subtotal], [vatAmount], [total], [totalWithVAT], [status]
      FROM [invoices]
      WHERE [issueDate] >= CAST(:startDate AS DATETIME) 
        AND [issueDate] <= CAST(:endDate AS DATETIME)
      ORDER BY [issueDate] DESC
    `, {
      replacements: { startDate: startStr, endDate: endStr },
      type: sequelize.QueryTypes.SELECT
    }).catch(err => {
      console.error('[Financial Report] Error fetching invoices:', err);
      return [];
    });
    
    // Convert raw results to plain objects (no need for model instances for export)
    const invoices = Array.isArray(invoicesRaw) ? invoicesRaw : [];

    const expensesRaw = await sequelize.query(`
      SELECT [id], [category], [description], [date], [amount]
      FROM [expenses]
      WHERE [date] >= CAST(:startDate AS DATETIME) 
        AND [date] <= CAST(:endDate AS DATETIME)
        AND [deletedAt] IS NULL
      ORDER BY [date] DESC
    `, {
      replacements: { startDate: startStr, endDate: endStr },
      type: sequelize.QueryTypes.SELECT
    }).catch(err => {
      console.error('[Financial Report] Error fetching expenses:', err);
      return [];
    });
    
    const expenses = Array.isArray(expensesRaw) ? expensesRaw : [];

    const paymentsRaw = await sequelize.query(`
      SELECT [id], [paymentNumber], [paymentDate], [paymentAmount], [status]
      FROM [payments]
      WHERE [companyId] = :companyId
        AND [paymentDate] >= CAST(:startDate AS DATETIME) 
        AND [paymentDate] <= CAST(:endDate AS DATETIME)
      ORDER BY [paymentDate] DESC
    `, {
      replacements: { companyId, startDate: startStr, endDate: endStr },
      type: sequelize.QueryTypes.SELECT
    }).catch(err => {
      console.error('[Financial Report] Error fetching payments:', err);
      return [];
    });
    
    const payments = Array.isArray(paymentsRaw) ? paymentsRaw : [];

    // Get sales from Inventory/Sales module
    const salesRaw = await sequelize.query(`
      SELECT [id], [date], [summary], [totalSales], [totalVAT]
      FROM [sales]
      WHERE [date] >= CAST(:startDate AS DATETIME) 
        AND [date] <= CAST(:endDate AS DATETIME)
      ORDER BY [date] DESC
    `, {
      replacements: { startDate: startStr, endDate: endStr },
      type: sequelize.QueryTypes.SELECT
    }).catch(err => {
      console.error('[Financial Report] Error fetching sales:', err);
      return [];
    });
    
    const sales = Array.isArray(salesRaw) ? salesRaw : [];

    // Raw SQL queries already return plain objects, no need to convert
    const invoiceData = invoices;
    const expenseData = expenses;
    const paymentData = payments;
    const salesData = sales;

    // Log for debugging
    console.log(`[Financial Report] Found ${invoiceData.length} invoices, ${salesData.length} sales, ${expenseData.length} expenses`);
    console.log(`[Financial Report] Date range: ${dayjs(startDate).format('YYYY-MM-DD')} to ${dayjs(endDate).format('YYYY-MM-DD')}`);
    
    if (invoiceData.length > 0) {
      console.log(`[Financial Report] Sample invoice data (first 3):`);
      invoiceData.slice(0, 3).forEach((inv, idx) => {
        console.log(`  Invoice ${idx + 1}:`, {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          issueDate: inv.issueDate,
          total: inv.total,
          totalWithVAT: inv.totalWithVAT,
          subtotal: inv.subtotal,
          vatAmount: inv.vatAmount,
          calculated: parseFloat(inv.total || inv.totalWithVAT || (parseFloat(inv.subtotal || 0) + parseFloat(inv.vatAmount || 0)))
        });
      });
    } else {
      console.warn(`[Financial Report] ⚠️ NO INVOICES FOUND in date range ${dayjs(start).format('YYYY-MM-DD')} to ${dayjs(end).format('YYYY-MM-DD')}`);
    }

    // Calculate totals from invoices - use 'total' field (same as dashboard)
    const totalInvoiceRevenue = invoiceData.reduce((sum, inv) => {
      // Use 'total' field first (matches dashboard calculation using sequelize.col('total'))
      let amount = parseFloat(inv.total || inv.totalWithVAT || 0);
      
      // Fallback: calculate from subtotal + vatAmount if both total fields are missing/zero
      if (!amount && (inv.subtotal !== undefined || inv.vatAmount !== undefined)) {
        amount = parseFloat(inv.subtotal || 0) + parseFloat(inv.vatAmount || 0);
      }
      
      if (isNaN(amount)) {
        console.warn(`[Financial Report] Invalid invoice amount for invoice ${inv.id || inv.invoiceNumber}:`, {
          total: inv.total,
          totalWithVAT: inv.totalWithVAT,
          subtotal: inv.subtotal,
          vatAmount: inv.vatAmount
        });
        amount = 0;
      }
      
      return sum + amount;
    }, 0);
    
    console.log(`[Financial Report] ✅ Calculated totalInvoiceRevenue: AED ${totalInvoiceRevenue.toFixed(2)} from ${invoiceData.length} invoices`);
    
    if (totalInvoiceRevenue === 0 && invoiceData.length > 0) {
      console.warn(`[Financial Report] ⚠️ WARNING: Found ${invoiceData.length} invoices but totalInvoiceRevenue is 0!`);
      console.warn(`[Financial Report] Check if invoice 'total' or 'totalWithVAT' fields have values`);
    }
    const totalInventorySales = salesData.reduce((sum, sale) => sum + parseFloat(sale.totalSales || 0), 0);
    const totalRevenue = totalInvoiceRevenue + totalInventorySales;
    const totalExpenses = expenseData.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    const totalPayments = paymentData.reduce((sum, pay) => sum + parseFloat(pay.paymentAmount || 0), 0);
    const invoiceVAT = invoiceData.reduce((sum, inv) => sum + parseFloat(inv.vatAmount || 0), 0);
    const salesVAT = salesData.reduce((sum, sale) => sum + parseFloat(sale.totalVAT || 0), 0);
    const totalVAT = invoiceVAT + salesVAT;
    
    console.log(`[Financial Report] VAT breakdown - Invoices: ${invoiceVAT}, Sales: ${salesVAT}, Total: ${totalVAT}`);

    return {
      invoices: invoiceData,
      sales: salesData,
      expenses: expenseData,
      payments: paymentData,
      summary: {
        totalSales: totalRevenue, // Total Sales = All revenue (invoices + inventory sales)
        totalInvoiceRevenue,
        totalInventorySales,
        totalRevenue,
        totalVAT,
        totalExpenses,
        totalPayments,
        netProfit: totalRevenue - totalExpenses
      }
    };
  } catch (error) {
    console.error('[Financial Report] Error generating report:', error);
    throw new Error(`Failed to generate financial report: ${error.message}`);
  }
}

/**
 * Generate Sales Report
 * This report shows sales from the Inventory/Sales module (Sale model), not invoices
 */
async function generateSalesReport(startDate, endDate, filters, companyId) {
  try {
    console.log('[Sales Report] Starting report generation...');
    console.log('[Sales Report] Date range:', { startDate, endDate });
    
    // Ensure dates are Date objects for SQL Server
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date range provided');
    }
    
    console.log('[Sales Report] Querying sales from', start.toISOString(), 'to', end.toISOString());
    console.log('[Sales Report] Date range:', {
      start: dayjs(start).format('YYYY-MM-DD HH:mm:ss'),
      end: dayjs(end).format('YYYY-MM-DD HH:mm:ss')
    });
    
    // Use gte and lt to ensure we capture all dates in the range
    const nextDayStart = dayjs(end).add(1, 'day').startOf('day').toDate();
    
    console.log('[Sales Report] Query filter:', {
      gte: start.toISOString(),
      lt: nextDayStart.toISOString()
    });
    
    let sales;
    try {
      sales = await Sale.findAll({
        where: {
          date: {
            [Op.gte]: start,
            [Op.lt]: nextDayStart
          }
        },
        attributes: [
          'id',
          'date',
          'summary',
          'items',
          'totalSales',
          'totalVAT',
          'notes',
          'createdAt'
        ],
        order: [['date', 'DESC']]
      });
      console.log('[Sales Report] Found', sales.length, 'sales in date range');
      
      // Log a sample of sale dates to verify
      if (sales.length > 0) {
        const sampleDates = sales.slice(0, 5).map(sale => {
          const date = sale.date;
          return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : 'null';
        });
        console.log('[Sales Report] Sample sale dates found:', sampleDates);
      } else {
        console.log('[Sales Report] No sales found in the specified date range');
      }
    } catch (queryError) {
      console.error('[Sales Report] Error fetching sales:', queryError);
      console.error('[Sales Report] Error details:', {
        message: queryError.message,
        stack: queryError.stack
      });
      // Return empty result instead of throwing
      return {
        sales: [],
        byDate: [],
        summary: {
          totalSales: 0,
          totalRevenue: 0,
          totalVAT: 0
        }
      };
    }

    if (!sales || sales.length === 0) {
      console.log('[Sales Report] No sales found in date range');
      return {
        sales: [],
        byDate: [],
        summary: {
          totalSales: 0,
          totalRevenue: 0,
          totalVAT: 0
        }
      };
    }

    const salesData = sales.map(s => {
      try {
        const saleObj = s.get({ plain: true });
        return {
          ...saleObj,
          date: saleObj.date ? dayjs(saleObj.date).format('YYYY-MM-DD') : null
        };
      } catch (err) {
        console.error('[Sales Report] Error converting sale to plain object:', err);
        return null;
      }
    }).filter(Boolean);

    console.log('[Sales Report] Processed', salesData.length, 'sales');

    // Group by date
    const byDate = salesData.reduce((acc, sale) => {
      const date = sale.date || 'Unknown';
      if (!acc[date]) {
        acc[date] = { date, count: 0, total: 0, vat: 0 };
      }
      acc[date].count++;
      acc[date].total += parseFloat(sale.totalSales || 0);
      acc[date].vat += parseFloat(sale.totalVAT || 0);
      return acc;
    }, {});

    const totalRevenue = salesData.reduce((sum, sale) => sum + parseFloat(sale.totalSales || 0), 0);
    const totalVAT = salesData.reduce((sum, sale) => sum + parseFloat(sale.totalVAT || 0), 0);

    console.log('[Sales Report] Report generated successfully:', {
      totalSales: salesData.length,
      totalRevenue,
      totalVAT,
      dates: Object.keys(byDate).length
    });

    return {
      sales: salesData,
      byDate: Object.values(byDate),
      summary: {
        totalSales: salesData.length,
        totalRevenue,
        totalVAT
      }
    };
  } catch (error) {
    console.error('[Sales Report] Error generating report:', error);
    console.error('[Sales Report] Error stack:', error.stack);
    throw new Error(`Failed to generate sales report: ${error.message}`);
  }
}

/**
 * Generate Expenses Report
 */
async function generateExpensesReport(startDate, endDate, filters, companyId) {
  try {
    // Ensure dates are Date objects for SQL Server
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);
    
    // Use gte and lt to ensure we capture all dates in the range
    const nextDayStart = dayjs(end).add(1, 'day').startOf('day').toDate();
    
    const expenses = await Expense.findAll({
      where: {
        date: {
          [Op.gte]: start,
          [Op.lt]: nextDayStart
        },
        deletedAt: null // Exclude soft-deleted expenses
      },
      attributes: ['id', 'category', 'description', 'date', 'amount'],
      order: [['date', 'DESC']]
    }).catch(err => {
      console.error('[Expenses Report] Error fetching expenses:', err);
      return [];
    });

    const expenseData = expenses.map(e => e.get({ plain: true }));

    // Group by category
    const byCategory = expenseData.reduce((acc, exp) => {
      const category = exp.category || 'Other';
      if (!acc[category]) {
        acc[category] = { category, count: 0, total: 0 };
      }
      acc[category].count++;
      acc[category].total += parseFloat(exp.amount || 0);
      return acc;
    }, {});

    const totalAmount = expenseData.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);

    return {
      expenses: expenseData,
      byCategory: Object.values(byCategory),
      summary: {
        totalExpenses: expenseData.length,
        totalAmount
      }
    };
  } catch (error) {
    console.error('[Expenses Report] Error generating report:', error);
    throw new Error(`Failed to generate expenses report: ${error.message}`);
  }
}

/**
 * Generate Payroll Report
 */
async function generatePayrollReport(startDate, endDate, filters, companyId) {
  // This would integrate with payroll module
  // For now, return placeholder
  return {
    message: 'Payroll report integration pending',
    summary: {}
  };
}

/**
 * Generate Compliance Report
 */
async function generateComplianceReport(startDate, endDate, filters, companyId) {
  // This would integrate with VAT and KYC modules
  // For now, return placeholder
  return {
    message: 'Compliance report integration pending',
    summary: {}
  };
}

/**
 * Generate Custom Report
 */
async function generateCustomReport(config, startDate, endDate, filters, companyId) {
  try {
    // Ensure dates are Date objects for SQL Server
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);
    
    // Default custom report: combine invoices, expenses, and sales
    const dataTypes = config.dataTypes || ['invoices', 'expenses', 'sales'];
    const result = {};

    // Use consistent date filtering - use start of next day for end date
    const nextDayStart = dayjs(end).add(1, 'day').startOf('day').toDate();
    
    if (dataTypes.includes('invoices')) {
      const invoices = await Invoice.findAll({
        where: {
          issueDate: {
            [Op.gte]: start,
            [Op.lt]: nextDayStart
          }
        },
        attributes: [
          'id',
          'invoiceNumber',
          'customerName',
          'issueDate',
          'subtotal',
          'vatAmount',
          'totalWithVAT',
          'status'
        ],
        order: [['issueDate', 'DESC']]
      }).catch(err => {
        console.error('[Custom Report] Error fetching invoices:', err);
        return [];
      });
      result.invoices = invoices.map(i => i.get({ plain: true }));
    }

    if (dataTypes.includes('expenses')) {
      const expenses = await Expense.findAll({
        where: {
          date: {
            [Op.gte]: start,
            [Op.lt]: nextDayStart
          },
          deletedAt: null
        },
        attributes: ['id', 'category', 'description', 'date', 'amount'],
        order: [['date', 'DESC']]
      }).catch(err => {
        console.error('[Custom Report] Error fetching expenses:', err);
        return [];
      });
      result.expenses = expenses.map(e => e.get({ plain: true }));
    }

    if (dataTypes.includes('sales')) {
      const sales = await Sale.findAll({
        where: {
          date: {
            [Op.gte]: start,
            [Op.lt]: nextDayStart
          }
        },
        attributes: ['id', 'date', 'summary', 'totalSales', 'totalVAT'],
        order: [['date', 'DESC']]
      }).catch(err => {
        console.error('[Custom Report] Error fetching sales:', err);
        return [];
      });
      result.sales = sales.map(s => s.get({ plain: true }));
    }

    // Calculate summary
    const summary = {
      totalInvoices: result.invoices?.length || 0,
      totalExpenses: result.expenses?.length || 0,
      totalSales: result.sales?.length || 0,
      totalRevenue: (result.invoices || []).reduce((sum, inv) => sum + parseFloat(inv.totalWithVAT || 0), 0) +
                     (result.sales || []).reduce((sum, sale) => sum + parseFloat(sale.totalSales || 0), 0),
      totalExpenseAmount: (result.expenses || []).reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)
    };

    return {
      ...result,
      summary
    };
  } catch (error) {
    console.error('[Custom Report] Error generating report:', error);
    throw new Error(`Failed to generate custom report: ${error.message}`);
  }
}

/**
 * Calculate date range from string or dates
 */
function calculateDateRange(dateRange, startDate, endDate) {
  const today = dayjs();
  let start, end;

  if (startDate && endDate) {
    // Custom date range - ensure full day coverage
    const customStart = dayjs(startDate).startOf('day');
    const customEnd = dayjs(endDate).endOf('day');
    return { startDate: customStart.toDate(), endDate: customEnd.toDate() };
  }

  switch (dateRange) {
    case 'today':
      start = today.startOf('day');
      end = today.endOf('day');
      break;
    case 'yesterday':
      start = today.subtract(1, 'day').startOf('day');
      end = today.subtract(1, 'day').endOf('day');
      break;
    case 'last_week':
      start = today.subtract(1, 'week').startOf('week');
      end = today.subtract(1, 'week').endOf('week');
      break;
    case 'last_month':
      // Get the first day of last month at 00:00:00
      start = today.subtract(1, 'month').startOf('month');
      // Get the last day of last month at 23:59:59.999
      end = today.subtract(1, 'month').endOf('month');
      break;
    case 'last_quarter':
      start = today.subtract(1, 'quarter').startOf('quarter');
      end = today.subtract(1, 'quarter').endOf('quarter');
      break;
    case 'last_year':
      start = today.subtract(1, 'year').startOf('year');
      end = today.subtract(1, 'year').endOf('year');
      break;
    case 'this_month':
      start = today.startOf('month');
      end = today.endOf('month');
      break;
    case 'this_year':
      start = today.startOf('year');
      end = today.endOf('year');
      break;
    default:
      start = today.subtract(1, 'month').startOf('month');
      end = today.subtract(1, 'month').endOf('month');
  }

  const startDateObj = start.toDate();
  const endDateObj = end.toDate();
  
  console.log(`[Date Range] Calculated range for "${dateRange}":`, {
    start: startDateObj.toISOString(),
    end: endDateObj.toISOString(),
    startFormatted: start.format('YYYY-MM-DD HH:mm:ss'),
    endFormatted: end.format('YYYY-MM-DD HH:mm:ss')
  });

  return { startDate: startDateObj, endDate: endDateObj };
}

/**
 * Export report to Excel
 */
async function exportToExcel(reportData, reportName, companyId = 1) {
  const uploadsDir = path.join(__dirname, '../../uploads/reports');
  await fs.mkdir(uploadsDir, { recursive: true });

  const workbook = XLSX.utils.book_new();
  
  // Create Summary sheet first (always create if summary exists)
  if (reportData.summary && Object.keys(reportData.summary).length > 0) {
    // Format summary data for better Excel display
    const summaryRows = Object.entries(reportData.summary).map(([key, value]) => {
      // Format key names (e.g., "totalSales" -> "Total Sales")
      const formattedKey = key
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
        .trim();
      
      // Format numeric values - only add AED to clearly monetary fields
      // Count fields (number of items) should NOT have AED
      let formattedValue = value;
      if (typeof value === 'number') {
        // Fields that represent currency amounts (should have AED)
        // Explicitly list currency fields - exclude count fields like totalExpenses
        const isCurrencyField = 
          (key === 'totalSales' || 
           key === 'totalRevenue' || 
           key === 'totalInvoiceRevenue' || 
           key === 'totalInventorySales' ||
           key === 'totalVAT' || 
           key === 'totalPayments' || 
           key === 'netProfit' ||
           key.includes('revenue') || 
           key.includes('Profit') || 
           key.includes('VAT') ||
           key.includes('Payments')) &&
          key !== 'totalExpenses'; // totalExpenses is a count, not currency
        
        // Fields that represent counts (should NOT have AED)
        // 'totalExpenses' is a count of expense items, not a currency amount
        const isCountField = 
          key === 'totalExpenses' ||  // Always treat totalExpenses as a count
          key.toLowerCase().includes('count') || 
          key.toLowerCase().includes('numberof') ||
          key.toLowerCase().includes('quantity');
        
        if (isCurrencyField && !isCountField) {
          formattedValue = `AED ${value.toFixed(2)}`;
        } else {
          // For counts and other non-currency numbers, format as plain number
          formattedValue = Number.isInteger(value) ? value : value.toFixed(2);
        }
      }
      
      return {
        Metric: formattedKey,
        Value: formattedValue
      };
    });
    
    const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(workbook, summaryWs, 'Summary');
  }
  
  // Create worksheets for different data types
  if (reportData.invoices && reportData.invoices.length > 0) {
    const ws = XLSX.utils.json_to_sheet(reportData.invoices);
    XLSX.utils.book_append_sheet(workbook, ws, 'Invoices');
  }
  if (reportData.sales && reportData.sales.length > 0) {
    const ws = XLSX.utils.json_to_sheet(reportData.sales);
    XLSX.utils.book_append_sheet(workbook, ws, 'Sales');
  }
  if (reportData.expenses && reportData.expenses.length > 0) {
    const ws = XLSX.utils.json_to_sheet(reportData.expenses);
    XLSX.utils.book_append_sheet(workbook, ws, 'Expenses');
  }
  if (reportData.payments && reportData.payments.length > 0) {
    const ws = XLSX.utils.json_to_sheet(reportData.payments);
    XLSX.utils.book_append_sheet(workbook, ws, 'Payments');
  }
  
  // If no data sheets were created and no summary, create a message sheet
  if (workbook.SheetNames.length === 0) {
    const messageData = [{ message: 'No data available' }];
    const ws = XLSX.utils.json_to_sheet(messageData);
    XLSX.utils.book_append_sheet(workbook, ws, 'Summary');
  }

  const filename = `${reportName}-${dayjs().format('YYYYMMDD-HHmmss')}.xlsx`;
  const filepath = path.join(uploadsDir, filename);
  
  XLSX.writeFile(workbook, filepath);
  
  return `reports/${filename}`;
}

/**
 * Create execution record
 */
async function createExecution(reportId, scheduledReportId, executionType, companyId, executedBy) {
  const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
  const [result] = await sequelize.query(`
    INSERT INTO [dbo].[report_executions]
      ([companyId], [reportId], [scheduledReportId], [executionType], [status], [startedAt], [executedBy], [createdAt])
    OUTPUT INSERTED.id, INSERTED.status, INSERTED.startedAt
    VALUES (?, ?, ?, ?, 'running', ?, ?, ?)
  `, {
    replacements: [companyId, reportId, scheduledReportId, executionType, formattedNow, executedBy, formattedNow],
    type: sequelize.QueryTypes.SELECT
  });

  const rows = Array.isArray(result) ? result : [result];
  return rows[0];
}

/**
 * Update execution record
 */
async function updateExecution(executionId, status, executionTime, resultCount, errorMessage = null) {
  const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
  await sequelize.query(`
    UPDATE [dbo].[report_executions]
    SET [status] = ?, [completedAt] = ?, [executionTime] = ?, [resultCount] = ?, [errorMessage] = ?
    WHERE [id] = ?
  `, {
    replacements: [status, formattedNow, executionTime, resultCount, errorMessage, executionId]
  });
}

module.exports = {
  generateReportData,
  exportToExcel,
  calculateDateRange
};

