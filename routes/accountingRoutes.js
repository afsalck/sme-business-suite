const express = require('express');
const router = express.Router();

// Load models and set up associations first
require('../models/accountingAssociations');

const accountingController = require('../server/controllers/accountingController');
const { verifyFirebaseToken, authorizeRole } = require('../server/middleware/authMiddleware');
const { setTenantContext } = require('../server/middleware/tenantMiddleware');

// All routes require authentication
router.use(verifyFirebaseToken);
// All routes require tenant context
router.use(setTenantContext);

// Chart of Accounts
// More specific routes must come before parameterized routes
router.get('/chart-of-accounts', accountingController.getChartOfAccounts);
router.post('/chart-of-accounts/recalculate-balances', authorizeRole('admin', 'accountant'), accountingController.recalculateBalances);
router.get('/chart-of-accounts/diagnostics', authorizeRole('admin', 'accountant'), accountingController.getAccountDiagnostics);
router.post('/chart-of-accounts', authorizeRole('admin', 'accountant'), accountingController.saveChartOfAccount);
router.put('/chart-of-accounts/:id', authorizeRole('admin', 'accountant'), accountingController.saveChartOfAccount);

// Journal Entries
router.get('/journal-entries', accountingController.getJournalEntries);
router.post('/journal-entries', authorizeRole('admin', 'accountant'), accountingController.createJournalEntry);
router.post('/journal-entries/:id/post', authorizeRole('admin', 'accountant'), accountingController.postJournalEntry);

// General Ledger
router.get('/general-ledger', accountingController.getGeneralLedger);

// Financial Statements
router.get('/trial-balance', accountingController.getTrialBalance);
router.get('/profit-loss', accountingController.getProfitAndLoss);
router.get('/balance-sheet', accountingController.getBalanceSheet);

module.exports = router;

