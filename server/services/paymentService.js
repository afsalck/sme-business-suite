/**
 * Payment Processing Service
 * Handles payment tracking, allocation, and accounting integration
 */

const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const { Payment, PaymentAllocation } = require('../../models/paymentAssociations');
const Invoice = require('../../models/Invoice');
const { createJournalEntry, postJournalEntry } = require('./accountingService');
const { ChartOfAccount } = require('../../models/accountingAssociations');

/**
 * Generate unique payment number
 */
async function generatePaymentNumber(companyId = 1) {
  const year = dayjs().year();
  const prefix = `PAY-${year}-`;
  
  // Get last payment number for this year
  const [result] = await sequelize.query(`
    SELECT TOP 1 paymentNumber 
    FROM payments 
    WHERE paymentNumber LIKE '${prefix}%' 
    ORDER BY paymentNumber DESC
  `, { type: sequelize.QueryTypes.SELECT });
  
  let sequence = 1;
  if (result && result.paymentNumber) {
    const lastNumber = result.paymentNumber.replace(prefix, '');
    sequence = parseInt(lastNumber, 10) + 1;
  }
  
  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

/**
 * Create a payment record
 */
async function createPayment({ 
  invoiceId, 
  paymentDate, 
  paymentAmount, 
  paymentMethod, 
  currency,
  referenceNumber,
  transactionId,
  bankName,
  bankAccount,
  notes,
  companyId = 1,
  createdBy = 'system'
}) {
  const transaction = await sequelize.transaction();
  
  try {
    // Get invoice
    const invoice = await Invoice.findByPk(invoiceId, { transaction });
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    // Generate payment number
    const paymentNumber = await generatePaymentNumber(companyId);
    
    // Format payment date for SQL Server to avoid conversion errors
    const dayjs = require('dayjs');
    const formattedPaymentDate = paymentDate 
      ? dayjs(paymentDate).format('YYYY-MM-DD HH:mm:ss')
      : dayjs().format('YYYY-MM-DD HH:mm:ss');
    const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');
    
    console.log('[Payment] Creating payment with:', {
      invoiceId,
      paymentNumber,
      paymentDate: formattedPaymentDate,
      paymentAmount: parseFloat(paymentAmount)
    });
    
    // Create payment using raw SQL to avoid date issues
    // Use :parameter syntax for Sequelize (it converts to @param for SQL Server)
    const insertQuery = `
      INSERT INTO [dbo].[payments]
        ([companyId], [invoiceId], [paymentNumber], [paymentDate], [paymentAmount], [paymentMethod], [currency], [referenceNumber], [transactionId], [bankName], [bankAccount], [status], [notes], [createdBy], [createdAt], [updatedAt])
      OUTPUT INSERTED.id, INSERTED.companyId, INSERTED.invoiceId, INSERTED.paymentNumber, INSERTED.paymentDate, INSERTED.paymentAmount, INSERTED.paymentMethod, INSERTED.currency, INSERTED.referenceNumber, INSERTED.transactionId, INSERTED.bankName, INSERTED.bankAccount, INSERTED.status, INSERTED.confirmedAt, INSERTED.confirmedBy, INSERTED.notes, INSERTED.receiptUrl, INSERTED.journalEntryId, INSERTED.createdBy, INSERTED.createdAt, INSERTED.updatedAt
      VALUES (:companyId, :invoiceId, :paymentNumber, :paymentDate, :paymentAmount, :paymentMethod, :currency, :referenceNumber, :transactionId, :bankName, :bankAccount, :status, :notes, :createdBy, :createdAt, :updatedAt)
    `;
    
    console.log('[Payment] Executing INSERT query with replacements');
    const [paymentResult] = await sequelize.query(insertQuery, {
      replacements: {
        companyId,
        invoiceId: parseInt(invoiceId),
        paymentNumber,
        paymentDate: formattedPaymentDate,
        paymentAmount: parseFloat(paymentAmount),
        paymentMethod: paymentMethod || 'bank_transfer',
        currency: currency || 'AED',
        referenceNumber: referenceNumber || null,
        transactionId: transactionId || null,
        bankName: bankName || null,
        bankAccount: bankAccount || null,
        status: 'pending',
        notes: notes || null,
        createdBy,
        createdAt: formattedNow,
        updatedAt: formattedNow
      },
      transaction,
      type: sequelize.QueryTypes.SELECT
    });
    
    const paymentRows = Array.isArray(paymentResult) ? paymentResult : [paymentResult];
    const insertedPayment = paymentRows[0];
    
    if (!insertedPayment || !insertedPayment.id) {
      throw new Error('Failed to create payment - invalid result structure');
    }
    
    console.log('[Payment] ✓ Payment created with ID:', insertedPayment.id);
    
    // Create a mock Payment instance for compatibility
    const payment = {
      id: insertedPayment.id,
      get: () => insertedPayment,
      getDataValue: (key) => insertedPayment[key]
    };
    Object.assign(payment, insertedPayment);
    
    // Allocate payment to invoice
    await allocatePaymentToInvoice({
      paymentId: payment.id,
      invoiceId,
      amount: parseFloat(paymentAmount),
      transaction
    });
    
    await transaction.commit();
    console.log('[Payment] ✓ Transaction committed successfully');
    return payment.get ? payment.get({ plain: true }) : insertedPayment;
  } catch (error) {
    console.error('[Payment] ✗ Error creating payment:', error);
    console.error('[Payment] Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      parent: error.parent?.message,
      sql: error.sql,
      stack: error.stack?.split('\n').slice(0, 10).join('\n')
    });
    
    // Only rollback if transaction is still active
    if (transaction) {
      try {
        if (!transaction.finished) {
          console.log('[Payment] Attempting to rollback transaction...');
          await transaction.rollback();
          console.log('[Payment] ✓ Transaction rolled back successfully');
        } else {
          console.log('[Payment] ⚠️ Transaction already finished, skipping rollback');
        }
      } catch (rollbackError) {
        console.error('[Payment] ✗ Error during rollback:', rollbackError.message);
        console.error('[Payment] Rollback error details:', {
          message: rollbackError.message,
          name: rollbackError.name,
          code: rollbackError.code
        });
      }
    } else {
      console.log('[Payment] ⚠️ No transaction to rollback');
    }
    
    throw error;
  }
}

