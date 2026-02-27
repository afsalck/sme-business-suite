const express = require("express");
const dayjs = require("dayjs");
let XLSX;
try {
  XLSX = require("xlsx");
} catch (err) {
  console.warn("[Inventory Routes] xlsx module not found. Excel export will be disabled.");
  XLSX = null;
}
const { sequelize } = require("../server/config/database");
const { Op } = require("sequelize");
const InventoryItem = require("../models/InventoryItem");
const Sale = require("../models/Sale");
const Company = require("../models/Company");
const { calculateInvoiceTotals } = require("../server/utils/invoiceUtils");
const { authorizeRole } = require("../server/middleware/authMiddleware");
const { setTenantContext } = require("../server/middleware/tenantMiddleware");
const { generateReceiptPdf } = require("../server/services/pdfService");

const router = express.Router();

// Debug middleware to log all inventory route requests
router.use((req, res, next) => {
  console.log(`[INVENTORY ROUTER] ${req.method} ${req.path} - Original: ${req.originalUrl}`);
  next();
});

// Test endpoint to verify routing works
router.get("/test", (req, res) => {
  res.json({ 
    message: "Inventory routes are working", 
    path: req.path, 
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    routes: [
      "GET /sales/daily-report",
      "GET /sales/daily-report/excel",
      "GET /sales",
      "POST /sales"
    ]
  });
});

// Search inventory by SKU/barcode
router.get("/search", setTenantContext, async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const { sku, barcode } = req.query;
    const searchTerm = sku || barcode;
    
    if (!searchTerm) {
      return res.status(400).json({ message: "SKU or barcode is required" });
    }

    const item = await InventoryItem.findOne({
      where: {
        companyId: req.companyId, // ✅ Filter by companyId
        [Op.or]: [
          { sku: searchTerm },
          { sku: { [Op.like]: `%${searchTerm}%` } }
        ]
      }
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json(item.get({ plain: true }));
  } catch (error) {
    console.error("[Inventory] Search error:", error);
    res.status(500).json({ message: "Failed to search inventory" });
  }
});

router.get("/", setTenantContext, async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    console.warn("[Inventory] SQL Server not connected, returning empty array");
    return res.json([]);
  }

  try {
    const items = await InventoryItem.findAll({
      where: {
        companyId: req.companyId // ✅ Filter by companyId
      },
      order: [['name', 'ASC']],
      raw: false
    });
    
    // Convert to plain objects
    const itemData = items.map(item => item.get({ plain: true }));
    res.json(itemData);
  } catch (error) {
    console.error("Inventory fetch error:", error.message);
    res.json([]);
  }
});

router.post("/", authorizeRole("admin"), setTenantContext, async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const item = await InventoryItem.create({
      ...req.body,
      companyId: req.companyId, // ✅ Set companyId
      createdByUid: req.user.uid,
      createdByDisplayName: req.user.displayName,
      createdByEmail: req.user.email
    });

    // Auto-create journal entry if initial stock > 0
    if (item.stock > 0 && item.costPrice > 0) {
      try {
        const { createJournalEntryFromInventory, postJournalEntry } = require("../server/services/accountingService");
        const companyId = 1; // TODO: Get from user context
        
        console.log("[Inventory] Creating journal entry for initial inventory:", item.name, "Stock:", item.stock);
        const journalEntry = await createJournalEntryFromInventory(item.get({ plain: true }), 0, item.stock, companyId);
        
        if (journalEntry) {
          console.log("[Inventory] ✓ Journal entry created:", journalEntry.entryNumber || journalEntry.id);
          // Auto-post the journal entry
          await postJournalEntry(journalEntry.id, req.user.email || req.user.uid, companyId);
          console.log("[Inventory] ✓ Journal entry posted:", journalEntry.entryNumber || journalEntry.id);
        }
      } catch (accountingError) {
        console.error("[Inventory] Accounting integration failed (non-critical):", accountingError.message);
        // Don't fail the inventory creation if accounting fails
      }
    }

    res.status(201).json(item.get({ plain: true }));
  } catch (error) {
    console.error("[Inventory] Create error:", error);
    res.status(500).json({ message: "Failed to create inventory item" });
  }
});

