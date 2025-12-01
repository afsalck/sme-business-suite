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
const { calculateInvoiceTotals } = require("../server/utils/invoiceUtils");
const { authorizeRole } = require("../server/middleware/authMiddleware");

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

router.get("/", async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    console.warn("[Inventory] SQL Server not connected, returning empty array");
    return res.json([]);
  }

  try {
    const items = await InventoryItem.findAll({
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

router.post("/", authorizeRole("admin"), async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const item = await InventoryItem.create({
      ...req.body,
      createdByUid: req.user.uid,
      createdByDisplayName: req.user.displayName,
      createdByEmail: req.user.email
    });
    res.status(201).json(item.get({ plain: true }));
  } catch (error) {
    console.error("[Inventory] Create error:", error);
    res.status(500).json({ message: "Failed to create inventory item" });
  }
});

router.put("/:id", authorizeRole("admin"), async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const item = await InventoryItem.findByPk(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    
    await item.update(req.body);
    res.json(item.get({ plain: true }));
  } catch (error) {
    console.error("[Inventory] Update error:", error);
    res.status(500).json({ message: "Failed to update inventory item" });
  }
});

router.delete("/:id", authorizeRole("admin"), async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const item = await InventoryItem.findByPk(req.params.id);
    
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
router.get("/sales/daily-report/excel", (req, res, next) => {
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
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['date', 'DESC']],
      raw: false
    });
    console.log(`[Sales Report Excel] ✅ Found ${sales.length} sales records`);

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
      ["Date", "Time", "Summary", "Items", "Quantity", "Unit Price", "VAT", "Total"]
    ];

    sales.forEach(sale => {
      const saleData = sale.get({ plain: true });
      const saleDate = dayjs(saleData.date);
      
      if (Array.isArray(saleData.items) && saleData.items.length > 0) {
        saleData.items.forEach((item, idx) => {
          detailData.push([
            saleDate.format("YYYY-MM-DD"),
            saleDate.format("HH:mm"),
            idx === 0 ? (saleData.summary || `Sale #${saleData.id}`) : "",
            item.name || "",
            item.quantity || 0,
            parseFloat(item.unitPrice || 0).toFixed(2),
            parseFloat(item.vatAmount || 0).toFixed(2),
            parseFloat(item.lineTotal || 0).toFixed(2)
          ]);
        });
      } else {
        // If no items, still show the sale
        detailData.push([
          saleDate.format("YYYY-MM-DD"),
          saleDate.format("HH:mm"),
          saleData.summary || `Sale #${saleData.id}`,
          "",
          "",
          "",
          parseFloat(saleData.totalVAT || 0).toFixed(2),
          parseFloat(saleData.totalSales || 0).toFixed(2)
        ]);
      }
    });

    const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
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
router.get("/sales/daily-report", async (req, res) => {
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

router.get("/sales", async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    console.warn("[Sales] SQL Server not connected, returning empty array");
    return res.json([]);
  }

  const { from, to } = req.query;
  const where = {};

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

router.delete("/sales/:id", authorizeRole("admin"), async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  // Use transaction to ensure stock restoration and sale deletion happen together
  const transaction = await sequelize.transaction();

  try {
    const sale = await Sale.findByPk(req.params.id, { transaction });
    
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

router.post("/sales", authorizeRole("admin"), async (req, res) => {
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
        createdByUid: req.user.uid,
        createdByDisplayName: req.user.displayName,
        createdByEmail: req.user.email
      },
      { transaction }
    );

    await transaction.commit();

    const saleData = savedSale.get({ plain: true });
    console.log("[Sales] Sale created successfully:", { id: saleData.id, total: saleData.totalSales });
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

module.exports = router;