/**
 * Allocate payment to invoice and update invoice balances
 */
async function allocatePaymentToInvoice({ paymentId, invoiceId, amount, transaction }) {
  // Format allocatedAt date for SQL Server to avoid conversion errors
  const dayjs = require('dayjs');
  const formattedAllocatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
  console.log('[Payment] Allocating payment to invoice:', { paymentId, invoiceId, amount });
  
  // Create allocation record using raw SQL to avoid date issues
  const allocationQuery = `
    INSERT INTO [dbo].[payment_allocations]
      ([paymentId], [invoiceId], [allocatedAmount], [allocatedAt])
    OUTPUT INSERTED.id, INSERTED.paymentId, INSERTED.invoiceId, INSERTED.allocatedAmount, INSERTED.allocatedAt
    VALUES (:paymentId, :invoiceId, :allocatedAmount, :allocatedAt)
  `;
  
  console.log('[Payment] Creating payment allocation');
  const [allocationResult] = await sequelize.query(allocationQuery, {
    replacements: {
      paymentId: parseInt(paymentId),
      invoiceId: parseInt(invoiceId),
      allocatedAmount: parseFloat(amount),
      allocatedAt: formattedAllocatedAt
    },
    transaction,
    type: sequelize.QueryTypes.SELECT
  });
  
  const allocationRows = Array.isArray(allocationResult) ? allocationResult : [allocationResult];
  const insertedAllocation = allocationRows[0];
  
  if (!insertedAllocation || !insertedAllocation.id) {
    throw new Error('Failed to create payment allocation - invalid result structure');
  }
  
  console.log('[Payment] ✓ Payment allocation created with ID:', insertedAllocation.id);
  
  // Recalculate invoice amounts from all payments to ensure accuracy
  // This is more reliable than incrementing, especially with concurrent payments
  const recalculated = await recalculateInvoiceAmounts({
    invoiceId,
    transaction
  });
  
  // Get invoice to check status
  const invoice = await Invoice.findByPk(invoiceId, { transaction });
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  
  // Auto-update status if fully paid
  const newStatus = recalculated.outstandingAmount <= 0.01 ? 'paid' : 
                   (invoice.status === 'draft' ? invoice.status : 'sent');
  
  // Update invoice status if needed
  if (invoice.status !== newStatus) {
    const updateStatusQuery = `
      UPDATE [dbo].[invoices]
      SET [status] = :status,
          [updatedAt] = GETDATE()
      WHERE [id] = :invoiceId
    `;
    
    await sequelize.query(updateStatusQuery, {
      replacements: {
        status: newStatus,
        invoiceId: parseInt(invoiceId)
      },
      transaction
    });
    
    console.log('[Payment] ✓ Invoice status updated to:', newStatus);
  }
  
  console.log('[Payment] ✓ Invoice amounts recalculated:', {
    invoiceId,
    paidAmount: recalculated.paidAmount,
    outstandingAmount: recalculated.outstandingAmount,
    status: newStatus
  });
  
  return {
    paidAmount: recalculated.paidAmount,
    outstandingAmount: recalculated.outstandingAmount,
    isFullyPaid: recalculated.outstandingAmount <= 0.01
  };
}

