const express = require("express");
const { sequelize } = require("../server/config/database");
const { Op } = require("sequelize");
const Expense = require("../models/Expense");
const { authorizeRole } = require("../server/middleware/authMiddleware");
const { setTenantContext } = require("../server/middleware/tenantMiddleware");
const { moduleAccessCheck } = require("../server/middleware/moduleAccessMiddleware");

const router = express.Router();

router.get("/", authorizeRole("admin", "accountant"), setTenantContext, moduleAccessCheck("expenses"), async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    console.warn("[Expense] SQL Server not connected, returning empty array");
    return res.json([]);
  }

  const { from, to, category, supplier, vatApplicable, paymentType, search } = req.query;
  const where = {
    companyId: req.companyId, // ✅ Filter by companyId
    deletedAt: null // Exclude soft-deleted expenses
  };

  // Only Admin and Accountant have access to expenses (enforced by authorizeRole middleware)

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

router.post("/", authorizeRole("admin", "accountant"), async (req, res) => {
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
      companyId: req.companyId, // ✅ Assign companyId
      amount: baseAmount,
      vatApplicable: vatApplicable || false,
      vatAmount: parseFloat(vatAmount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      createdByUid: req.user.uid,
      createdByDisplayName: req.user.displayName || req.user.email || "",
      createdByEmail: req.user.email
    });

    // Auto-create journal entry for expense
    try {
      const { createJournalEntryFromExpense, postJournalEntry } = require("../server/services/accountingService");
      const companyId = 1; // TODO: Get from user context
      
      console.log("[Expense] Creating journal entry for expense:", expense.id);
      console.log("[Expense] Expense data structure:", {
        id: expense.id,
        amount: expense.amount,
        vatAmount: expense.vatAmount,
        totalAmount: expense.totalAmount,
        date: expense.date,
        category: expense.category
      });
      
      const journalEntry = await createJournalEntryFromExpense(expense.get({ plain: true }), companyId);
      
      if (journalEntry) {
        console.log("[Expense] ✓ Journal entry created:", journalEntry.entryNumber || journalEntry.id);
        // Auto-post the journal entry
        await postJournalEntry(journalEntry.id, req.user.email || req.user.uid, companyId);
        console.log("[Expense] ✓ Journal entry posted:", journalEntry.entryNumber || journalEntry.id);
      } else {
        console.warn("[Expense] ⚠️ Journal entry was not created (returned null/undefined)");
      }
    } catch (accountingError) {
      console.error("[Expense] ❌ Accounting integration failed:", accountingError.message);
      console.error("[Expense] Error stack:", accountingError.stack);
      console.error("[Expense] Error details:", {
        name: accountingError.name,
        message: accountingError.message,
        code: accountingError.code
      });
      // Don't fail the expense creation if accounting fails, but log it clearly
    }

    res.status(201).json(expense.get({ plain: true }));
  } catch (error) {
    console.error("[Expense] Create error:", error);
    res.status(500).json({ message: "Failed to create expense" });
  }
});

// Backfill journal entries for existing expenses that don't have them
// IMPORTANT: This must be defined BEFORE /:id routes to avoid route conflicts
router.post("/backfill-journal-entries", authorizeRole("admin"), async (req, res) => {
  try {
    const { createJournalEntryFromExpense, postJournalEntry } = require("../server/services/accountingService");
    const { JournalEntry } = require("../models/accountingAssociations");
    const companyId = 1; // TODO: Get from user context

    console.log("[Expense] Starting backfill of journal entries for existing expenses...");

    // Get all expenses (excluding soft-deleted)
    const allExpenses = await Expense.findAll({
      where: { deletedAt: null },
      order: [['date', 'ASC'], ['id', 'ASC']],
      raw: false
    });

    const results = {
      totalExpenses: allExpenses.length,
      processed: 0,
      created: 0,
      skipped: 0,
      errors: []
    };

    for (const expense of allExpenses) {
      try {
        const expenseData = expense.get({ plain: true });
        const expenseId = expenseData.id;

        // Check if journal entry already exists
        const existingEntry = await JournalEntry.findOne({
          where: {
            companyId,
            referenceType: 'expense',
            referenceId: expenseId
          }
        });

        if (existingEntry) {
          console.log(`[Expense] Expense ${expenseId} already has journal entry, skipping`);
          results.skipped++;
          continue;
        }

        // Create journal entry for this expense
        console.log(`[Expense] Creating journal entry for expense ${expenseId}...`);
        console.log(`[Expense] Expense data:`, {
          id: expenseData.id,
          amount: expenseData.amount,
          vatAmount: expenseData.vatAmount,
          totalAmount: expenseData.totalAmount,
          category: expenseData.category,
          date: expenseData.date
        });

        const journalEntry = await createJournalEntryFromExpense(expenseData, companyId);

        if (journalEntry) {
          console.log(`[Expense] Journal entry created, ID: ${journalEntry.id}, Entry Number: ${journalEntry.entryNumber || 'N/A'}`);
          
          // Auto-post the journal entry
          try {
            await postJournalEntry(journalEntry.id, req.user.email || req.user.uid, companyId);
            console.log(`[Expense] ✓ Journal entry created and posted for expense ${expenseId}`);
            results.created++;
          } catch (postError) {
            console.error(`[Expense] ❌ Failed to post journal entry ${journalEntry.id}:`, postError.message);
            results.errors.push({
              expenseId,
              error: `Journal entry created but posting failed: ${postError.message}`
            });
          }
        } else {
          console.warn(`[Expense] ⚠️ Journal entry was not created for expense ${expenseId} (returned null - likely amount is 0 or negative)`);
          results.errors.push({ expenseId, error: 'Journal entry creation returned null (expense amount may be 0 or negative)' });
        }

        results.processed++;
      } catch (error) {
        console.error(`[Expense] ❌ Error processing expense ${expense.id}:`, error.message);
        console.error(`[Expense] Error stack:`, error.stack);
        console.error(`[Expense] Error details:`, {
          name: error.name,
          message: error.message,
          code: error.code
        });
        results.errors.push({
          expenseId: expense.id,
          error: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
        results.processed++;
      }
    }

    console.log("[Expense] Backfill completed:", results);
    res.json({
      message: `Backfill completed: ${results.created} created, ${results.skipped} skipped, ${results.errors.length} errors`,
      results
    });
  } catch (error) {
    console.error("[Expense] Backfill error:", error);
    res.status(500).json({ 
      message: "Failed to backfill journal entries",
      error: error.message 
    });
  }
});

router.put("/:id", authorizeRole("admin", "accountant"), setTenantContext, async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const where = {
      id: req.params.id,
      companyId: req.companyId, // ✅ Filter by companyId
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

router.delete("/:id", authorizeRole("admin", "accountant"), setTenantContext, async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const where = {
      id: req.params.id,
      companyId: req.companyId, // ✅ Filter by companyId
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
router.get("/:id", authorizeRole("admin", "accountant"), async (req, res) => {
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
