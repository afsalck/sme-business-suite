const express = require('express');
const router = express.Router();

const { verifyFirebaseToken, authorizeRole } = require('../server/middleware/authMiddleware');
const { setTenantContext } = require('../server/middleware/tenantMiddleware');
const vatController = require('../server/controllers/vatController');

// All VAT routes require authentication
router.use(verifyFirebaseToken);
// All routes require tenant context
router.use(setTenantContext);

// Compute endpoint is available to all authenticated users (for invoice preview)
router.post('/compute', vatController.computeVatPreview);

// Other routes require admin/accountant role
router.use(authorizeRole('admin', 'accountant'));

router.get('/settings', vatController.getSettings);
router.put('/settings', vatController.updateSettingsHandler);
router.get('/summary', vatController.getSummary);
router.get('/report', vatController.getReport);
router.post('/adjustment', vatController.createAdjustmentHandler);
router.get('/filing-deadline', vatController.getFilingDeadline);

module.exports = router;

