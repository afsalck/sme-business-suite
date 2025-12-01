const express = require("express");
const { sequelize } = require("../server/config/database");
const { Op } = require("sequelize");
const dayjs = require("dayjs");
const Invoice = require("../models/Invoice");
const { computeInvoiceVat } = require("../server/services/vatService");
const { generateInvoiceNumber } = require("../server/utils/invoiceNumberGenerator");
const { generateInvoicePdf } = require("../server/services/pdfService");
const { sendInvoiceEmail } = require("../server/services/invoiceEmailService");
const { authorizeRole } = require("../server/middleware/authMiddleware");

const router = express.Router();

/**
 * Calculate due date based on payment terms
 */
function calculateDueDate(issueDate, paymentTerms) {
  const issue = dayjs(issueDate);
  let days = 30; // default

  if (paymentTerms) {
    const match = paymentTerms.match(/(\d+)/);
    if (match) {
      days = parseInt(match[1], 10);
    }
  }

  return issue.add(days, "day").toDate();
}

/**
 * GET /api/invoices
 * List all invoices with filtering, sorting, and pagination
 */
router.get("/", async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    console.warn("[Invoice] SQL Server not connected, returning empty array");
    return res.json({ invoices: [], total: 0, page: 1, limit: 50 });
  }

  const {
    from,
    to,
    customer,
    status,
    page = 1,
    limit = 50,
    sortBy = "issueDate",
    sortOrder = "DESC"
  } = req.query;

  const where = {};
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Date filtering
  if (from || to) {
    where.issueDate = {};
    if (from) {
      where.issueDate[Op.gte] = new Date(from);
    }
    if (to) {
      where.issueDate[Op.lte] = new Date(to);
    }
  }

  // Customer search
  if (customer) {
    where[Op.or] = [
      { customerName: { [Op.like]: `%${customer}%` } },
      { customerEmail: { [Op.like]: `%${customer}%` } },
      { invoiceNumber: { [Op.like]: `%${customer}%` } }
    ];
  }

  // Status filter
  if (status) {
    where.status = status;
  }

  try {
    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset,
      raw: false
    });

    const invoiceData = invoices.map((inv) => {
      const data = inv.get({ plain: true });
      // Check if overdue
      if (data.status !== "paid" && data.status !== "cancelled" && data.dueDate) {
        const isOverdue = dayjs().isAfter(dayjs(data.dueDate), "day");
        if (isOverdue && data.status !== "overdue") {
          // Auto-update status in background (don't wait)
          inv.update({ status: "overdue" }).catch(() => {});
          data.status = "overdue";
        }
      }
      return data;
    });

    res.json({
      invoices: invoiceData,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / parseInt(limit))
    });
  } catch (error) {
    console.error("[Invoice] Fetch error:", error.message);
    res.status(500).json({ message: "Failed to fetch invoices", error: error.message });
  }
});

/**
 * GET /api/invoices/:id
 * Get single invoice by ID
 */
router.get("/:id", async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database not available" });
  }

  try {
    const invoice = await Invoice.findByPk(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const invoiceData = invoice.get({ plain: true });
    
    // Check if overdue
    if (invoiceData.status !== "paid" && invoiceData.status !== "cancelled" && invoiceData.dueDate) {
      const isOverdue = dayjs().isAfter(dayjs(invoiceData.dueDate), "day");
      if (isOverdue && invoiceData.status !== "overdue") {
        await invoice.update({ status: "overdue" });
        invoiceData.status = "overdue";
      }
    }

    res.json(invoiceData);
  } catch (error) {
    console.error("[Invoice] Fetch by ID error:", error.message);
    res.status(500).json({ message: "Failed to fetch invoice" });
  }
});

/**
 * GET /api/invoices/:id/pdf
 * Generate and download invoice PDF
 */
