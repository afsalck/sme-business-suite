const express = require('express');
const router = express.Router();

// Load models and set up associations first
require('../models/vatFilingAssociations');

const vatFilingController = require('../server/controllers/vatFilingController');
const { verifyFirebaseToken, authorizeRole } = require('../server/middleware/authMiddleware');
const { setTenantContext } = require('../server/middleware/tenantMiddleware');

// All routes require authentication
router.use(verifyFirebaseToken);
// All routes require tenant context
router.use(setTenantContext);

// All routes require admin/accountant role
router.use(authorizeRole('admin', 'accountant'));

// VAT Filing CRUD
router.get('/', vatFilingController.getVatFilings);
router.post('/', vatFilingController.createVatFiling);
router.get('/:id', vatFilingController.getVatFiling);
router.post('/:id/generate-files', vatFilingController.generateFtaFiles);
router.get('/:id/download-xml', vatFilingController.downloadFtaXml);
router.get('/:id/download-csv', vatFilingController.downloadFtaCsv);
router.post('/:id/submit', vatFilingController.submitVatFiling);

module.exports = router;