/**
 * Confirm a payment (mark as confirmed and create accounting entry)
 */
async function confirmPayment({ paymentId, companyId = 1, confirmedBy = 'system' }) {
  const transaction = await sequelize.transaction();
  
  try {
    const payment = await Payment.findOne({
      where: { id: paymentId, companyId },
      include: [{
        model: Invoice,
        as: 'invoice'
      }],
      transaction
    });
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    if (payment.status === 'confirmed') {
      return payment.get({ plain: true });
    }
    
    // Create accounting journal entry for payment received
    // Note: createJournalEntry creates its own transaction, so we do it outside our transaction
    // and then update the payment record
    let journalEntry = null;
    try {
      journalEntry = await createJournalEntryFromPayment(payment.get({ plain: true }), companyId);
      
      // Post the journal entry
      if (journalEntry) {
        await postJournalEntry(journalEntry.id, confirmedBy, companyId);
      }
    } catch (accountingError) {
      console.error('[Payment] Accounting integration failed (non-critical):', accountingError.message);
      // Continue with payment confirmation even if accounting fails
    }
    
    // Update payment with journal entry ID and status using raw SQL to avoid date issues
    const formattedConfirmedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');
    
    await sequelize.query(`
      UPDATE [dbo].[payments]
      SET [journalEntryId] = ?, [status] = 'confirmed', [confirmedAt] = ?, [confirmedBy] = ?, [updatedAt] = ?
      WHERE [id] = ? AND [companyId] = ?
    `, {
      replacements: [
        journalEntry ? journalEntry.id : null,
        formattedConfirmedAt,
        confirmedBy,
        formattedNow,
        paymentId,
        companyId
      ],
      transaction
    });
    
    // Reload payment to get updated data
    const updatedPayment = await Payment.findByPk(paymentId, {
      include: [{
        model: Invoice,
        as: 'invoice'
      }],
      transaction
    });
    
    // Recalculate invoice amounts from all payments when confirming
    // This ensures accuracy even if payments were created out of order
    if (payment.status === 'pending') {
      // Recalculate invoice amounts from all payments
      const recalculated = await recalculateInvoiceAmounts({
        invoiceId: payment.invoiceId,
        transaction
      });
      
      // Get invoice to check status
      const invoice = await Invoice.findByPk(payment.invoiceId, { transaction });
      if (invoice) {
        // Auto-update invoice status if fully paid
        const newStatus = recalculated.outstandingAmount <= 0.01 ? 'paid' : 
                         (invoice.status === 'draft' ? invoice.status : 'sent');
        
        if (invoice.status !== newStatus) {
          const updateInvoiceQuery = `
            UPDATE [dbo].[invoices]
            SET [status] = :status,
                [updatedAt] = GETDATE()
            WHERE [id] = :invoiceId
          `;
          
          await sequelize.query(updateInvoiceQuery, {
            replacements: {
              status: newStatus,
              invoiceId: parseInt(payment.invoiceId)
            },
            transaction
          });
          
          console.log('[Payment] ✓ Invoice status updated to:', newStatus);
        }
      }
    }
    
    await transaction.commit();
    console.log('[Payment] ✓ Payment confirmed successfully');
    return updatedPayment ? updatedPayment.get({ plain: true }) : payment.get({ plain: true });
  } catch (error) {
    console.error('[Payment] ✗ Error confirming payment:', error);
    console.error('[Payment] Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      parent: error.parent?.message,
      sql: error.sql,
      stack: error.stack?.split('\n').slice(0, 10).join('\n')
    });
    
    // Only rollback if transaction is still active
    if (transaction) {
      try {
        if (!transaction.finished) {
          console.log('[Payment] Attempting to rollback transaction...');
          await transaction.rollback();
          console.log('[Payment] ✓ Transaction rolled back successfully');
        } else {
          console.log('[Payment] ⚠️ Transaction already finished, skipping rollback');
        }
      } catch (rollbackError) {
        console.error('[Payment] ✗ Error during rollback:', rollbackError.message);
        console.error('[Payment] Rollback error details:', {
          message: rollbackError.message,
          name: rollbackError.name,
          code: rollbackError.code
        });
      }
    } else {
      console.log('[Payment] ⚠️ No transaction to rollback');
    }
    
    throw error;
  }
}