router.get("/:id/pdf", async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database not available" });
  }

  try {
    const invoice = await Invoice.findByPk(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const invoiceData = invoice.get({ plain: true });
    
    // Parse items JSON if needed
    if (invoiceData.items && typeof invoiceData.items === 'string') {
      try {
        invoiceData.items = JSON.parse(invoiceData.items);
      } catch (e) {
        console.warn("[Invoice PDF] Could not parse items JSON:", e);
      }
    }
    
    console.log("[Invoice PDF] Generating PDF for invoice:", invoiceData.invoiceNumber);
    const pdfArrayBuffer = await generateInvoicePdf(invoiceData);
    
    // Convert ArrayBuffer to Buffer
    const pdfBuffer = Buffer.from(pdfArrayBuffer);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice-${invoiceData.invoiceNumber}.pdf"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("[Invoice] PDF generation error:", error);
    console.error("[Invoice] PDF generation error stack:", error.stack);
    res.status(500).json({ message: "Failed to generate PDF", error: error.message });
  }
});

/**
 * POST /api/invoices
 * Create new invoice
 */
router.post("/", authorizeRole("admin"), async (req, res) => {
  console.log("[Invoice] Creating invoice for:", req.body.customerName);

  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      items,
      notes,
      issueDate,
      dueDate,
      paymentTerms,
      status,
      language,
      currency,
      totalDiscount,
      supplierTRN,
      customerTRN,
      vatType
    } = req.body;

    // Validation
    if (!customerName) {
      return res.status(400).json({ message: "Customer name is required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Invoice must include at least one item" });
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Calculate due date if not provided
    // Ensure dates are proper Date objects for SQL Server
    let finalIssueDate;
    if (issueDate) {
      finalIssueDate = new Date(issueDate);
      // Validate date
      if (isNaN(finalIssueDate.getTime())) {
        return res.status(400).json({ message: "Invalid issue date format" });
      }
    } else {
      finalIssueDate = new Date();
    }

    let finalDueDate;
    if (dueDate) {
      finalDueDate = new Date(dueDate);
      // Validate date
      if (isNaN(finalDueDate.getTime())) {
        return res.status(400).json({ message: "Invalid due date format" });
      }
    } else {
      finalDueDate = calculateDueDate(finalIssueDate, paymentTerms || "30 days");
    }

    const vatBreakdown = await computeInvoiceVat({
      ...req.body,
      items,
      vatType: vatType || "standard",
      supplierTRN,
      customerTRN,
      totalDiscount: totalDiscount || 0
    });

    const invoiceData = {
      invoiceNumber,
      customerName,
      customerEmail: customerEmail || null,
      customerPhone: customerPhone || null,
      supplierTRN: supplierTRN || null,
      customerTRN: customerTRN || null,
      notes: notes || null,
      issueDate: finalIssueDate, // Already a Date object
      dueDate: finalDueDate, // Already a Date object
      paymentTerms: paymentTerms || "30 days",
      status: status || "draft",
      language: language || "en",
      currency: currency || "AED",
      items: vatBreakdown.items,
      subtotal: vatBreakdown.subtotal,
      totalDiscount: vatBreakdown.discountTotal,
      vatAmount: vatBreakdown.vatAmount,
      total: vatBreakdown.totalWithVAT,
      totalWithVAT: vatBreakdown.totalWithVAT,
      vatType: vatBreakdown.vatType,
      taxableSubtotal: vatBreakdown.taxableSubtotal,
      zeroRatedSubtotal: vatBreakdown.zeroRatedSubtotal,
      exemptSubtotal: vatBreakdown.exemptSubtotal,
      discountTotal: vatBreakdown.discountTotal,
      createdByUid: req.user.uid,
      createdByDisplayName: req.user.displayName || null,
      createdByEmail: req.user.email || null
    };

    console.log("[Invoice] Saving invoice:", invoiceNumber);
    
    // Ensure dates are Date objects (not strings) for Sequelize/SQL Server
    // SQL Server requires proper Date objects, not ISO strings
    if (invoiceData.issueDate) {
      if (!(invoiceData.issueDate instanceof Date)) {
        invoiceData.issueDate = new Date(invoiceData.issueDate);
      }
      // Ensure it's a valid date
      if (isNaN(invoiceData.issueDate.getTime())) {
        return res.status(400).json({ message: "Invalid issue date" });
      }
    }
    
    if (invoiceData.dueDate) {
      if (!(invoiceData.dueDate instanceof Date)) {
        invoiceData.dueDate = new Date(invoiceData.dueDate);
      }
      // Ensure it's a valid date
      if (isNaN(invoiceData.dueDate.getTime())) {
        return res.status(400).json({ message: "Invalid due date" });
      }
    }
    
    console.log("[Invoice] Issue date:", invoiceData.issueDate, "Type:", typeof invoiceData.issueDate);
    console.log("[Invoice] Due date:", invoiceData.dueDate, "Type:", typeof invoiceData.dueDate);
    
    // SQL Server datetime compatibility fix
    // The problem: SQL Server is receiving dates in a format it can't parse
    // Solution: Ensure dates are Date objects and let Sequelize handle the conversion
    // But we need to make sure they're in local time, not UTC with timezone
    
    // Convert dates to local time strings, then back to Date objects
    // This removes timezone information that SQL Server datetime doesn't support
    if (invoiceData.issueDate) {
      const d = new Date(invoiceData.issueDate);
      // Get local date components
      const year = d.getFullYear();
      const month = d.getMonth();
      const day = d.getDate();
      const hours = d.getHours();
      const minutes = d.getMinutes();
      const seconds = d.getSeconds();
      // Create new date in local timezone (no UTC conversion)
      invoiceData.issueDate = new Date(year, month, day, hours, minutes, seconds);
    }
    
    if (invoiceData.dueDate) {
      const d = new Date(invoiceData.dueDate);
      const year = d.getFullYear();
      const month = d.getMonth();
      const day = d.getDate();
      const hours = d.getHours();
      const minutes = d.getMinutes();
      const seconds = d.getSeconds();
      invoiceData.dueDate = new Date(year, month, day, hours, minutes, seconds);
    }
    
    console.log("[Invoice] Final dates - Issue:", invoiceData.issueDate, "Due:", invoiceData.dueDate);
    
    // Use raw query to insert invoice with properly formatted dates for SQL Server
    // This bypasses Sequelize's date serialization which might be causing issues
    const issueDateFormatted = dayjs(invoiceData.issueDate).format('YYYY-MM-DD HH:mm:ss');
    const dueDateFormatted = invoiceData.dueDate ? dayjs(invoiceData.dueDate).format('YYYY-MM-DD HH:mm:ss') : null;
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    
    console.log("[Invoice] SQL formatted dates - Issue:", issueDateFormatted, "Due:", dueDateFormatted);
    
    // Use raw SQL with proper date formatting for SQL Server
    // Escape single quotes in string values to prevent SQL injection
    const escapeSql = (str) => (str || '').replace(/'/g, "''");
    
    const itemsJson = typeof invoiceData.items === 'string' 
      ? invoiceData.items 
      : JSON.stringify(invoiceData.items);
    
    const dueDateValue = dueDateFormatted ? `'${dueDateFormatted}'` : 'NULL';
    
    const query = `
      INSERT INTO invoices (
        invoiceNumber, customerName, customerEmail, customerPhone,
        supplierTRN, customerTRN,
        issueDate, dueDate, paymentTerms, currency, language,
        items, subtotal, totalDiscount, vatAmount, total, totalWithVAT,
        taxableSubtotal, zeroRatedSubtotal, exemptSubtotal, discountTotal,
        notes, status, vatType,
        createdByUid, createdByDisplayName, createdByEmail,
        createdAt, updatedAt
      )
      OUTPUT INSERTED.id, INSERTED.invoiceNumber, INSERTED.customerName,
             INSERTED.customerEmail, INSERTED.customerPhone, INSERTED.supplierTRN,
             INSERTED.customerTRN, INSERTED.issueDate,
             INSERTED.dueDate, INSERTED.paymentTerms, INSERTED.currency,
             INSERTED.language, INSERTED.items, INSERTED.subtotal,
             INSERTED.totalDiscount, INSERTED.vatAmount, INSERTED.total,
             INSERTED.totalWithVAT, INSERTED.taxableSubtotal, INSERTED.zeroRatedSubtotal,
             INSERTED.exemptSubtotal, INSERTED.discountTotal,
             INSERTED.notes, INSERTED.status, INSERTED.vatType, INSERTED.createdByUid,
             INSERTED.createdByDisplayName, INSERTED.createdByEmail,
             INSERTED.createdAt, INSERTED.updatedAt
      VALUES (
        N'${escapeSql(invoiceData.invoiceNumber)}',
        N'${escapeSql(invoiceData.customerName)}',
        ${invoiceData.customerEmail ? `N'${escapeSql(invoiceData.customerEmail)}'` : 'NULL'},
        ${invoiceData.customerPhone ? `N'${escapeSql(invoiceData.customerPhone)}'` : 'NULL'},
        ${invoiceData.supplierTRN ? `N'${escapeSql(invoiceData.supplierTRN)}'` : 'NULL'},
        ${invoiceData.customerTRN ? `N'${escapeSql(invoiceData.customerTRN)}'` : 'NULL'},
        '${issueDateFormatted}',
        ${dueDateValue},
        N'${escapeSql(invoiceData.paymentTerms)}',
        N'${escapeSql(invoiceData.currency)}',
        '${escapeSql(invoiceData.language)}',
        N'${escapeSql(itemsJson)}',
        ${invoiceData.subtotal},
        ${invoiceData.totalDiscount},
        ${invoiceData.vatAmount},
        ${invoiceData.total},
        ${invoiceData.totalWithVAT},
        ${invoiceData.taxableSubtotal},
        ${invoiceData.zeroRatedSubtotal},
        ${invoiceData.exemptSubtotal},
        ${invoiceData.discountTotal},
        ${invoiceData.notes ? `N'${escapeSql(invoiceData.notes)}'` : 'NULL'},
        '${escapeSql(invoiceData.status)}',
        '${escapeSql(invoiceData.vatType)}',
        N'${escapeSql(invoiceData.createdByUid)}',
        ${invoiceData.createdByDisplayName ? `N'${escapeSql(invoiceData.createdByDisplayName)}'` : 'NULL'},
        ${invoiceData.createdByEmail ? `N'${escapeSql(invoiceData.createdByEmail)}'` : 'NULL'},
        '${now}',
        '${now}'
      )
    `;
    
    console.log("[Invoice] Executing raw SQL query...");
    const results = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log("[Invoice] Query results:", JSON.stringify(results, null, 2));
    
    // SQL Server returns results in a different format
    // The OUTPUT clause returns an array, but Sequelize might wrap it differently
    const savedInvoice = Array.isArray(results) && results.length > 0 
      ? (results[0] || results) 
      : (results && results.length > 0 ? results[0] : null);
    
    if (!savedInvoice) {
      console.error("[Invoice] No invoice returned from INSERT query");
      // Fallback: fetch the invoice we just created
      const fetchedInvoice = await Invoice.findOne({
        where: { invoiceNumber }
      });
      if (fetchedInvoice) {
        const plainInvoice = fetchedInvoice.get({ plain: true });
        // Parse items JSON if needed
        if (plainInvoice.items && typeof plainInvoice.items === 'string') {
          try {
            plainInvoice.items = JSON.parse(plainInvoice.items);
          } catch (e) {
            console.warn("[Invoice] Could not parse items JSON:", e);
          }
        }
        return res.status(201).json(plainInvoice);
      } else {
        return res.status(500).json({ message: "Invoice created but could not be retrieved" });
      }
    }
    
    // Parse items JSON if needed
    if (savedInvoice.items && typeof savedInvoice.items === 'string') {
      try {
        savedInvoice.items = JSON.parse(savedInvoice.items);
      } catch (e) {
        console.warn("[Invoice] Could not parse items JSON:", e);
      }
    }

    console.log("[Invoice] ✓ Invoice created:", invoiceNumber);

    // Send email if status is "sent" and email is provided
    if (savedInvoice.status === "sent" && savedInvoice.customerEmail) {
      try {
        await sendInvoiceEmail(savedInvoice);
        console.log("[Invoice] ✓ Email sent for invoice:", invoiceNumber);
      } catch (emailError) {
        console.error("[Invoice] Email sending failed (invoice still created):", emailError);
        // Don't fail the request if email fails
      }
    }

    res.status(201).json(savedInvoice);
  } catch (error) {
    console.error("[Invoice] ✗ Invoice creation failed:", error.message);
    console.error("[Invoice] Error name:", error.name);
    console.error("[Invoice] Error original:", error.original?.message || error.original);
    console.error("[Invoice] Error SQL:", error.sql || "N/A");
    console.error("[Invoice] Error stack:", error.stack);
    res.status(500).json({
      message: error.message || "Failed to create invoice",
      error: process.env.NODE_ENV === "development" ? {
        message: error.message,
        original: error.original?.message,
        sql: error.sql
      } : undefined
    });
  }
});

