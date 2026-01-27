const express = require('express');
const router = express.Router();

// Load models and set up associations first
require('../models/kycAssociations');

const kycController = require('../server/controllers/kycController');
const { verifyFirebaseToken, authorizeRole } = require('../server/middleware/authMiddleware');
const { setTenantContext } = require('../server/middleware/tenantMiddleware');

// All routes require authentication
router.use(verifyFirebaseToken);
// All routes require tenant context
router.use(setTenantContext);

// All routes require admin role only (KYC is compliance, not accounting)
router.use(authorizeRole('admin'));

// Client CRUD
router.get('/', kycController.getClients);
router.post('/', kycController.createClient);
router.get('/:id', kycController.getClient);
router.put('/:id/kyc-status', kycController.updateKycStatus);

// Document management
router.post('/:id/documents', kycController.uploadDocument);
router.put('/documents/:id/verify', kycController.verifyDocument);
router.get('/documents/:id/download', kycController.downloadDocument);

// AML Screening
router.post('/:id/aml-screening', kycController.performAmlScreening);
router.get('/:id/aml-screenings', kycController.getClientScreenings);
router.put('/aml-screenings/:id/decision', kycController.updateScreeningDecision);

module.exports = router;

