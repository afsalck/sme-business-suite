const express = require('express');
const router = express.Router();

// Load models and set up associations first
require('../models/paymentAssociations');

const paymentController = require('../server/controllers/paymentController');
const { verifyFirebaseToken, authorizeRole } = require('../server/middleware/authMiddleware');
const { setTenantContext } = require('../server/middleware/tenantMiddleware');

// All routes require authentication
router.use(verifyFirebaseToken);
// All routes require tenant context
router.use(setTenantContext);

// Payment CRUD
router.get('/', authorizeRole('admin', 'accountant'), paymentController.getPayments);
router.post('/', authorizeRole('admin', 'accountant'), paymentController.createPayment);
router.get('/summary', authorizeRole('admin', 'accountant'), paymentController.getPaymentSummary);
router.get('/:id', authorizeRole('admin', 'accountant'), paymentController.getPayment);
router.put('/:id', authorizeRole('admin', 'accountant'), paymentController.updatePayment);
router.post('/:id/confirm', authorizeRole('admin', 'accountant'), paymentController.confirmPayment);
router.post('/:id/refund', authorizeRole('admin', 'accountant'), paymentController.refundPayment);
router.patch('/:id/status', authorizeRole('admin', 'accountant'), paymentController.updatePaymentStatus);
router.post('/invoice/:invoiceId/recalculate', authorizeRole('admin', 'accountant'), paymentController.recalculateInvoice);

// Payments for specific invoice
router.get('/invoice/:invoiceId', authorizeRole('admin', 'accountant'), paymentController.getPaymentsForInvoice);

module.exports = router;