/**
 * Create journal entry from payment (for accounting integration)
 */
async function createJournalEntryFromPayment(payment, companyId = 1) {
  const invoice = payment.invoice || await Invoice.findByPk(payment.invoiceId);
  
  // Get Cash/Bank account based on payment method
  let cashAccountCode = '1110'; // Default: Cash and Bank
  if (payment.paymentMethod === 'bank_transfer' || payment.paymentMethod === 'online') {
    cashAccountCode = '1110'; // Cash and Bank
  } else if (payment.paymentMethod === 'cash') {
    cashAccountCode = '1110'; // Cash and Bank (or create separate cash account)
  }
  
  const cashAccount = await ChartOfAccount.findOne({
    where: { accountCode: cashAccountCode, companyId }
  });
  
  if (!cashAccount) {
    console.error('[Payment] Cash/Bank account not found. Using default account.');
    // Continue with default - accounting module should have this account
  }
  
  // Get Accounts Receivable account
  const arAccount = await ChartOfAccount.findOne({
    where: { accountCode: '1120', companyId } // Accounts Receivable
  });
  
  if (!arAccount) {
    throw new Error('Accounts Receivable account (1120) not found in chart of accounts');
  }
  
  const lines = [];
  const paymentAmount = parseFloat(payment.paymentAmount);
  
  // Debit: Cash/Bank (money received)
  lines.push({
    accountId: cashAccount ? cashAccount.id : arAccount.id, // Fallback to AR if cash account not found
    debitAmount: paymentAmount,
    creditAmount: 0,
    description: `Payment ${payment.paymentNumber} - Invoice ${invoice.invoiceNumber}`
  });
  
  // Credit: Accounts Receivable (reduce what customer owes)
  lines.push({
    accountId: arAccount.id,
    debitAmount: 0,
    creditAmount: paymentAmount,
    description: `Payment received for Invoice ${invoice.invoiceNumber}`
  });
  
  const entry = await createJournalEntry({
    entryDate: payment.paymentDate || new Date(),
    description: `Payment Received: ${payment.paymentNumber} - Invoice ${invoice.invoiceNumber}`,
    reference: payment.paymentNumber,
    referenceType: 'payment',
    referenceId: payment.id,
    lines,
    createdBy: 'system',
    companyId
  });
  
  return entry;
}

/**
 * Get payments for an invoice
 */
async function getPaymentsForInvoice({ invoiceId, companyId = 1 }) {
  const payments = await Payment.findAll({
    where: { invoiceId, companyId },
    include: [{
      model: Invoice,
      as: 'invoice',
      attributes: ['id', 'invoiceNumber', 'customerName', 'totalWithVAT']
    }],
    order: [['paymentDate', 'DESC']]
  });
  
  return payments.map(p => p.get({ plain: true }));
}

/**
 * Get all payments with filters
 */
async function getPayments({ invoiceId = null, status = null, fromDate = null, toDate = null, companyId = 1 } = {}) {
  console.log('[Payment] getPayments called with:', { invoiceId, status, fromDate, toDate, companyId });
  
  const where = { companyId };
  
  if (invoiceId) {
    where.invoiceId = parseInt(invoiceId);
  }
  
  if (status) {
    where.status = status;
  }
  
  if (fromDate || toDate) {
    where.paymentDate = {};
    if (fromDate) {
      where.paymentDate[Op.gte] = dayjs(fromDate).startOf('day').toDate();
    }
    if (toDate) {
      where.paymentDate[Op.lte] = dayjs(toDate).endOf('day').toDate();
    }
  }
  
  console.log('[Payment] Query where clause:', JSON.stringify(where, null, 2));
  
  const payments = await Payment.findAll({
    where,
    include: [{
      model: Invoice,
      as: 'invoice',
      attributes: ['id', 'invoiceNumber', 'customerName', 'totalWithVAT', 'paidAmount', 'outstandingAmount']
    }],
    order: [['paymentDate', 'DESC'], ['createdAt', 'DESC']]
  });
  
  console.log('[Payment] Found payments:', payments.length);
  const result = payments.map(p => p.get({ plain: true }));
  console.log('[Payment] Returning payments:', result.length);
  
  return result;
}