router.put("/:id", authorizeRole("admin"), setTenantContext, async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const item = await InventoryItem.findOne({
      where: {
        id: req.params.id,
        companyId: req.companyId // ✅ Filter by companyId
      }
    });
    
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    
    // Track old stock before update
    const oldStock = item.stock;
    const oldCostPrice = item.costPrice;
    
    await item.update(req.body);
    const updatedItem = await InventoryItem.findByPk(req.params.id);
    
    // Auto-create journal entry if stock or cost price changed
    const newStock = updatedItem.stock;
    const newCostPrice = updatedItem.costPrice;
    const stockChanged = oldStock !== newStock;
    const costChanged = oldCostPrice !== newCostPrice;
    
    if ((stockChanged || costChanged) && newStock > 0 && newCostPrice > 0) {
      try {
        const { createJournalEntryFromInventory, postJournalEntry } = require("../server/services/accountingService");
        const companyId = 1; // TODO: Get from user context
        
        console.log("[Inventory] Stock/Cost changed - creating journal entry:", updatedItem.name);
        console.log("[Inventory] Old stock:", oldStock, "New stock:", newStock);
        console.log("[Inventory] Old cost:", oldCostPrice, "New cost:", newCostPrice);
        
        const journalEntry = await createJournalEntryFromInventory(updatedItem.get({ plain: true }), oldStock, newStock, companyId);
        
        if (journalEntry) {
          console.log("[Inventory] ✓ Journal entry created:", journalEntry.entryNumber || journalEntry.id);
          // Auto-post the journal entry
          await postJournalEntry(journalEntry.id, req.user.email || req.user.uid, companyId);
          console.log("[Inventory] ✓ Journal entry posted:", journalEntry.entryNumber || journalEntry.id);
        }
      } catch (accountingError) {
        console.error("[Inventory] Accounting integration failed (non-critical):", accountingError.message);
        // Don't fail the inventory update if accounting fails
      }
    }
    
    res.json(updatedItem.get({ plain: true }));
  } catch (error) {
    console.error("[Inventory] Update error:", error);
    res.status(500).json({ message: "Failed to update inventory item" });
  }
});

router.delete("/:id", authorizeRole("admin"), setTenantContext, async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const item = await InventoryItem.findOne({
      where: {
        id: req.params.id,
        companyId: req.companyId // ✅ Filter by companyId
      }
    });
    
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    
    await item.destroy();
    res.json({ message: "Inventory item removed" });
  } catch (error) {
    console.error("[Inventory] Delete error:", error);
    res.status(500).json({ message: "Failed to delete inventory item" });
  }
});

