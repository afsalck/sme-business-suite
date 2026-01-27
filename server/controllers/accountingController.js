const accountingService = require('../services/accountingService');
const { sequelize } = require('../config/database');
const dayjs = require('dayjs');

// Load models and set up associations
const {
  JournalEntry,
  JournalEntryLine,
  ChartOfAccount
} = require('../../models/accountingAssociations');

/**
 * Get Chart of Accounts
 */
async function getChartOfAccounts(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { accountType, includeInactive } = req.query;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const accounts = await accountingService.getChartOfAccounts({
      companyId,
      accountType: accountType || null,
      includeInactive: includeInactive === 'true'
    });

    res.json(accounts);
  } catch (error) {
    console.error('[Accounting] Get chart of accounts error:', error);
    res.status(500).json({ message: 'Failed to fetch chart of accounts', error: error.message });
  }
}

/**
 * Create or Update Chart of Account
 */
async function saveChartOfAccount(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    // For PUT requests, get ID from params; for POST, get from body (or leave undefined for new account)
    const id = req.params.id ? parseInt(req.params.id) : (req.body.id ? parseInt(req.body.id) : undefined);
    const { accountCode, accountName, accountType, parentAccountId, isActive, openingBalance, description } = req.body;
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const userId = req.user?.email || req.user?.uid || 'unknown';

    console.log('[Accounting] Saving chart of account:', { id, accountCode, accountName, accountType, openingBalance, method: req.method });

    if (!accountCode || !accountName || !accountType) {
      return res.status(400).json({ message: 'Account code, name, and type are required' });
    }

    // Validate openingBalance is a valid number
    const openingBalanceNum = openingBalance !== undefined && openingBalance !== null && openingBalance !== '' 
      ? parseFloat(openingBalance) 
      : 0;
    
    if (isNaN(openingBalanceNum)) {
      return res.status(400).json({ message: 'Opening balance must be a valid number' });
    }

    // Check if opening balance is being changed (for update operations)
    let oldOpeningBalance = null;
    if (id) {
      const oldAccount = await sequelize.query(`
        SELECT [openingBalance] FROM [dbo].[chart_of_accounts] WHERE [id] = ?
      `, {
        replacements: [id],
        type: sequelize.QueryTypes.SELECT
      });
      if (oldAccount && oldAccount.length > 0) {
        oldOpeningBalance = parseFloat(oldAccount[0].openingBalance || 0);
      }
    }

    const account = await accountingService.saveChartOfAccount({
      id,
      accountCode,
      accountName,
      accountType,
      parentAccountId: parentAccountId || null,
      isActive: isActive !== undefined ? isActive : true,
      openingBalance: openingBalanceNum,
      description: description || null,
      companyId
    });

    console.log('[Accounting] Account saved successfully:', account.id);
    
    // If opening balance was changed, suggest recalculation
    const openingBalanceChanged = id && oldOpeningBalance !== null && 
      Math.abs(oldOpeningBalance - openingBalanceNum) > 0.01;
    
    res.json({
      ...account,
      openingBalanceChanged,
      message: openingBalanceChanged 
        ? 'Opening balance updated. Please run "Recalculate Balances" to update General Ledger running balances.'
        : undefined
    });
  } catch (error) {
    console.error('[Accounting] Save chart of account error:', error);
    console.error('[Accounting] Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to save chart of account', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Create Journal Entry
 */
async function createJournalEntry(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { entryDate, description, reference, referenceType, referenceId, lines } = req.body;
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const createdBy = req.user?.email || req.user?.uid || 'unknown';

    if (!entryDate || !description || !lines || !Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({ message: 'Entry date, description, and at least 2 lines are required' });
    }

    const entry = await accountingService.createJournalEntry({
      entryDate,
      description,
      reference: reference || null,
      referenceType: referenceType || null,
      referenceId: referenceId || null,
      lines,
      createdBy,
      companyId
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error('[Accounting] Create journal entry error:', error);
    res.status(500).json({ message: 'Failed to create journal entry', error: error.message });
  }
}

/**
 * Get Journal Entries
 */
async function getJournalEntries(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { fromDate, toDate, status, limit = 50, offset = 0 } = req.query;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const JournalEntry = require('../../models/JournalEntry');
    const JournalEntryLine = require('../../models/JournalEntryLine');
    const ChartOfAccount = require('../../models/ChartOfAccount');

    const where = { companyId };
    
    if (status) {
      where.status = status;
    }

    if (fromDate) {
      where.entryDate = {
        ...where.entryDate,
        [sequelize.Sequelize.Op.gte]: dayjs(fromDate).startOf('day').format('YYYY-MM-DD HH:mm:ss')
      };
    }

    if (toDate) {
      where.entryDate = {
        ...where.entryDate,
        [sequelize.Sequelize.Op.lte]: dayjs(toDate).endOf('day').format('YYYY-MM-DD HH:mm:ss')
      };
    }

    const entries = await JournalEntry.findAndCountAll({
      where,
      include: [
        {
          model: JournalEntryLine,
          as: 'lines',
          include: [
            {
              model: ChartOfAccount,
              as: 'account'
            }
          ]
        }
      ],
      order: [['entryDate', 'DESC'], ['entryNumber', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      entries: entries.rows.map(e => e.get({ plain: true })),
      total: entries.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('[Accounting] Get journal entries error:', error);
    res.status(500).json({ message: 'Failed to fetch journal entries', error: error.message });
  }
}

/**
 * Post Journal Entry
 */
async function postJournalEntry(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { id } = req.params;
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const postedBy = req.user?.email || req.user?.uid || 'unknown';

    const entry = await accountingService.postJournalEntry(parseInt(id), postedBy, companyId);

    res.json(entry);
  } catch (error) {
    console.error('[Accounting] Post journal entry error:', error);
    res.status(500).json({ message: 'Failed to post journal entry', error: error.message });
  }
}

/**
 * Get General Ledger
 */
async function getGeneralLedger(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { accountId, fromDate, toDate } = req.query;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const ledgerEntries = await accountingService.getGeneralLedger({
      accountId: accountId ? parseInt(accountId) : null,
      fromDate: fromDate || null,
      toDate: toDate || null,
      companyId
    });

    res.json(ledgerEntries);
  } catch (error) {
    console.error('[Accounting] Get general ledger error:', error);
    res.status(500).json({ message: 'Failed to fetch general ledger', error: error.message });
  }
}

/**
 * Get Trial Balance
 */
async function getTrialBalance(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { fromDate, toDate } = req.query;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const trialBalance = await accountingService.getTrialBalance({
      fromDate: fromDate || null,
      toDate: toDate || null,
      companyId
    });

    res.json(trialBalance);
  } catch (error) {
    console.error('[Accounting] Get trial balance error:', error);
    res.status(500).json({ message: 'Failed to fetch trial balance', error: error.message });
  }
}

/**
 * Get Profit & Loss Statement
 */
async function getProfitAndLoss(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { fromDate, toDate } = req.query;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const pnl = await accountingService.getProfitAndLoss({
      fromDate: fromDate || null,
      toDate: toDate || null,
      companyId
    });

    res.json(pnl);
  } catch (error) {
    console.error('[Accounting] Get profit and loss error:', error);
    res.status(500).json({ message: 'Failed to fetch profit and loss statement', error: error.message });
  }
}

/**
 * Get Balance Sheet
 */
async function getBalanceSheet(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { asOfDate } = req.query;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const balanceSheet = await accountingService.getBalanceSheet({
      asOfDate: asOfDate || null,
      companyId
    });

    res.json(balanceSheet);
  } catch (error) {
    console.error('[Accounting] Get balance sheet error:', error);
    res.status(500).json({ message: 'Failed to fetch balance sheet', error: error.message });
  }
}

/**
 * Recalculate all account balances from General Ledger
 */
async function recalculateBalances(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const { accountId } = req.query; // Optional: recalculate specific account

    console.log('[Accounting] Recalculating account balances...', accountId ? `(Account: ${accountId})` : '');
    const results = await accountingService.recalculateAccountBalances({ companyId, accountId: accountId ? parseInt(accountId) : null });

    res.json({
      success: true,
      message: `Recalculation completed. Updated ${results.updatedAccounts} accounts.`,
      ...results
    });
  } catch (error) {
    console.error('[Accounting] Recalculate balances error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to recalculate balances', 
      error: error.message 
    });
  }
}