/**
 * Get payment summary (total received, pending, etc.)
 */
async function getPaymentSummary({ fromDate = null, toDate = null, companyId = 1 } = {}) {
  // Build base where clause (exclude failed, cancelled, refunded)
  const baseWhere = { 
    companyId,
    status: {
      [Op.in]: ['pending', 'confirmed'] // Only count pending and confirmed payments
    }
  };
  
  if (fromDate || toDate) {
    baseWhere.paymentDate = {};
    if (fromDate) {
      baseWhere.paymentDate[Op.gte] = dayjs(fromDate).startOf('day').toDate();
    }
    if (toDate) {
      baseWhere.paymentDate[Op.lte] = dayjs(toDate).endOf('day').toDate();
    }
  }
  
  // Get all valid payments (pending + confirmed)
  const allPayments = await Payment.findAll({
    where: baseWhere,
    attributes: [
      [sequelize.fn('SUM', sequelize.col('paymentAmount')), 'totalAmount'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount']
    ],
    raw: true
  });
  
  // Get confirmed payments only
  const confirmedWhere = { ...baseWhere, status: 'confirmed' };
  const confirmedPayments = await Payment.findAll({
    where: confirmedWhere,
    attributes: [
      [sequelize.fn('SUM', sequelize.col('paymentAmount')), 'totalReceived'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'confirmedCount']
    ],
    raw: true
  });
  
  // Get pending payments
  const pendingWhere = { ...baseWhere, status: 'pending' };
  const pendingPayments = await Payment.findAll({
    where: pendingWhere,
    attributes: [
      [sequelize.fn('SUM', sequelize.col('paymentAmount')), 'totalPending'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'pendingCount']
    ],
    raw: true
  });
  
  const summary = {
    totalReceived: parseFloat(confirmedPayments[0]?.totalReceived || 0),
    totalPayments: parseInt(allPayments[0]?.totalCount || 0),
    totalPending: parseFloat(pendingPayments[0]?.totalPending || 0),
    pendingCount: parseInt(pendingPayments[0]?.pendingCount || 0),
    confirmedCount: parseInt(confirmedPayments[0]?.confirmedCount || 0)
  };
  
  console.log('[Payment] Payment summary calculated:', {
    fromDate,
    toDate,
    companyId,
    summary
  });
  
  return summary;
}

/**
 * Refund a payment
 */
async function refundPayment({ paymentId, refundAmount = null, notes = null, companyId = 1 }) {
  const transaction = await sequelize.transaction();
  
  try {
    const payment = await Payment.findOne({
      where: { id: paymentId, companyId },
      include: [{
        model: Invoice,
        as: 'invoice'
      }],
      transaction
    });
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    const refundAmt = refundAmount || parseFloat(payment.paymentAmount);
    
    // Update payment status
    await payment.update({
      status: 'refunded',
      notes: notes || payment.notes
    }, { transaction });
    
    // Reverse the invoice payment allocation
    const invoice = payment.invoice;
    const currentPaid = parseFloat(invoice.paidAmount || 0);
    const newPaid = Math.max(0, currentPaid - refundAmt);
    const totalAmount = parseFloat(invoice.totalWithVAT || invoice.total || 0);
    const outstanding = totalAmount - newPaid;
    
    await invoice.update({
      paidAmount: newPaid,
      outstandingAmount: outstanding,
      status: outstanding > 0.01 ? 'sent' : 'paid'
    }, { transaction });
    
    // TODO: Create reversing journal entry for refund
    
    await transaction.commit();
    return payment.get({ plain: true });
  } catch (error) {
    // Only rollback if transaction is still active
    if (transaction && !transaction.finished) {
      try {
        await transaction.rollback();
        console.log('[Payment] Transaction rolled back');
      } catch (rollbackError) {
        console.error('[Payment] Error during rollback (transaction may already be finished):', rollbackError.message);
      }
    }
    throw error;
  }
}

/**
 * Recalculate invoice paidAmount and outstandingAmount from all payments
 */
async function recalculateInvoiceAmounts({ invoiceId, transaction = null }) {
  // Get all allocations for this invoice first
  const allocations = await PaymentAllocation.findAll({
    where: { invoiceId: parseInt(invoiceId) },
    attributes: ['id', 'paymentId', 'allocatedAmount'],
    transaction
  });
  
  // If no allocations, set amounts to 0
  if (!allocations || allocations.length === 0) {
    const invoice = await Invoice.findByPk(invoiceId, { transaction });
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    const totalAmount = parseFloat(invoice.totalWithVAT || invoice.total || 0);
    
    const updateInvoiceQuery = `
      UPDATE [dbo].[invoices]
      SET [paidAmount] = 0,
          [outstandingAmount] = :totalAmount,
          [updatedAt] = GETDATE()
      WHERE [id] = :invoiceId
    `;
    
    await sequelize.query(updateInvoiceQuery, {
      replacements: {
        totalAmount,
        invoiceId: parseInt(invoiceId)
      },
      transaction
    });
    
    return {
      paidAmount: 0,
      outstandingAmount: totalAmount
    };
  }
  
  // Get unique payment IDs from allocations
  const paymentIds = [...new Set(allocations.map(alloc => alloc.paymentId))];
  
  if (paymentIds.length === 0) {
    // No payments to query
    const invoice = await Invoice.findByPk(invoiceId, { transaction });
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    const totalAmount = parseFloat(invoice.totalWithVAT || invoice.total || 0);
    
    const updateInvoiceQuery = `
      UPDATE [dbo].[invoices]
      SET [paidAmount] = 0,
          [outstandingAmount] = :totalAmount,
          [updatedAt] = GETDATE()
      WHERE [id] = :invoiceId
    `;
    
    await sequelize.query(updateInvoiceQuery, {
      replacements: {
        totalAmount,
        invoiceId: parseInt(invoiceId)
      },
      transaction
    });
    
    return {
      paidAmount: 0,
      outstandingAmount: totalAmount
    };
  }
  
  // Query payments by their IDs to get the latest status
  // Use JOIN with allocations to ensure we only get payments allocated to this invoice
  const paymentsQuery = `
    SELECT DISTINCT p.[id], p.[paymentAmount], p.[status]
    FROM [dbo].[payments] p
    INNER JOIN [dbo].[payment_allocations] pa ON p.[id] = pa.[paymentId]
    WHERE pa.[invoiceId] = :invoiceId
  `;
  
  const payments = await sequelize.query(paymentsQuery, {
    replacements: { invoiceId: parseInt(invoiceId) },
    transaction,
    type: sequelize.QueryTypes.SELECT
  });
  
  // Create a map of paymentId -> payment status
  const paymentStatusMap = {};
  payments.forEach(p => {
    paymentStatusMap[p.id] = p.status;
  });
  
  // Count only pending and confirmed payments
  // Exclude failed, cancelled, or refunded payments
  const totalPaid = allocations
    .filter(alloc => {
      const paymentId = alloc.paymentId;
      const status = paymentStatusMap[paymentId];
      
      // Only count pending and confirmed payments
      return status === 'pending' || status === 'confirmed';
    })
    .reduce((sum, alloc) => sum + parseFloat(alloc.allocatedAmount || 0), 0);
  
  // Get invoice to get total amount
  const invoice = await Invoice.findByPk(invoiceId, { transaction });
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  
  const totalAmount = parseFloat(invoice.totalWithVAT || invoice.total || 0);
  const outstanding = Math.max(0, totalAmount - totalPaid);
  
  // Log detailed breakdown
  const breakdown = allocations.map(alloc => ({
    paymentId: alloc.paymentId,
    amount: alloc.allocatedAmount,
    status: paymentStatusMap[alloc.paymentId] || 'unknown',
    included: paymentStatusMap[alloc.paymentId] === 'pending' || paymentStatusMap[alloc.paymentId] === 'confirmed'
  }));
  
  console.log('[Payment] Recalculating invoice amounts:', {
    invoiceId,
    totalPaid,
    totalAmount,
    outstanding,
    allocationsCount: allocations.length,
    paymentsCount: payments.length,
    breakdown
  });
  
  // Update invoice
  const updateInvoiceQuery = `
    UPDATE [dbo].[invoices]
    SET [paidAmount] = :paidAmount,
        [outstandingAmount] = :outstandingAmount,
        [updatedAt] = GETDATE()
    WHERE [id] = :invoiceId
  `;
  
  await sequelize.query(updateInvoiceQuery, {
    replacements: {
      paidAmount: totalPaid,
      outstandingAmount: outstanding,
      invoiceId: parseInt(invoiceId)
    },
    transaction
  });
  
  return {
    paidAmount: totalPaid,
    outstandingAmount: outstanding
  };
}

/**
 * Update payment status
 */
async function updatePaymentStatus({ paymentId, status, companyId = 1, updatedBy = 'system' }) {
  const transaction = await sequelize.transaction();
  
  try {
    const payment = await Payment.findOne({
      where: { id: paymentId, companyId },
      include: [{
        model: Invoice,
        as: 'invoice'
      }],
      transaction
    });
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'failed', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    // Update payment status using raw SQL to avoid date issues
    const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');
    
    const updateQuery = `
      UPDATE [dbo].[payments]
      SET [status] = :status,
          [updatedAt] = GETDATE()
      WHERE [id] = :paymentId AND [companyId] = :companyId
    `;
    
    await sequelize.query(updateQuery, {
      replacements: {
        status,
        paymentId: parseInt(paymentId),
        companyId
      },
      transaction
    });
    
    // Reload payment to ensure we have the updated status
    const updatedPaymentInTransaction = await Payment.findByPk(paymentId, {
      transaction,
      raw: true,
      attributes: ['id', 'invoiceId', 'status']
    });
    
    console.log('[Payment] Payment status updated:', {
      paymentId,
      oldStatus: payment.status,
      newStatus: status,
      invoiceId: payment.invoiceId
    });
    
    // Recalculate invoice amounts when payment status changes
    // This ensures cancelled/failed/refunded payments don't count towards paidAmount
    if (payment.invoiceId) {
      console.log('[Payment] Recalculating invoice amounts after status change from', payment.status, 'to', status);
      try {
        const recalculated = await recalculateInvoiceAmounts({
          invoiceId: payment.invoiceId,
          transaction
        });
        
        console.log('[Payment] ✓ Invoice amounts recalculated:', {
          invoiceId: payment.invoiceId,
          paidAmount: recalculated.paidAmount,
          outstandingAmount: recalculated.outstandingAmount
        });
        
        // Update invoice status if needed
        const invoice = await Invoice.findByPk(payment.invoiceId, { transaction });
        if (invoice) {
          const totalAmount = parseFloat(invoice.totalWithVAT || invoice.total || 0);
          const paidAmount = parseFloat(invoice.paidAmount || 0);
          const outstanding = Math.max(0, totalAmount - paidAmount);
          
          const newStatus = outstanding <= 0.01 ? 'paid' : 
                           (invoice.status === 'draft' ? invoice.status : 'sent');
          
          if (invoice.status !== newStatus) {
            const updateStatusQuery = `
              UPDATE [dbo].[invoices]
              SET [status] = :status,
                  [updatedAt] = GETDATE()
              WHERE [id] = :invoiceId
            `;
            
            await sequelize.query(updateStatusQuery, {
              replacements: {
                status: newStatus,
                invoiceId: parseInt(payment.invoiceId)
              },
              transaction
            });
            
            console.log('[Payment] ✓ Invoice status updated to:', newStatus);
          }
        }
      } catch (recalcError) {
        console.error('[Payment] ✗ Error recalculating invoice amounts:', recalcError);
        // Don't fail the status update if recalculation fails, but log it
        throw recalcError; // Actually, let's throw it so the transaction rolls back
      }
    }
    
    await transaction.commit();
    console.log('[Payment] ✓ Payment status updated to:', status);
    
    // Reload payment to get updated data
    const updatedPayment = await Payment.findByPk(paymentId, {
      include: [{
        model: Invoice,
        as: 'invoice'
      }]
    });
    
    return updatedPayment ? updatedPayment.get({ plain: true }) : payment.get({ plain: true });
  } catch (error) {
    console.error('[Payment] ✗ Error updating payment status:', error);
    
    if (transaction && !transaction.finished) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('[Payment] Error during rollback:', rollbackError.message);
      }
    }
    
    throw error;
  }
}