// Daily sales report endpoints (must be defined BEFORE /sales route)
// Excel export endpoint for daily sales report
router.get("/sales/daily-report/excel", setTenantContext, (req, res, next) => {
  console.log("=".repeat(60));
  console.log("📊 [EXCEL EXPORT] ROUTE HANDLER CALLED!");
  console.log("   Method:", req.method);
  console.log("   Path:", req.path);
  console.log("   Original URL:", req.originalUrl);
  console.log("   Query params:", req.query);
  next();
}, async (req, res) => {
  console.log("📊 [EXCEL EXPORT] Async handler executing...");
  
  // Check if xlsx is available
  if (!XLSX) {
    console.error("[Sales Report Excel] ❌ xlsx module not available");
    return res.status(503).json({ 
      message: "Excel export not available. Please install xlsx package: npm install xlsx" 
    });
  }
  console.log("[Sales Report Excel] ✅ xlsx module available");

  // Check SQL Server connection
  try {
    await sequelize.authenticate();
    console.log("[Sales Report Excel] ✅ Database connected");
  } catch (dbError) {
    console.error("[Sales Report Excel] ❌ Database connection error:", dbError.message);
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const { from, to } = req.query;
    console.log("[Sales Report Excel] Processing date range:", { from, to });
    
    // Default to last 30 days if no date range provided
    const endDate = to ? dayjs(to).endOf("day").toDate() : dayjs().endOf("day").toDate();
    const startDate = from ? dayjs(from).startOf("day").toDate() : dayjs().subtract(30, "day").startOf("day").toDate();

    console.log("[Sales Report Excel] Date range:", {
      start: dayjs(startDate).format("YYYY-MM-DD HH:mm:ss"),
      end: dayjs(endDate).format("YYYY-MM-DD HH:mm:ss")
    });

    // Get all sales in the date range
    console.log("[Sales Report Excel] Fetching sales from database...");
    const sales = await Sale.findAll({
      where: {
        companyId: req.companyId, // ✅ Filter by companyId
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['date', 'DESC']],
      raw: false // Important: raw: false to get model instances with getters
    });
    console.log(`[Sales Report Excel] ✅ Found ${sales.length} sales records`);
    
    // Debug: Check first sale's items structure
    if (sales.length > 0) {
      const firstSale = sales[0];
      console.log(`[Sales Report Excel] DEBUG - First sale ID: ${firstSale.id}`);
      console.log(`[Sales Report Excel] DEBUG - First sale items via getter:`, typeof firstSale.items, Array.isArray(firstSale.items) ? firstSale.items.length : 'not array');
      console.log(`[Sales Report Excel] DEBUG - First sale raw items:`, typeof firstSale.getDataValue('items'), firstSale.getDataValue('items')?.substring?.(0, 100) || firstSale.getDataValue('items'));
    }

    // Group sales by day (same logic as daily-report endpoint)
    console.log("[Sales Report Excel] Grouping sales by day...");
    const dailyReport = {};
    
    sales.forEach(sale => {
      const saleData = sale.get({ plain: true });
      const saleDate = dayjs(saleData.date).format("YYYY-MM-DD");
      
      if (!dailyReport[saleDate]) {
        dailyReport[saleDate] = {
          date: saleDate,
          sales: [],
          totalSales: 0,
          totalVAT: 0,
          totalItems: 0,
          transactionCount: 0
        };
      }
      
      dailyReport[saleDate].sales.push(saleData);
      dailyReport[saleDate].totalSales += parseFloat(saleData.totalSales || 0);
      dailyReport[saleDate].totalVAT += parseFloat(saleData.totalVAT || 0);
      dailyReport[saleDate].transactionCount += 1;
      
      if (Array.isArray(saleData.items)) {
        saleData.items.forEach(item => {
          dailyReport[saleDate].totalItems += parseInt(item.quantity || 0, 10);
        });
      }
    });

    // Prepare data for Excel
    console.log("[Sales Report Excel] Creating Excel workbook...");
    const workbook = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ["Daily Sales Report"],
      ["Period", `${dayjs(startDate).format("YYYY-MM-DD")} to ${dayjs(endDate).format("YYYY-MM-DD")}`],
      [""],
      ["Date", "Transactions", "Items Sold", "VAT (AED)", "Total Sales (AED)"]
    ];

    Object.values(dailyReport)
      .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
      .forEach(day => {
        summaryData.push([
          dayjs(day.date).format("YYYY-MM-DD"),
          day.transactionCount,
          day.totalItems,
          parseFloat(day.totalVAT).toFixed(2),
          parseFloat(day.totalSales).toFixed(2)
        ]);
      });

    // Add totals row
    const totals = Object.values(dailyReport).reduce((acc, day) => {
      acc.totalSales += day.totalSales;
      acc.totalVAT += day.totalVAT;
      acc.totalItems += day.totalItems;
      acc.transactionCount += day.transactionCount;
      return acc;
    }, { totalSales: 0, totalVAT: 0, totalItems: 0, transactionCount: 0 });

    summaryData.push([
      "TOTAL",
      totals.transactionCount,
      totals.totalItems,
      parseFloat(totals.totalVAT).toFixed(2),
      parseFloat(totals.totalSales).toFixed(2)
    ]);

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Daily Summary");

    // Detailed transactions sheet
    const detailData = [
      ["Date", "Time", "Sale ID", "Summary", "Item Name", "SKU", "Quantity", "Unit Price (AED)", "Line Total (AED)", "VAT (AED)"]
    ];

    sales.forEach(sale => {
      const saleDate = dayjs(sale.date);
      const saleId = sale.id;
      const saleSummary = sale.summary || `Sale #${saleId}`;
      
      // Get items - use model instance directly to trigger getter
      let items = null;
      
      try {
        // Access items property directly from model instance (triggers getter)
        items = sale.items;
        
        // If getter didn't work, try getting raw value and parsing
        if (!Array.isArray(items)) {
          const rawItems = sale.getDataValue('items');
          console.log(`[Sales Report Excel] Sale ${saleId} - raw items type: ${typeof rawItems}, length: ${rawItems?.length || 'N/A'}`);
          
          if (typeof rawItems === 'string') {
            try {
              items = JSON.parse(rawItems);
              console.log(`[Sales Report Excel] Sale ${saleId} - parsed ${items?.length || 0} items from JSON string`);
            } catch (parseError) {
              console.error(`[Sales Report Excel] Sale ${saleId} - JSON parse error:`, parseError.message);
              console.error(`[Sales Report Excel] Sale ${saleId} - Raw string (first 200 chars):`, rawItems?.substring(0, 200));
              items = [];
            }
          } else if (Array.isArray(rawItems)) {
            items = rawItems;
            console.log(`[Sales Report Excel] Sale ${saleId} - got ${items.length} items from raw array`);
          } else {
            console.warn(`[Sales Report Excel] Sale ${saleId} - raw items is not string or array:`, typeof rawItems);
            items = [];
          }
        } else {
          console.log(`[Sales Report Excel] Sale ${saleId} - got ${items.length} items from model getter`);
        }
      } catch (error) {
        console.error(`[Sales Report Excel] Sale ${saleId} - error getting items:`, error.message);
        items = [];
      }
      
      // Ensure items is an array
      if (!Array.isArray(items)) {
        console.warn(`[Sales Report Excel] Sale ${saleId} - items is not an array. Type: ${typeof items}`);
        items = [];
      }
      
      console.log(`[Sales Report Excel] Sale ${saleId} - Final items count: ${items.length}`);
      
      if (items.length > 0) {
        // Add each item as a separate row
        items.forEach((item, idx) => {
          const itemName = item.name || "Unknown Item";
          // SKU might not be in sale items, use item ID if SKU not available
          const itemSku = item.sku || (item.item ? `ID:${item.item}` : "") || "";
          const quantity = item.quantity || 0;
          const unitPrice = parseFloat(item.unitPrice || 0);
          const lineTotal = parseFloat(item.lineTotal || (unitPrice * quantity));
          const vatAmount = parseFloat(item.vatAmount || 0);
          
          console.log(`[Sales Report Excel] Sale ${saleId} - Item ${idx + 1}: ${itemName}, Qty: ${quantity}, Price: ${unitPrice}, SKU: ${itemSku}`);
          
          const row = [
            saleDate.format("YYYY-MM-DD"),
            saleDate.format("HH:mm:ss"),
            saleId || "",
            idx === 0 ? saleSummary : "", // Show summary only on first item row
            itemName,
            itemSku,
            quantity,
            unitPrice.toFixed(2),
            lineTotal.toFixed(2),
            vatAmount.toFixed(2)
          ];
          
          console.log(`[Sales Report Excel] Sale ${saleId} - Row data:`, row);
          detailData.push(row);
        });
      } else {
        // If no items, still show the sale with totals
        console.warn(`[Sales Report Excel] Sale ${saleId} - No items found, showing totals only`);
        detailData.push([
          saleDate.format("YYYY-MM-DD"),
          saleDate.format("HH:mm:ss"),
          saleId || "",
          saleSummary,
          "No items found",
          "",
          "",
          "",
          parseFloat(sale.totalSales || 0).toFixed(2),
          parseFloat(sale.totalVAT || 0).toFixed(2)
        ]);
      }
    });
    
    // Add totals row at the end of detail sheet
    if (detailData.length > 1) { // More than just header
      const totals = sales.reduce((acc, sale) => {
        const saleData = sale.get({ plain: true });
        acc.totalSales += parseFloat(saleData.totalSales || 0);
        acc.totalVAT += parseFloat(saleData.totalVAT || 0);
        return acc;
      }, { totalSales: 0, totalVAT: 0 });
      
      detailData.push([]); // Empty row
      detailData.push([
        "TOTAL",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        totals.totalSales.toFixed(2),
        totals.totalVAT.toFixed(2)
      ]);
    }
    
    console.log(`[Sales Report Excel] Detail sheet will have ${detailData.length} rows (including header)`);
    console.log(`[Sales Report Excel] First few rows of detailData:`, detailData.slice(0, 5));
    
    const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
    
    // Log the sheet range to verify data was written
    console.log(`[Sales Report Excel] Detail sheet range:`, detailSheet['!ref']);
    console.log(`[Sales Report Excel] Detail sheet has ${Object.keys(detailSheet).filter(k => !k.startsWith('!')).length} cells`);
    
    XLSX.utils.book_append_sheet(workbook, detailSheet, "Transaction Details");

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    console.log(`[Sales Report Excel] Generated Excel file, size: ${excelBuffer.length} bytes`);

    // Set response headers
    const filename = `daily-sales-report-${dayjs(startDate).format("YYYY-MM-DD")}-to-${dayjs(endDate).format("YYYY-MM-DD")}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", excelBuffer.length);

    console.log(`[Sales Report Excel] Sending file: ${filename} (${excelBuffer.length} bytes)`);
    res.send(excelBuffer);
    console.log("[Sales Report Excel] ✅ File sent successfully");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("=".repeat(60));
    console.error("[Sales Report Excel] ❌ Error:", error);
    console.error("[Sales Report Excel] Error message:", error.message);
    console.error("[Sales Report Excel] Error stack:", error.stack);
    console.error("=".repeat(60));
    res.status(500).json({ message: "Failed to generate Excel report", error: error.message });
  }
});

// Daily sales report endpoint
router.get("/sales/daily-report", setTenantContext, async (req, res) => {
  console.log("=".repeat(60));
  console.log("📊 [DAILY SALES REPORT] GET /sales/daily-report");
  console.log("   Query params:", req.query);
  console.log("   Original URL:", req.originalUrl);
  console.log("   Path:", req.path);
  
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    console.error("[Sales Report] Database connection error:", dbError.message);
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const { from, to } = req.query;
    
    // Default to last 30 days if no date range provided
    const endDate = to ? dayjs(to).endOf("day").toDate() : dayjs().endOf("day").toDate();
    const startDate = from ? dayjs(from).startOf("day").toDate() : dayjs().subtract(30, "day").startOf("day").toDate();

    // Get all sales in the date range
    const sales = await Sale.findAll({
      where: {
        companyId: req.companyId, // ✅ Filter by companyId
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['date', 'DESC']],
      raw: false
    });

    // Group sales by day
    const dailyReport = {};
    
    sales.forEach(sale => {
      const saleData = sale.get({ plain: true });
      const saleDate = dayjs(saleData.date).format("YYYY-MM-DD");
      
      if (!dailyReport[saleDate]) {
        dailyReport[saleDate] = {
          date: saleDate,
          sales: [],
          totalSales: 0,
          totalVAT: 0,
          totalItems: 0,
          transactionCount: 0
        };
      }
      
      dailyReport[saleDate].sales.push(saleData);
      dailyReport[saleDate].totalSales += parseFloat(saleData.totalSales || 0);
      dailyReport[saleDate].totalVAT += parseFloat(saleData.totalVAT || 0);
      dailyReport[saleDate].transactionCount += 1;
      
      // Count items
      if (Array.isArray(saleData.items)) {
        saleData.items.forEach(item => {
          dailyReport[saleDate].totalItems += parseInt(item.quantity || 0, 10);
        });
      }
    });

    // Convert to array and sort by date (newest first)
    const reportArray = Object.values(dailyReport).sort((a, b) => 
      dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
    );

    // Calculate totals
    const totals = reportArray.reduce((acc, day) => {
      acc.totalSales += day.totalSales;
      acc.totalVAT += day.totalVAT;
      acc.totalItems += day.totalItems;
      acc.transactionCount += day.transactionCount;
      return acc;
    }, { totalSales: 0, totalVAT: 0, totalItems: 0, transactionCount: 0 });

    res.json({
      period: {
        from: dayjs(startDate).format("YYYY-MM-DD"),
        to: dayjs(endDate).format("YYYY-MM-DD")
      },
      dailyData: reportArray,
      totals
    });
  } catch (error) {
    console.error("[Sales Report] Error:", error);
    res.status(500).json({ message: "Failed to generate daily sales report" });
  }
});

router.get("/sales", setTenantContext, async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    console.warn("[Sales] SQL Server not connected, returning empty array");
    return res.json([]);
  }

  const { from, to } = req.query;
  const where = {
    companyId: req.companyId // ✅ Filter by companyId
  };

  if (from || to) {
    where.date = {};
    if (from) where.date[Op.gte] = new Date(from);
    if (to) where.date[Op.lte] = new Date(to);
  }

  try {
    const sales = await Sale.findAll({
      where,
      order: [['date', 'DESC']],
      raw: false
    });
    
    // Convert to plain objects
    const salesData = sales.map(sale => sale.get({ plain: true }));
    res.json(salesData);
  } catch (error) {
    console.error("Sales fetch error:", error.message);
    res.json([]);
  }
});

/**
 * GET /api/inventory/sales/:id/pdf
 * Generate and download receipt PDF
 */
router.get("/sales/:id/pdf", setTenantContext, async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database not available" });
  }

  try {
    const sale = await Sale.findOne({
      where: {
        id: req.params.id,
        companyId: req.companyId // ✅ Filter by companyId
      }
    });

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    const saleData = sale.get({ plain: true });
    
    // Parse items JSON if needed
    if (saleData.items && typeof saleData.items === 'string') {
      try {
        saleData.items = JSON.parse(saleData.items);
      } catch (e) {
        console.warn("[Receipt PDF] Could not parse items JSON:", e);
        saleData.items = [];
      }
    }
    
    // Ensure items is an array
    if (!Array.isArray(saleData.items)) {
      saleData.items = [];
    }
    
    // Normalize numeric fields
    saleData.totalSales = parseFloat(saleData.totalSales || saleData.subtotal || 0);
    saleData.totalVAT = parseFloat(saleData.totalVAT || saleData.vatAmount || 0);
    saleData.grandTotal = parseFloat(saleData.grandTotal || saleData.total || (saleData.totalSales + saleData.totalVAT));
    
    // Normalize item numeric fields
    saleData.items = saleData.items.map(item => ({
      ...item,
      quantity: parseFloat(item.quantity || 1),
      unitPrice: parseFloat(item.unitPrice || item.item?.salePrice || 0),
      total: parseFloat(item.total || item.lineTotal || (item.quantity * (item.unitPrice || 0)))
    }));
    
    // Get language from query parameter, default to 'en'
    const language = req.query.lang || 'en';
    
    // Get company information from database
    let companyInfo = null;
    try {
      const companyId = req.companyId || 1; // Use tenant context companyId
      const company = await Company.findOne({ where: { companyId } });
      if (company) {
        const companyData = company.get({ plain: true });
        companyInfo = {
          // For receipts, prioritize shopName if available, otherwise use name
          name: companyData.shopName || companyData.name || "BizEase UAE",
          shopName: companyData.shopName || companyData.name || "BizEase UAE",
          address: companyData.address || "",
          phone: companyData.phone || "",
          email: companyData.email || "",
          trn: companyData.trn || ""
        };
        console.log("[Receipt PDF] Company info from database:", {
          name: companyInfo.name,
          shopName: companyInfo.shopName,
          address: companyInfo.address,
          phone: companyInfo.phone,
          email: companyInfo.email,
          trn: companyInfo.trn
        });
      } else {
        console.warn("[Receipt PDF] Company not found in database, using default");
      }
    } catch (companyError) {
      console.warn("[Receipt PDF] Could not fetch company info:", companyError.message);
      console.error("[Receipt PDF] Company error stack:", companyError.stack);
    }
    
    console.log("[Receipt PDF] Generating PDF for sale:", saleData.id, "Language:", language, "CompanyInfo:", companyInfo ? "Present" : "Null");
    const pdfArrayBuffer = await generateReceiptPdf(saleData, language, companyInfo);
    
    // Convert ArrayBuffer to Buffer
    const pdfBuffer = Buffer.from(pdfArrayBuffer);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="receipt-${saleData.id}.pdf"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("[Receipt] PDF generation error:", error);
    console.error("[Receipt] PDF generation error stack:", error.stack);
    res.status(500).json({ message: "Failed to generate PDF", error: error.message });
  }
});

router.delete("/sales/:id", authorizeRole("admin"), setTenantContext, async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  // Use transaction to ensure stock restoration and sale deletion happen together
  const transaction = await sequelize.transaction();

  try {
    const sale = await Sale.findOne({
      where: {
        id: req.params.id,
        companyId: req.companyId // ✅ Filter by companyId
      },
      transaction
    });
    
    if (!sale) {
      await transaction.rollback();
      return res.status(404).json({ message: "Sale not found" });
    }

    const saleData = sale.get({ plain: true });
    const saleItems = saleData.items || [];

    // Restore stock for each item in the sale
    if (Array.isArray(saleItems) && saleItems.length > 0) {
      console.log(`[Sales Delete] Restoring stock for ${saleItems.length} items`);
      
      for (const saleItem of saleItems) {
        const itemId = saleItem.item;
        const quantity = parseInt(saleItem.quantity || 0, 10);
        
        if (itemId && quantity > 0) {
          const inventoryItem = await InventoryItem.findByPk(itemId, { transaction });
          
          if (inventoryItem) {
            const newStock = (inventoryItem.stock || 0) + quantity;
            await inventoryItem.update({ stock: newStock }, { transaction });
            console.log(`[Sales Delete] Restored ${quantity} units of ${inventoryItem.name} (new stock: ${newStock})`);
          } else {
            console.warn(`[Sales Delete] Inventory item ${itemId} not found, skipping stock restoration`);
          }
        }
      }
    }
    
    // Delete the sale
    await sale.destroy({ transaction });
    await transaction.commit();
    
    console.log(`[Sales Delete] Sale ${req.params.id} deleted successfully and stock restored`);
    res.json({ message: "Sale deleted successfully and stock restored" });
  } catch (error) {
    await transaction.rollback();
    console.error("[Sales] Delete error:", error);
    res.status(500).json({ message: "Failed to delete sale", error: error.message });
  }
});

router.post("/sales", authorizeRole("admin", "staff", "hr"), setTenantContext, async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    console.error("[Sales] Database connection error:", dbError.message);
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  // Use Sequelize transaction
  const transaction = await sequelize.transaction();

  try {
    const { items, date, summary, notes } = req.body;
    console.log("[Sales] Received sale request:", { itemsCount: items?.length, date, summary });

    if (!Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "Sale must include at least one item." });
    }

    // Get inventory items (convert IDs to numbers for SQL Server)
    const itemIds = items.map(item => parseInt(item.item, 10)).filter(id => !isNaN(id));
    if (itemIds.length === 0 || itemIds.length !== items.length) {
      await transaction.rollback();
      return res.status(400).json({ message: "Invalid item IDs provided." });
    }
    
    const inventoryItems = await InventoryItem.findAll({
      where: {
        companyId: req.companyId, // ✅ Filter by companyId
        id: {
          [Op.in]: itemIds
        }
      },
      transaction
    });

    if (inventoryItems.length !== items.length) {
      await transaction.rollback();
      return res.status(400).json({ message: "One or more inventory items not found." });
    }

    const saleItems = [];

    for (const saleItem of items) {
      const inventoryItem = inventoryItems.find(
        (it) => it.id === parseInt(saleItem.item)
      );

      if (!inventoryItem) {
        await transaction.rollback();
        return res.status(400).json({ message: "Inventory item mismatch." });
      }

      const quantity = Number(saleItem.quantity);
      if (Number.isNaN(quantity) || quantity <= 0) {
        await transaction.rollback();
        return res.status(400).json({ message: "Invalid sale quantity." });
      }

      if (inventoryItem.stock < quantity) {
        await transaction.rollback();
        return res
          .status(400)
          .json({ message: `Insufficient stock for ${inventoryItem.name}.` });
      }

      // Update stock
      await inventoryItem.update(
        { stock: inventoryItem.stock - quantity },
        { transaction }
      );

      saleItems.push({
        item: inventoryItem.id,
        name: inventoryItem.name,
        quantity,
        unitPrice: Number(saleItem.unitPrice) || inventoryItem.salePrice,
        vatRate: saleItem.vatRate != null ? Number(saleItem.vatRate) : 0.05
      });
    }

    const totals = calculateInvoiceTotals(saleItems);
    const saleItemsWithTotals = totals.items.map((calculatedItem, index) => ({
      item: saleItems[index].item,
      name: saleItems[index].name,
      quantity: calculatedItem.quantity,
      unitPrice: calculatedItem.unitPrice,
      vatRate: calculatedItem.vatRate,
      vatAmount: calculatedItem.vatAmount,
      lineTotal: calculatedItem.lineTotal
    }));

    const savedSale = await Sale.create(
      {
        date: date || new Date(),
        summary,
        notes,
        items: saleItemsWithTotals, // Store as JSON
        totalSales: Number(totals.grandTotal?.toFixed?.(2) ?? totals.grandTotal ?? 0),
        totalVAT: Number(totals.vatAmount?.toFixed?.(2) ?? totals.vatAmount ?? 0),
        companyId: req.companyId, // ✅ Set companyId
        createdByUid: req.user.uid,
        createdByDisplayName: req.user.displayName,
        createdByEmail: req.user.email
      },
      { transaction }
    );

    await transaction.commit();

    const saleData = savedSale.get({ plain: true });
    console.log("[Sales] Sale created successfully:", { id: saleData.id, total: saleData.totalSales });

    // Auto-create journal entry for sale (cash sale = revenue)
    try {
      const { createJournalEntryFromSale, postJournalEntry } = require("../server/services/accountingService");
      const companyId = 1; // TODO: Get from user context
      
      console.log("[Sales] Creating journal entry for sale:", saleData.id);
      console.log("[Sales] Sale data structure:", {
        id: saleData.id,
        totalSales: saleData.totalSales,
        totalVAT: saleData.totalVAT,
        date: saleData.date,
        summary: saleData.summary
      });
      
      const journalEntry = await createJournalEntryFromSale(saleData, companyId);
      
      if (journalEntry) {
        console.log("[Sales] ✓ Journal entry created:", journalEntry.entryNumber || journalEntry.id);
        // Auto-post the journal entry
        await postJournalEntry(journalEntry.id, req.user.email || req.user.uid, companyId);
        console.log("[Sales] ✓ Journal entry posted:", journalEntry.entryNumber || journalEntry.id);
      } else {
        console.warn("[Sales] ⚠️ Journal entry was not created (returned null/undefined)");
      }
    } catch (accountingError) {
      console.error("[Sales] ❌ Accounting integration failed:", accountingError.message);
      console.error("[Sales] Error stack:", accountingError.stack);
      console.error("[Sales] Error details:", {
        name: accountingError.name,
        message: accountingError.message,
        code: accountingError.code
      });
      // Don't fail the sale creation if accounting fails, but log it clearly
    }

    res.status(201).json(saleData);
  } catch (error) {
    console.error("[Sales] Create error:", error);
    console.error("[Sales] Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    await transaction.rollback();
    const errorMessage = error.message || "Failed to record sale";
    res.status(500).json({ message: errorMessage });
  }
});

// Backfill journal entries for existing sales that don't have them
router.post("/sales/backfill-journal-entries", authorizeRole("admin"), setTenantContext, async (req, res) => {
  try {
    const { createJournalEntryFromSale, postJournalEntry } = require("../server/services/accountingService");
    const { JournalEntry } = require("../models/accountingAssociations");
    const companyId = req.companyId; // ✅ Get from tenant context

    console.log("[Sales] Starting backfill of journal entries for existing sales...");

    // Get all sales for this company
    const allSales = await Sale.findAll({
      where: {
        companyId: req.companyId // ✅ Filter by companyId
      },
      order: [['date', 'ASC'], ['id', 'ASC']],
      raw: false
    });

    const results = {
      totalSales: allSales.length,
      processed: 0,
      created: 0,
      skipped: 0,
      errors: []
    };

    for (const sale of allSales) {
      try {
        const saleData = sale.get({ plain: true });
        const saleId = saleData.id;

        // Check if journal entry already exists
        const existingEntry = await JournalEntry.findOne({
          where: {
            companyId,
            referenceType: 'sale',
            referenceId: saleId
          }
        });

        if (existingEntry) {
          console.log(`[Sales] Sale ${saleId} already has journal entry, skipping`);
          results.skipped++;
          continue;
        }

        // Create journal entry for this sale
        console.log(`[Sales] Creating journal entry for sale ${saleId}...`);
        const journalEntry = await createJournalEntryFromSale(saleData, companyId);

        if (journalEntry) {
          // Auto-post the journal entry
          await postJournalEntry(journalEntry.id, req.user.email || req.user.uid, companyId);
          console.log(`[Sales] ✓ Journal entry created and posted for sale ${saleId}`);
          results.created++;
        } else {
          console.warn(`[Sales] ⚠️ Journal entry was not created for sale ${saleId} (returned null)`);
          results.errors.push({ saleId, error: 'Journal entry creation returned null' });
        }

        results.processed++;
      } catch (error) {
        console.error(`[Sales] ❌ Error processing sale ${sale.id}:`, error.message);
        results.errors.push({
          saleId: sale.id,
          error: error.message
        });
        results.processed++;
      }
    }

    console.log("[Sales] Backfill completed:", results);
    res.json({
      message: `Backfill completed: ${results.created} created, ${results.skipped} skipped, ${results.errors.length} errors`,
      results
    });
  } catch (error) {
    console.error("[Sales] Backfill error:", error);
    res.status(500).json({ 
      message: "Failed to backfill journal entries",
      error: error.message 
    });
  }
});

module.exports = router;
