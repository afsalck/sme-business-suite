const express = require('express');
const router = express.Router();

const { authorizeRole } = require('../server/middleware/authMiddleware');
const vatController = require('../server/controllers/vatController');

router.get(
  '/settings',
  authorizeRole('admin', 'accountant'),
  vatController.getSettings
);

router.put(
  '/settings',
  authorizeRole('admin', 'accountant'),
  vatController.updateSettingsHandler
);

router.get(
  '/summary',
  authorizeRole('admin', 'accountant'),
  vatController.getSummary
);

router.get(
  '/report',
  authorizeRole('admin', 'accountant'),
  vatController.getReport
);

router.post(
  '/compute',
  authorizeRole('admin', 'accountant'),
  vatController.computeVatPreview
);

router.post(
  '/adjustment',
  authorizeRole('admin', 'accountant'),
  vatController.createAdjustmentHandler
);

router.get(
  '/filing-deadline',
  authorizeRole('admin', 'accountant'),
  vatController.getFilingDeadline
);

module.exports = router;

