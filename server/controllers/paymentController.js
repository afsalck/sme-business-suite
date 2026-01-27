const paymentService = require('../services/paymentService');
const { sequelize } = require('../config/database');
const { Payment, PaymentAllocation } = require('../../models/paymentAssociations');
const Invoice = require('../../models/Invoice');

/**
 * Create Payment
 */
async function createPayment(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const {
      invoiceId,
      paymentDate,
      paymentAmount,
      paymentMethod,
      currency,
      referenceNumber,
      transactionId,
      bankName,
      bankAccount,
      notes
    } = req.body;
    
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const createdBy = req.user?.email || req.user?.uid || 'unknown';

    if (!invoiceId || !paymentAmount) {
      return res.status(400).json({ message: 'Invoice ID and payment amount are required' });
    }

    // Verify invoice exists
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Check if payment amount exceeds outstanding
    const outstanding = parseFloat(invoice.outstandingAmount || invoice.totalWithVAT || 0);
    if (parseFloat(paymentAmount) > outstanding + 0.01) { // Allow small rounding differences
      return res.status(400).json({ 
        message: `Payment amount (${paymentAmount}) exceeds outstanding amount (${outstanding})` 
      });
    }

    const payment = await paymentService.createPayment({
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
      companyId,
      createdBy
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error('[Payment] Create error:', error);
    res.status(500).json({ message: 'Failed to create payment', error: error.message });
  }
}

/**
 * Get Payments
 */
async function getPayments(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { invoiceId, status, fromDate, toDate } = req.query;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const payments = await paymentService.getPayments({
      invoiceId: invoiceId ? parseInt(invoiceId) : null,
      status: status || null,
      fromDate: fromDate || null,
      toDate: toDate || null,
      companyId
    });

    res.json(payments);
  } catch (error) {
    console.error('[Payment] Get payments error:', error);
    res.status(500).json({ message: 'Failed to fetch payments', error: error.message });
  }
}

/**
 * Get Payment by ID
 */
async function getPayment(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { id } = req.params;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const payment = await Payment.findOne({
      where: { id: parseInt(id), companyId },
      include: [{
        model: Invoice,
        as: 'invoice',
        attributes: ['id', 'invoiceNumber', 'customerName', 'totalWithVAT', 'paidAmount', 'outstandingAmount']
      }]
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json(payment.get({ plain: true }));
  } catch (error) {
    console.error('[Payment] Get payment error:', error);
    res.status(500).json({ message: 'Failed to fetch payment', error: error.message });
  }
}

/**
 * Get Payments for Invoice
 */
async function getPaymentsForInvoice(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { invoiceId } = req.params;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const payments = await paymentService.getPaymentsForInvoice({
      invoiceId: parseInt(invoiceId),
      companyId
    });

    res.json(payments);
  } catch (error) {
    console.error('[Payment] Get payments for invoice error:', error);
    res.status(500).json({ message: 'Failed to fetch payments', error: error.message });
  }
}

/**
 * Confirm Payment
 */
async function confirmPayment(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { id } = req.params;
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const confirmedBy = req.user?.email || req.user?.uid || 'unknown';

    const payment = await paymentService.confirmPayment({
      paymentId: parseInt(id),
      companyId,
      confirmedBy
    });

    res.json(payment);
  } catch (error) {
    console.error('[Payment] Confirm payment error:', error);
    res.status(500).json({ message: 'Failed to confirm payment', error: error.message });
  }
}

/**
 * Refund Payment
 */
async function refundPayment(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { id } = req.params;
    const { refundAmount, notes } = req.body;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const payment = await paymentService.refundPayment({
      paymentId: parseInt(id),
      refundAmount: refundAmount ? parseFloat(refundAmount) : null,
      notes: notes || null,
      companyId
    });

    res.json(payment);
  } catch (error) {
    console.error('[Payment] Refund payment error:', error);
    res.status(500).json({ message: 'Failed to refund payment', error: error.message });
  }
}

/**
 * Get Payment Summary
 */
async function getPaymentSummary(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { fromDate, toDate } = req.query;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const summary = await paymentService.getPaymentSummary({
      fromDate: fromDate || null,
      toDate: toDate || null,
      companyId
    });

    res.json(summary);
  } catch (error) {
    console.error('[Payment] Get summary error:', error);
    res.status(500).json({ message: 'Failed to fetch payment summary', error: error.message });
  }
}

/**
 * Update Payment Status
 */
async function updatePaymentStatus(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { id } = req.params;
    const { status } = req.body;
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const updatedBy = req.user?.email || req.user?.uid || 'unknown';

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const payment = await paymentService.updatePaymentStatus({
      paymentId: parseInt(id),
      status,
      companyId,
      updatedBy
    });

    res.json(payment);
  } catch (error) {
    console.error('[Payment] Update status error:', error);
    res.status(500).json({ message: 'Failed to update payment status', error: error.message });
  }
}

/**
 * Recalculate invoice amounts (manual trigger)
 */
async function recalculateInvoice(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { invoiceId } = req.params;
    const { recalculateInvoiceAmounts } = require('../services/paymentService');
    
    const result = await recalculateInvoiceAmounts({
      invoiceId: parseInt(invoiceId)
    });

    res.json({ 
      message: 'Invoice amounts recalculated successfully',
      paidAmount: result.paidAmount,
      outstandingAmount: result.outstandingAmount
    });
  } catch (error) {
    console.error('[Payment] Recalculate invoice error:', error);
    res.status(500).json({ message: 'Failed to recalculate invoice amounts', error: error.message });
  }
}

/**
 * Update Payment
 */
async function updatePayment(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { id } = req.params;
    const {
      invoiceId,
      paymentDate,
      paymentAmount,
      paymentMethod,
      currency,
      referenceNumber,
      transactionId,
      bankName,
      bankAccount,
      notes
    } = req.body;
    
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    if (!invoiceId || !paymentAmount) {
      return res.status(400).json({ message: 'Invoice ID and payment amount are required' });
    }

    // Verify invoice exists
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const payment = await paymentService.updatePayment({
      paymentId: id,
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
      companyId
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    console.error('[Payment] Update error:', error);
    res.status(500).json({ message: 'Failed to update payment', error: error.message });
  }
}

module.exports = {
  createPayment,
  getPayments,
  getPayment,
  getPaymentsForInvoice,
  confirmPayment,
  refundPayment,
  getPaymentSummary,
  updatePaymentStatus,
  recalculateInvoice,
  updatePayment
};