/**
 * Get diagnostic info for an account (entries, balances, etc.)
 */
async function getAccountDiagnostics(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { accountId } = req.query;
    if (!accountId) {
      return res.status(400).json({ message: 'Account ID is required' });
    }

    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const { ChartOfAccount, GeneralLedger } = require('../../models/accountingAssociations');

    // Get account info
    const account = await ChartOfAccount.findByPk(accountId);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Get all ledger entries for this account
    const ledgerEntries = await GeneralLedger.findAll({
      where: { accountId },
      include: [
        {
          model: require('../../models/JournalEntry'),
          as: 'journalEntry',
          required: false
        }
      ],
      order: [['entryDate', 'ASC'], ['id', 'ASC']],
      raw: false
    });

    // Calculate expected balance
    let calculatedBalance = parseFloat(account.openingBalance || 0);
    const entryDetails = [];

    for (const entry of ledgerEntries) {
      const debit = parseFloat(entry.debitAmount || 0);
      const credit = parseFloat(entry.creditAmount || 0);
      
      if (account.accountType === 'Asset' || account.accountType === 'Expense') {
        calculatedBalance = calculatedBalance + debit - credit;
      } else {
        calculatedBalance = calculatedBalance + credit - debit;
      }

      entryDetails.push({
        id: entry.id,
        date: entry.entryDate,
        journalEntryId: entry.journalEntryId,
        journalEntryNumber: entry.journalEntry?.entryNumber,
        debit,
        credit,
        storedRunningBalance: parseFloat(entry.runningBalance || 0),
        calculatedRunningBalance: Math.round(calculatedBalance * 100) / 100,
        description: entry.description,
        reference: entry.reference
      });
    }

    res.json({
      account: {
        id: account.id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        openingBalance: parseFloat(account.openingBalance || 0),
        currentBalance: parseFloat(account.currentBalance || 0),
        calculatedBalance: Math.round(calculatedBalance * 100) / 100
      },
      entries: entryDetails,
      entryCount: ledgerEntries.length,
      hasDiscrepancy: Math.abs(calculatedBalance - parseFloat(account.currentBalance || 0)) > 0.01
    });
  } catch (error) {
    console.error('[Accounting] Get account diagnostics error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get account diagnostics', 
      error: error.message 
    });
  }
}

module.exports = {
  getChartOfAccounts,
  saveChartOfAccount,
  createJournalEntry,
  getJournalEntries,
  postJournalEntry,
  getGeneralLedger,
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet,
  recalculateBalances,
  getAccountDiagnostics
};

