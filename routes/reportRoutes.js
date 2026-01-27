const express = require('express');
const router = express.Router();

// Load models and set up associations first
require('../models/reportAssociations');

const reportController = require('../server/controllers/reportController');
const { authorizeRole } = require('../server/middleware/authMiddleware');
const { setTenantContext } = require('../server/middleware/tenantMiddleware');

// Note: verifyFirebaseToken is already applied globally to all /api routes
// Reports: Admin has full access, Accountant has financial reports only (handled by permissions)
router.use(authorizeRole('admin', 'accountant'));
// All routes require tenant context
router.use(setTenantContext);

// Scheduled Reports (must come before /:id routes to avoid route conflicts)
router.get('/scheduled/all', reportController.getScheduledReports);
router.post('/scheduled', reportController.createScheduledReport);

// Custom Reports
router.get('/', reportController.getReports);
router.post('/', reportController.createReport);
router.get('/:id', reportController.getReport);
router.post('/:id/execute', reportController.executeReport);
router.get('/:id/export', reportController.exportReport);

module.exports = router;