/**
 * PUT /api/invoices/:id
 * Update invoice
 */
router.put("/:id", authorizeRole("admin"), async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const invoice = await Invoice.findByPk(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const {
      items,
      issueDate,
      paymentTerms,
      dueDate,
      totalDiscount,
      supplierTRN,
      customerTRN,
      vatType,
      ...rest
    } = req.body;

    let updatePayload = { ...rest };

    // Recalculate totals if items changed
    if (Array.isArray(items) && items.length > 0) {
      const finalIssueDate = issueDate ? new Date(issueDate) : invoice.issueDate;
      const finalDueDate = dueDate
        ? new Date(dueDate)
        : calculateDueDate(finalIssueDate, paymentTerms || invoice.paymentTerms || "30 days");

      const vatPayload = await computeInvoiceVat({
        ...invoice.get({ plain: true }),
        ...req.body,
        items,
        vatType: vatType || invoice.vatType || "standard",
        supplierTRN: supplierTRN ?? invoice.supplierTRN,
        customerTRN: customerTRN ?? invoice.customerTRN,
        totalDiscount: totalDiscount ?? invoice.totalDiscount
      });

      // Format dates for SQL Server (same as create)
      const issueDateFormatted = dayjs(finalIssueDate).format('YYYY-MM-DD HH:mm:ss');
      const dueDateFormatted = finalDueDate ? dayjs(finalDueDate).format('YYYY-MM-DD HH:mm:ss') : null;
      
      // Convert dates to local timezone (remove timezone info)
      const issueDateLocal = new Date(dayjs(issueDateFormatted).format('YYYY-MM-DD HH:mm:ss'));
      const dueDateLocal = dueDateFormatted ? new Date(dayjs(dueDateFormatted).format('YYYY-MM-DD HH:mm:ss')) : null;

      updatePayload = {
        ...updatePayload,
        items: typeof vatPayload.items === 'string' ? vatPayload.items : JSON.stringify(vatPayload.items),
        subtotal: vatPayload.subtotal,
        totalDiscount: vatPayload.discountTotal,
        vatAmount: vatPayload.vatAmount,
        total: vatPayload.totalWithVAT,
        totalWithVAT: vatPayload.totalWithVAT,
        vatType: vatType || vatPayload.vatType,
        taxableSubtotal: vatPayload.taxableSubtotal,
        zeroRatedSubtotal: vatPayload.zeroRatedSubtotal,
        exemptSubtotal: vatPayload.exemptSubtotal,
        discountTotal: vatPayload.discountTotal,
        supplierTRN: supplierTRN ?? invoice.supplierTRN,
        customerTRN: customerTRN ?? invoice.customerTRN,
        issueDate: issueDateLocal,
        dueDate: dueDateLocal
      };
    } else if (
      totalDiscount !== undefined ||
      vatType !== undefined ||
      supplierTRN !== undefined ||
      customerTRN !== undefined
    ) {
      const currentItems = Array.isArray(invoice.items)
        ? invoice.items
        : (() => {
            try {
              return JSON.parse(invoice.items || '[]');
            } catch {
              return [];
            }
          })();

      if (currentItems.length > 0) {
        const vatPayload = await computeInvoiceVat({
          ...invoice.get({ plain: true }),
          items: currentItems,
          vatType: vatType || invoice.vatType || "standard",
          supplierTRN: supplierTRN ?? invoice.supplierTRN,
          customerTRN: customerTRN ?? invoice.customerTRN,
          totalDiscount: totalDiscount ?? invoice.totalDiscount
        });

        updatePayload = {
          ...updatePayload,
          subtotal: vatPayload.subtotal,
          totalDiscount: vatPayload.discountTotal,
          vatAmount: vatPayload.vatAmount,
          total: vatPayload.totalWithVAT,
          totalWithVAT: vatPayload.totalWithVAT,
          vatType: vatType || vatPayload.vatType,
          taxableSubtotal: vatPayload.taxableSubtotal,
          zeroRatedSubtotal: vatPayload.zeroRatedSubtotal,
          exemptSubtotal: vatPayload.exemptSubtotal,
          discountTotal: vatPayload.discountTotal,
          supplierTRN: supplierTRN ?? invoice.supplierTRN,
          customerTRN: customerTRN ?? invoice.customerTRN
        };
      }
    } else {
      // Even if items didn't change, format dates if they were provided
      if (issueDate) {
        const issueDateFormatted = dayjs(issueDate).format('YYYY-MM-DD HH:mm:ss');
        updatePayload.issueDate = new Date(issueDateFormatted);
      }
      if (dueDate) {
        const dueDateFormatted = dayjs(dueDate).format('YYYY-MM-DD HH:mm:ss');
        updatePayload.dueDate = new Date(dueDateFormatted);
      }
    }

    const oldStatus = invoice.status;
    
    // Use raw SQL for update to handle dates properly (similar to create)
    if (Object.keys(updatePayload).length > 0) {
      // Format dates for SQL
      const escapeSql = (str) => (str || '').replace(/'/g, "''");
      const itemsJson = updatePayload.items 
        ? (typeof updatePayload.items === 'string' ? updatePayload.items : JSON.stringify(updatePayload.items))
        : null;
      
      const setClauses = [];
      const values = {};
      
      if (updatePayload.customerName !== undefined) {
        setClauses.push(`customerName = N'${escapeSql(updatePayload.customerName)}'`);
      }
      if (updatePayload.customerEmail !== undefined) {
        setClauses.push(`customerEmail = ${updatePayload.customerEmail ? `N'${escapeSql(updatePayload.customerEmail)}'` : 'NULL'}`);
      }
      if (updatePayload.customerPhone !== undefined) {
        setClauses.push(`customerPhone = ${updatePayload.customerPhone ? `N'${escapeSql(updatePayload.customerPhone)}'` : 'NULL'}`);
      }
      if (updatePayload.supplierTRN !== undefined) {
        setClauses.push(`supplierTRN = ${updatePayload.supplierTRN ? `N'${escapeSql(updatePayload.supplierTRN)}'` : 'NULL'}`);
      }
      if (updatePayload.customerTRN !== undefined) {
        setClauses.push(`customerTRN = ${updatePayload.customerTRN ? `N'${escapeSql(updatePayload.customerTRN)}'` : 'NULL'}`);
      }
      if (updatePayload.issueDate !== undefined) {
        const issueDateStr = dayjs(updatePayload.issueDate).format('YYYY-MM-DD HH:mm:ss');
        setClauses.push(`issueDate = '${issueDateStr}'`);
      }
      if (updatePayload.dueDate !== undefined) {
        if (updatePayload.dueDate) {
          const dueDateStr = dayjs(updatePayload.dueDate).format('YYYY-MM-DD HH:mm:ss');
          setClauses.push(`dueDate = '${dueDateStr}'`);
        } else {
          setClauses.push(`dueDate = NULL`);
        }
      }
      if (updatePayload.paymentTerms !== undefined) {
        setClauses.push(`paymentTerms = N'${escapeSql(updatePayload.paymentTerms)}'`);
      }
      if (updatePayload.currency !== undefined) {
        setClauses.push(`currency = N'${escapeSql(updatePayload.currency)}'`);
      }
      if (updatePayload.language !== undefined) {
        setClauses.push(`language = '${escapeSql(updatePayload.language)}'`);
      }
    if (itemsJson !== null) {
        setClauses.push(`items = N'${escapeSql(itemsJson)}'`);
      }
      if (updatePayload.subtotal !== undefined) {
        setClauses.push(`subtotal = ${updatePayload.subtotal}`);
      }
      if (updatePayload.totalDiscount !== undefined) {
        setClauses.push(`totalDiscount = ${updatePayload.totalDiscount}`);
      }
      if (updatePayload.vatAmount !== undefined) {
        setClauses.push(`vatAmount = ${updatePayload.vatAmount}`);
      }
      if (updatePayload.total !== undefined) {
        setClauses.push(`total = ${updatePayload.total}`);
      }
      if (updatePayload.totalWithVAT !== undefined) {
        setClauses.push(`totalWithVAT = ${updatePayload.totalWithVAT}`);
      }
      if (updatePayload.vatType !== undefined) {
        setClauses.push(`vatType = '${escapeSql(updatePayload.vatType)}'`);
      }
      if (updatePayload.taxableSubtotal !== undefined) {
        setClauses.push(`taxableSubtotal = ${updatePayload.taxableSubtotal}`);
      }
      if (updatePayload.zeroRatedSubtotal !== undefined) {
        setClauses.push(`zeroRatedSubtotal = ${updatePayload.zeroRatedSubtotal}`);
      }
      if (updatePayload.exemptSubtotal !== undefined) {
        setClauses.push(`exemptSubtotal = ${updatePayload.exemptSubtotal}`);
      }
      if (updatePayload.discountTotal !== undefined) {
        setClauses.push(`discountTotal = ${updatePayload.discountTotal}`);
      }
      if (updatePayload.notes !== undefined) {
        setClauses.push(`notes = ${updatePayload.notes ? `N'${escapeSql(updatePayload.notes)}'` : 'NULL'}`);
      }
      if (updatePayload.status !== undefined) {
        setClauses.push(`status = '${escapeSql(updatePayload.status)}'`);
      }
      
      const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
      setClauses.push(`updatedAt = '${now}'`);
      
      const updateQuery = `
        UPDATE invoices
        SET ${setClauses.join(', ')}
        OUTPUT INSERTED.id, INSERTED.invoiceNumber, INSERTED.customerName,
               INSERTED.customerEmail, INSERTED.customerPhone, INSERTED.issueDate,
               INSERTED.dueDate, INSERTED.paymentTerms, INSERTED.currency,
               INSERTED.language, INSERTED.items, INSERTED.subtotal,
               INSERTED.totalDiscount, INSERTED.vatAmount, INSERTED.total,
               INSERTED.notes, INSERTED.status, INSERTED.createdByUid,
               INSERTED.createdByDisplayName, INSERTED.createdByEmail,
               INSERTED.createdAt, INSERTED.updatedAt
        WHERE id = ${req.params.id}
      `;
      
      console.log("[Invoice] Executing update query for invoice ID:", req.params.id);
      const [updateResults] = await sequelize.query(updateQuery, {
        type: sequelize.QueryTypes.SELECT
      });
      
      let updatedInvoice = Array.isArray(updateResults) && updateResults.length > 0 
        ? updateResults[0] 
        : (updateResults || null);
      
      if (!updatedInvoice) {
        // Fallback: fetch the updated invoice
        const fetchedInvoice = await Invoice.findByPk(req.params.id);
        if (fetchedInvoice) {
          updatedInvoice = fetchedInvoice.get({ plain: true });
        } else {
          return res.status(404).json({ message: "Invoice not found after update" });
        }
      }
      
      // Parse items JSON if needed
      if (updatedInvoice.items && typeof updatedInvoice.items === 'string') {
        try {
          updatedInvoice.items = JSON.parse(updatedInvoice.items);
        } catch (e) {
          console.warn("[Invoice] Could not parse items JSON:", e);
        }
      }
      
      // Send email if status changed to "sent"
      if (oldStatus !== "sent" && updatedInvoice.status === "sent" && updatedInvoice.customerEmail) {
        try {
          await sendInvoiceEmail(updatedInvoice);
          console.log("[Invoice] ✓ Email sent for updated invoice:", updatedInvoice.invoiceNumber);
        } catch (emailError) {
          console.error("[Invoice] Email sending failed:", emailError);
        }
      }
      
      return res.json(updatedInvoice);
    } else {
      // No updates to make, return current invoice
      const currentInvoice = invoice.get({ plain: true });
      if (currentInvoice.items && typeof currentInvoice.items === 'string') {
        try {
          currentInvoice.items = JSON.parse(currentInvoice.items);
        } catch (e) {
          console.warn("[Invoice] Could not parse items JSON:", e);
        }
      }
      return res.json(currentInvoice);
    }
  } catch (error) {
    console.error("[Invoice] Update error:", error);
    res.status(500).json({ message: "Failed to update invoice", error: error.message });
  }
});

