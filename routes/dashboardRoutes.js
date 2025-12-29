const express = require("express");
const dayjs = require("dayjs");
const { sequelize } = require("../server/config/database");
const { Op } = require("sequelize");
const Sale = require("../models/Sale");
const Expense = require("../models/Expense");
const Invoice = require("../models/Invoice");
const Employee = require("../models/Employee");
const { getVatSummary } = require("../server/services/vatService");
const { setTenantContext } = require("../server/middleware/tenantMiddleware");

const router = express.Router();

// Note: Authentication is handled globally by verifyFirebaseToken middleware in server/index.js

// Test endpoint to verify route is working
router.get("/test", (req, res) => {
  res.json({ message: "Dashboard route is working", user: req.user });
});

router.get("/metrics", setTenantContext, async (req, res) => {
  console.log("=".repeat(60));
  console.log("🔵 [DASHBOARD] GET /metrics endpoint called");
  console.log("   Request URL:", req.originalUrl);
  console.log("   Request Method:", req.method);
  console.log("   User:", req.user ? {
    uid: req.user.uid,
    email: req.user.email,
    role: req.user.role
  } : "No user");
  console.log("   Query params:", req.query);
  console.log("   Headers:", {
    authorization: req.headers.authorization ? "Bearer token present" : "No token",
    'content-type': req.headers['content-type']
  });
  
  const { from, to } = req.query;

  const startDate = from ? dayjs(from).startOf("day").toDate() : null;
  const endDate = to ? dayjs(to).endOf("day").toDate() : null;

  try {
    // Check database connection
    console.log("   [DASHBOARD] Checking database connection...");
    await sequelize.authenticate();
    console.log("   [DASHBOARD] ✅ Database connected");

    // Build where clauses with proper date filtering
    const buildDateFilter = (fieldName) => {
      if (!startDate && !endDate) return {};
      const filter = {};
      if (startDate && endDate) {
        filter[fieldName] = { [Op.between]: [startDate, endDate] };
      } else if (startDate) {
        filter[fieldName] = { [Op.gte]: startDate };
      } else if (endDate) {
        filter[fieldName] = { [Op.lte]: endDate };
      }
      return filter;
    };

    const { buildWhereClause } = require('../server/utils/queryHelpers');
    
    const saleWhere = buildWhereClause(req, {
      ...buildDateFilter('date')
    });
    const invoiceWhere = buildWhereClause(req, {
      ...buildDateFilter('issueDate')
    });
    const expenseWhere = buildWhereClause(req, {
      ...buildDateFilter('date')
    });

    // Build today's date filter
    const todayStart = dayjs().startOf("day").toDate();
    const todayEnd = dayjs().endOf("day").toDate();
    const todaySaleWhere = buildWhereClause(req, {
      date: { [Op.between]: [todayStart, todayEnd] } 
    });
    const todayExpenseWhere = buildWhereClause(req, {
      date: { [Op.between]: [todayStart, todayEnd] } 
    });

    // Use Promise.allSettled so one failure doesn't break everything
    const [salesResult, expenseResult, invoiceResult, expiringResult, todaySalesResult, todayExpenseResult, invoiceStatsResult, vatSummaryResult] = await Promise.allSettled([
      // Total sales and VAT
      Sale.findAll({
        where: saleWhere,
        attributes: [
          [sequelize.fn('SUM', sequelize.col('totalSales')), 'totalSales'],
          [sequelize.fn('SUM', sequelize.col('totalVAT')), 'totalVAT']
        ],
        raw: true
      }).catch(() => [{ totalSales: 0, totalVAT: 0 }]),
      
      // Total expenses
      Expense.findAll({
        where: expenseWhere,
        attributes: [
          [sequelize.fn('SUM', sequelize.col('amount')), 'totalExpenses']
        ],
        raw: true
      }).catch(() => [{ totalExpenses: 0 }]),
      
      // Total invoice VAT and amount
      Invoice.findAll({
        where: invoiceWhere,
        attributes: [
          [sequelize.fn('SUM', sequelize.col('vatAmount')), 'totalVat'],
          [sequelize.fn('SUM', sequelize.col('total')), 'totalInvoiceAmount']
        ],
        raw: true
      }).catch(() => [{ totalVat: 0, totalInvoiceAmount: 0 }]),
      
      // Expiring employees (visa or passport expiring in 30 days)
      Employee.count({
        where: {
          companyId: req.companyId, // ✅ Filter by companyId
          [Op.or]: [
            {
              visaExpiry: {
                [Op.lte]: dayjs().add(30, "day").endOf("day").toDate()
              }
            },
            {
              passportExpiry: {
                [Op.lte]: dayjs().add(30, "day").endOf("day").toDate()
              }
            }
          ]
        }
      }).catch(() => 0),
      
      // Today's sales
      Sale.findAll({
        where: todaySaleWhere,
        attributes: [
          [sequelize.fn('SUM', sequelize.col('totalSales')), 'dailySales']
        ],
        raw: true
      }).catch(() => [{ dailySales: 0 }]),
      
      // Today's expenses
      Expense.findAll({
        where: todayExpenseWhere,
        attributes: [
          [sequelize.fn('SUM', sequelize.col('amount')), 'dailyExpenses']
        ],
        raw: true
      }).catch(() => [{ dailyExpenses: 0 }]),
      
      // Invoice statistics - use separate counts for better SQL Server compatibility
      Promise.all([
        Invoice.count({ where: { companyId: req.companyId } }).catch(() => 0),
        Invoice.count({ where: { companyId: req.companyId, status: 'paid' } }).catch(() => 0),
        Invoice.count({ where: { companyId: req.companyId, status: 'overdue' } }).catch(() => 0)
      ]).then(([total, paid, overdue]) => ({
        totalInvoices: total,
        paidInvoices: paid,
        overdueInvoices: overdue
      })).catch(() => ({ totalInvoices: 0, paidInvoices: 0, overdueInvoices: 0 })),
      
      getVatSummary({ from, to, companyId: req.companyId }).catch(() => null)
    ]);

    // Extract values from Promise.allSettled results
    const salesData = salesResult.status === 'fulfilled' ? salesResult.value[0] || {} : {};
    const expenseData = expenseResult.status === 'fulfilled' ? expenseResult.value[0] || {} : {};
    const invoiceData = invoiceResult.status === 'fulfilled' ? invoiceResult.value[0] || {} : {};
    const expiringCount = expiringResult.status === 'fulfilled' ? expiringResult.value : 0;
    const todaySalesData = todaySalesResult.status === 'fulfilled' ? todaySalesResult.value[0] || {} : {};
    const todayExpenseData = todayExpenseResult.status === 'fulfilled' ? todayExpenseResult.value[0] || {} : {};

    const totalSales = parseFloat(salesData.totalSales || 0);
    const totalExpenses = parseFloat(expenseData.totalExpenses || 0);
    const dailySales = parseFloat(todaySalesData.dailySales || 0);
    const dailyExpenses = parseFloat(todayExpenseData.dailyExpenses || 0);
    const vatPayable = parseFloat(invoiceData.totalVat || 0) > 0 
      ? parseFloat(invoiceData.totalVat || 0) 
      : parseFloat(salesData.totalVAT || 0);
    const profit = totalSales - totalExpenses;
    const expiringDocs = expiringCount || 0;
    
    // Invoice statistics
    const invoiceStats = invoiceStatsResult.status === 'fulfilled' ? invoiceStatsResult.value || {} : {};
    const vatSummary = vatSummaryResult.status === 'fulfilled' ? vatSummaryResult.value : null;
    const totalInvoices = parseInt(invoiceStats.totalInvoices || 0, 10);
    const paidInvoices = parseInt(invoiceStats.paidInvoices || 0, 10);
    const overdueInvoices = parseInt(invoiceStats.overdueInvoices || 0, 10);

    // Get trend data - use CONVERT for SQL Server date formatting
    const [salesTrendResult, expenseTrendResult] = await Promise.allSettled([
      Sale.findAll({
        where: saleWhere,
        attributes: [
          [sequelize.literal("CONVERT(VARCHAR(10), date, 120)"), 'date'],
          [sequelize.fn('SUM', sequelize.col('totalSales')), 'total']
        ],
        group: [sequelize.literal("CONVERT(VARCHAR(10), date, 120)")],
        order: [[sequelize.literal("CONVERT(VARCHAR(10), date, 120)"), 'ASC']],
        raw: true
      }).catch(() => []),
      
      Expense.findAll({
        where: expenseWhere,
        attributes: [
          [sequelize.literal("CONVERT(VARCHAR(10), date, 120)"), 'date'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'total']
        ],
        group: [sequelize.literal("CONVERT(VARCHAR(10), date, 120)")],
        order: [[sequelize.literal("CONVERT(VARCHAR(10), date, 120)"), 'ASC']],
        raw: true
      }).catch(() => [])
    ]);

    // Format trend data to match expected format
    const salesTrend = salesTrendResult.status === 'fulfilled' 
      ? salesTrendResult.value.map(item => ({ _id: item.date, total: parseFloat(item.total || 0) }))
      : [];
    const expenseTrend = expenseTrendResult.status === 'fulfilled'
      ? expenseTrendResult.value.map(item => ({ _id: item.date, total: parseFloat(item.total || 0) }))
      : [];

    const quickAlerts = [];
    if (vatSummary && vatSummary.netVatPayable > 0) {
      quickAlerts.push({
        type: "vat",
        title: "VAT payable",
        amount: vatSummary.netVatPayable,
        message: `VAT payable AED ${vatSummary.netVatPayable.toFixed(2)}`
      });
    }

    const responseData = {
      totals: {
        totalSales,
        totalExpenses,
        dailySales,
        dailyExpenses,
        profit,
        vatPayable,
        expiringDocs,
        totalInvoices,
        paidInvoices,
        overdueInvoices
      },
      charts: {
        salesTrend,
        expenseTrend
      },
      vat: vatSummary,
      alerts: quickAlerts
    };
    
    console.log("   [DASHBOARD] ✅ Metrics calculated successfully");
    console.log("   [DASHBOARD] Response data:", JSON.stringify(responseData, null, 2));
    console.log("=".repeat(60));
    
    res.json(responseData);
  } catch (error) {
    console.error("=".repeat(60));
    console.error("❌ [DASHBOARD] Error in metrics endpoint:");
    console.error("   Error message:", error.message);
    console.error("   Error stack:", error.stack);
    console.error("   Error name:", error.name);
    console.error("=".repeat(60));
    
    // Always return a valid JSON object with all expected fields
    // This prevents frontend crashes when API fails
    res.status(500).json({ 
      totals: {
        totalSales: 0,
        totalExpenses: 0,
        dailySales: 0,
        dailyExpenses: 0,
        profit: 0,
        vatPayable: 0,
        expiringDocs: 0,
        totalInvoices: 0,
        paidInvoices: 0,
        overdueInvoices: 0
      },
      charts: {
        salesTrend: [],
        expenseTrend: []
      },
      vat: null,
      alerts: [],
      error: {
        message: "Failed to load dashboard metrics",
        details: error.message
      }
    });
  }
});

module.exports = router;