/**
 * Update payment details
 */
async function updatePayment({ 
  paymentId,
  invoiceId,
  paymentDate,
  paymentAmount,
  paymentMethod,
  currency,
  referenceNumber,
  transactionId,
  bankName,
  bankAccount,
  notes,
  companyId = 1
}) {
  const transaction = await sequelize.transaction();
  
  try {
    // Get existing payment
    const payment = await Payment.findOne({
      where: { id: paymentId, companyId },
      include: [{
        model: Invoice,
        as: 'invoice'
      }],
      transaction
    });
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    // If payment is confirmed, we may need to update journal entries
    // For now, we'll allow editing but warn if confirmed
    const oldAmount = parseFloat(payment.paymentAmount || 0);
    const newAmount = parseFloat(paymentAmount || 0);
    const amountChanged = Math.abs(oldAmount - newAmount) > 0.01;
    
    // Format dates for SQL Server
    const formattedPaymentDate = dayjs(paymentDate).format('YYYY-MM-DD');
    const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');
    
    // Update payment using raw SQL to avoid date issues
    const updateQuery = `
      UPDATE [dbo].[payments]
      SET [invoiceId] = :invoiceId,
          [paymentDate] = :paymentDate,
          [paymentAmount] = :paymentAmount,
          [paymentMethod] = :paymentMethod,
          [currency] = :currency,
          [referenceNumber] = :referenceNumber,
          [transactionId] = :transactionId,
          [bankName] = :bankName,
          [bankAccount] = :bankAccount,
          [notes] = :notes,
          [updatedAt] = :updatedAt
      WHERE [id] = :paymentId AND [companyId] = :companyId
    `;
    
    await sequelize.query(updateQuery, {
      replacements: {
        invoiceId: parseInt(invoiceId),
        paymentDate: formattedPaymentDate,
        paymentAmount: parseFloat(paymentAmount),
        paymentMethod: paymentMethod || 'bank_transfer',
        currency: currency || 'AED',
        referenceNumber: referenceNumber || null,
        transactionId: transactionId || null,
        bankName: bankName || null,
        bankAccount: bankAccount || null,
        notes: notes || null,
        updatedAt: formattedNow,
        paymentId: parseInt(paymentId),
        companyId: parseInt(companyId)
      },
      transaction
    });
    
    // If amount changed, update the allocation
    if (amountChanged) {
      const allocation = await PaymentAllocation.findOne({
        where: { paymentId: parseInt(paymentId) },
        transaction
      });
      
      if (allocation) {
        await PaymentAllocation.update(
          { allocatedAmount: parseFloat(paymentAmount) },
          { where: { id: allocation.id }, transaction }
        );
      }
      
      // Recalculate invoice amounts
      const oldInvoiceId = payment.invoiceId;
      if (oldInvoiceId) {
        await recalculateInvoiceAmounts({
          invoiceId: oldInvoiceId,
          transaction
        });
      }
      
      // If invoice changed, update both invoices
      if (parseInt(invoiceId) !== oldInvoiceId) {
        // Remove allocation from old invoice
        if (oldInvoiceId) {
          await PaymentAllocation.destroy({
            where: { paymentId: parseInt(paymentId), invoiceId: oldInvoiceId },
            transaction
          });
          await recalculateInvoiceAmounts({
            invoiceId: oldInvoiceId,
            transaction
          });
        }
        
        // Create allocation for new invoice
        await allocatePaymentToInvoice({
          paymentId: parseInt(paymentId),
          invoiceId: parseInt(invoiceId),
          amount: parseFloat(paymentAmount),
          transaction
        });
      }
    } else if (parseInt(invoiceId) !== payment.invoiceId) {
      // Invoice changed but amount didn't
      const oldInvoiceId = payment.invoiceId;
      
      // Remove allocation from old invoice
      if (oldInvoiceId) {
        await PaymentAllocation.destroy({
          where: { paymentId: parseInt(paymentId), invoiceId: oldInvoiceId },
          transaction
        });
        await recalculateInvoiceAmounts({
          invoiceId: oldInvoiceId,
          transaction
        });
      }
      
      // Create allocation for new invoice
      await allocatePaymentToInvoice({
        paymentId: parseInt(paymentId),
        invoiceId: parseInt(invoiceId),
        amount: parseFloat(paymentAmount),
        transaction
      });
    }
    
    await transaction.commit();
    
    // Reload payment with invoice
    const updatedPayment = await Payment.findByPk(paymentId, {
      include: [{
        model: Invoice,
        as: 'invoice'
      }]
    });
    
    return updatedPayment ? updatedPayment.get({ plain: true }) : null;
  } catch (error) {
    console.error('[Payment] ✗ Error updating payment:', error);
    
    if (transaction && !transaction.finished) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('[Payment] Error during rollback:', rollbackError.message);
      }
    }
    
    throw error;
  }
}

module.exports = {
  createPayment,
  confirmPayment,
  getPaymentsForInvoice,
  getPayments,
  getPaymentSummary,
  refundPayment,
  allocatePaymentToInvoice,
  generatePaymentNumber,
  updatePaymentStatus,
  recalculateInvoiceAmounts,
  updatePayment
};