/**
 * PATCH /api/invoices/:id/status
 * Update invoice status only
 */
router.patch("/:id/status", authorizeRole("admin"), async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const { status } = req.body;
    const validStatuses = ["draft", "sent", "viewed", "paid", "overdue", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const invoice = await Invoice.findByPk(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const oldStatus = invoice.status;
    
    // Use raw SQL to update status with properly formatted date for SQL Server
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const escapeSql = (str) => (str || '').replace(/'/g, "''");
    
    const updateQuery = `
      UPDATE invoices
      SET status = '${escapeSql(status)}',
          updatedAt = '${now}'
      OUTPUT INSERTED.id, INSERTED.invoiceNumber, INSERTED.customerName,
             INSERTED.customerEmail, INSERTED.customerPhone, INSERTED.issueDate,
             INSERTED.dueDate, INSERTED.paymentTerms, INSERTED.currency,
             INSERTED.language, INSERTED.items, INSERTED.subtotal,
             INSERTED.totalDiscount, INSERTED.vatAmount, INSERTED.total,
             INSERTED.notes, INSERTED.status, INSERTED.createdByUid,
             INSERTED.createdByDisplayName, INSERTED.createdByEmail,
             INSERTED.createdAt, INSERTED.updatedAt
      WHERE id = ${req.params.id}
    `;
    
    const [updateResults] = await sequelize.query(updateQuery, {
      type: sequelize.QueryTypes.SELECT
    });
    
    let updatedInvoice = Array.isArray(updateResults) && updateResults.length > 0 
      ? updateResults[0] 
      : (updateResults || null);
    
    if (!updatedInvoice) {
      // Fallback: fetch the updated invoice
      const fetchedInvoice = await Invoice.findByPk(req.params.id);
      if (fetchedInvoice) {
        updatedInvoice = fetchedInvoice.get({ plain: true });
      } else {
        return res.status(404).json({ message: "Invoice not found after update" });
      }
    }
    
    // Parse items JSON if needed
    if (updatedInvoice.items && typeof updatedInvoice.items === 'string') {
      try {
        updatedInvoice.items = JSON.parse(updatedInvoice.items);
      } catch (e) {
        console.warn("[Invoice] Could not parse items JSON:", e);
      }
    }

    // Send email if status changed to "sent"
    if (oldStatus !== "sent" && status === "sent" && updatedInvoice.customerEmail) {
      try {
        await sendInvoiceEmail(updatedInvoice);
        console.log("[Invoice] ✓ Email sent for status change:", updatedInvoice.invoiceNumber);
      } catch (emailError) {
        console.error("[Invoice] Email sending failed:", emailError);
      }
    }

    res.json(updatedInvoice);
  } catch (error) {
    console.error("[Invoice] Status update error:", error);
    res.status(500).json({ message: "Failed to update status", error: error.message });
  }
});

/**
 * DELETE /api/invoices/:id
 * Delete invoice
 */
router.delete("/:id", authorizeRole("admin"), async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const invoice = await Invoice.findByPk(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    await invoice.destroy();
    res.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("[Invoice] Delete error:", error);
    res.status(500).json({ message: "Failed to delete invoice", error: error.message });
  }
});

module.exports = router;
