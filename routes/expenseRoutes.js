const express = require("express");
const { sequelize } = require("../server/config/database");
const { Op } = require("sequelize");
const Expense = require("../models/Expense");
const { authorizeRole } = require("../server/middleware/authMiddleware");

const router = express.Router();

router.get("/", async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    console.warn("[Expense] SQL Server not connected, returning empty array");
    return res.json([]);
  }

  const { from, to, category, supplier, vatApplicable, paymentType, search } = req.query;
  const where = {
    deletedAt: null // Exclude soft-deleted expenses
  };

  // Permission logic: Staff can only see their own expenses, Admin sees all
  if (req.user && req.user.role === "staff") {
    where.createdByUid = req.user.uid;
  }

  // Date range filter
  if (from || to) {
    where.date = {};
    if (from) where.date[Op.gte] = new Date(from);
    if (to) where.date[Op.lte] = new Date(to);
  }

  // Category filter
  if (category) {
    where.category = {
      [Op.like]: `%${category}%`
    };
  }

  // Supplier filter
  if (supplier) {
    where.supplier = {
      [Op.like]: `%${supplier}%`
    };
  }

  // VAT applicable filter
  if (vatApplicable !== undefined && vatApplicable !== "") {
    where.vatApplicable = vatApplicable === "true" || vatApplicable === true;
  }

  // Payment type filter
  if (paymentType) {
    where.paymentType = paymentType;
  }

  // Text search (searches in description, category, supplier)
  if (search) {
    where[Op.or] = [
      { description: { [Op.like]: `%${search}%` } },
      { category: { [Op.like]: `%${search}%` } },
      { supplier: { [Op.like]: `%${search}%` } }
    ];
  }

  try {
    const expenses = await Expense.findAll({
      where,
      order: [['date', 'DESC']],
      raw: false
    });
    
    // Convert to plain objects
    const expenseData = expenses.map(exp => exp.get({ plain: true }));
    res.json(expenseData);
  } catch (error) {
    console.error("[Expense] Fetch error:", error.message);
    console.error("[Expense] Full error:", error);
    res.status(500).json({ message: "Failed to fetch expenses", error: error.message });
  }
});

router.post("/", authorizeRole("admin", "staff"), async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const { amount, vatApplicable, ...rest } = req.body;
    const baseAmount = parseFloat(amount) || 0;
    
    // Calculate VAT and total
    const vatAmount = vatApplicable ? baseAmount * 0.05 : 0;
    const totalAmount = baseAmount + vatAmount;

    const expense = await Expense.create({
      ...rest,
      amount: baseAmount,
      vatApplicable: vatApplicable || false,
      vatAmount: parseFloat(vatAmount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      createdByUid: req.user.uid,
      createdByDisplayName: req.user.displayName || req.user.email || "",
      createdByEmail: req.user.email
    });
    res.status(201).json(expense.get({ plain: true }));
  } catch (error) {
    console.error("[Expense] Create error:", error);
    res.status(500).json({ message: "Failed to create expense" });
  }
});

router.put("/:id", authorizeRole("admin", "staff"), async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const where = {
      id: req.params.id,
      deletedAt: null
    };

    // Permission logic: Staff can only edit their own expenses
    if (req.user.role === "staff") {
      where.createdByUid = req.user.uid;
    }

    const expense = await Expense.findOne({ where });
    
    if (!expense) {
      return res.status(404).json({ message: "Expense not found or you don't have permission" });
    }
    
    const { amount, vatApplicable, ...rest } = req.body;
    const baseAmount = parseFloat(amount) || expense.amount;
    
    // Calculate VAT and total
    const isVatApplicable = vatApplicable !== undefined ? vatApplicable : expense.vatApplicable;
    const vatAmount = isVatApplicable ? baseAmount * 0.05 : 0;
    const totalAmount = baseAmount + vatAmount;

    await expense.update({
      ...rest,
      amount: baseAmount,
      vatApplicable: isVatApplicable,
      vatAmount: parseFloat(vatAmount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      updatedByUid: req.user.uid,
      updatedByDisplayName: req.user.displayName,
      updatedByEmail: req.user.email
    });
    
    res.json(expense.get({ plain: true }));
  } catch (error) {
    console.error("[Expense] Update error:", error);
    res.status(500).json({ message: "Failed to update expense" });
  }
});

router.delete("/:id", authorizeRole("admin", "staff"), async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const where = {
      id: req.params.id,
      deletedAt: null
    };

    // Permission logic: Staff can only delete their own expenses
    if (req.user.role === "staff") {
      where.createdByUid = req.user.uid;
    }

    const expense = await Expense.findOne({ where });
    
    if (!expense) {
      return res.status(404).json({ message: "Expense not found or you don't have permission" });
    }
    
    // Soft delete: set deletedAt instead of destroying
    await expense.update({
      deletedAt: new Date(),
      updatedByUid: req.user.uid,
      updatedByDisplayName: req.user.displayName,
      updatedByEmail: req.user.email
    });
    
    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("[Expense] Delete error:", error);
    res.status(500).json({ message: "Failed to delete expense" });
  }
});

// GET /api/expenses/:id - View single expense (must be after other routes)
router.get("/:id", async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const where = {
      id: req.params.id,
      deletedAt: null
    };

    // Permission logic: Staff can only view their own expenses
    if (req.user && req.user.role === "staff") {
      where.createdByUid = req.user.uid;
    }

    const expense = await Expense.findOne({ where });
    
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    
    res.json(expense.get({ plain: true }));
  } catch (error) {
    console.error("[Expense] Fetch error:", error);
    res.status(500).json({ message: "Failed to fetch expense" });
  }
});

module.exports = router;
