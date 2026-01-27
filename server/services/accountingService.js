const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const dayjs = require('dayjs');

// Load models and set up associations
const {
  ChartOfAccount,
  JournalEntry,
  JournalEntryLine,
  GeneralLedger
} = require('../../models/accountingAssociations');
const FinancialPeriod = require('../../models/FinancialPeriod');

/**
 * Normalize number to handle null/undefined
 */
function normalizeNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? 0 : num;
}

/**
 * Round to 2 decimal places using standard rounding
 */
function roundAmount(amount) {
  return Math.round(normalizeNumber(amount) * 100) / 100;
}

/**
 * Generate next journal entry number
 */
async function generateEntryNumber(companyId = 1, transaction = null) {
  const year = dayjs().year();
  const prefix = `JE-${year}-`;
  
  const options = {
    where: {
      companyId,
        entryNumber: {
          [Op.like]: `${prefix}%`
        }
    },
    order: [['entryNumber', 'DESC']]
  };
  
  if (transaction) {
    options.transaction = transaction;
  }
  
  const lastEntry = await JournalEntry.findOne(options);

  let nextNumber = 1;
  if (lastEntry) {
    const lastNum = parseInt(lastEntry.entryNumber.split('-')[2] || '0');
    nextNumber = lastNum + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

/**
 * Validate journal entry (double-entry bookkeeping rules)
 */
function validateJournalEntry(lines) {
  if (!lines || lines.length < 2) {
    throw new Error('Journal entry must have at least 2 lines');
  }

  let totalDebits = 0;
  let totalCredits = 0;

  for (const line of lines) {
    const debit = roundAmount(line.debitAmount || 0);
    const credit = roundAmount(line.creditAmount || 0);

    if (debit < 0 || credit < 0) {
      throw new Error('Debit and credit amounts cannot be negative');
    }

    if (debit > 0 && credit > 0) {
      throw new Error('A line cannot have both debit and credit amounts');
    }

    if (debit === 0 && credit === 0) {
      throw new Error('A line must have either debit or credit amount');
    }

    totalDebits += debit;
    totalCredits += credit;
  }

  // Double-entry rule: Total debits must equal total credits
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error(`Journal entry is not balanced. Debits: ${totalDebits.toFixed(2)}, Credits: ${totalCredits.toFixed(2)}`);
  }

  return { totalDebits, totalCredits };
}

/**
 * Create a journal entry
 */
async function createJournalEntry({ entryDate, description, reference, referenceType, referenceId, lines, createdBy, companyId = 1 }) {
  let transaction = null;

  try {
    // Validate entry first (before transaction)
    validateJournalEntry(lines);

    // Start transaction
    transaction = await sequelize.transaction();

    // Generate entry number (within transaction to avoid race conditions)
    const entryNumber = await generateEntryNumber(companyId, transaction);
    console.log('[Accounting] Generated entry number:', entryNumber);

    // Format dates for SQL Server
    const formattedEntryDate = dayjs(entryDate).format('YYYY-MM-DD HH:mm:ss');
    const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');

    console.log('[Accounting] Creating journal entry with:', {
      entryNumber,
      entryDate: formattedEntryDate,
      description: description.substring(0, 50),
      linesCount: lines.length
    });

    // Create journal entry using raw SQL to avoid Sequelize date issues
    const insertResult = await sequelize.query(`
      INSERT INTO [dbo].[journal_entries] 
        ([companyId], [entryNumber], [entryDate], [description], [reference], [referenceType], [referenceId], [status], [createdBy], [createdAt], [updatedAt])
      OUTPUT INSERTED.id, INSERTED.entryNumber, INSERTED.entryDate, INSERTED.description, INSERTED.reference, INSERTED.referenceType, INSERTED.referenceId, INSERTED.status, INSERTED.createdBy, INSERTED.createdAt, INSERTED.updatedAt
      VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
    `, {
      replacements: [
        companyId,
        entryNumber,
        formattedEntryDate,
        description,
        reference || null,
        referenceType || null,
        referenceId || null,
        createdBy,
        formattedNow,
        formattedNow
      ],
      transaction,
      type: sequelize.QueryTypes.SELECT
    });

    // Sequelize returns [rows, metadata] for SELECT queries
    // For OUTPUT INSERTED queries, the result structure is: [rows, metadata]
    // where rows is an array of result objects
    let insertedRow = null;
    
    if (Array.isArray(insertResult) && insertResult.length > 0) {
      const rows = insertResult[0]; // Get the rows array from [rows, metadata]
      
      // rows could be an array of objects OR a single object
      if (Array.isArray(rows) && rows.length > 0) {
        insertedRow = rows[0]; // Standard case: array of rows
      } else if (rows && typeof rows === 'object' && rows.id) {
        insertedRow = rows; // Direct object case (what we're seeing in logs)
      }
    }
    
    if (!insertedRow || !insertedRow.id) {
      console.error('[Accounting] Unexpected insert result structure:');
      console.error('[Accounting] Full result:', JSON.stringify(insertResult, null, 2));
      throw new Error('Failed to create journal entry - invalid result structure');
    }

    const entryId = insertedRow.id;
    console.log('[Accounting] ✓ Journal entry created with ID:', entryId);

    // Create journal entry lines using raw SQL
    for (const line of lines) {
      await sequelize.query(`
        INSERT INTO [dbo].[journal_entry_lines]
          ([journalEntryId], [accountId], [debitAmount], [creditAmount], [description], [createdAt], [updatedAt])
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, {
        replacements: [
          entryId,
          line.accountId,
          roundAmount(line.debitAmount || 0),
          roundAmount(line.creditAmount || 0),
          line.description || null,
          formattedNow,
          formattedNow
        ],
        transaction,
        type: sequelize.QueryTypes.INSERT
      });
    }

    console.log('[Accounting] Journal entry lines created');

    await transaction.commit();
    console.log('[Accounting] Transaction committed');

    // Reload entry with lines
    const fullEntry = await JournalEntry.findByPk(entryId, {
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
      ]
    });

    return fullEntry ? fullEntry.get({ plain: true }) : insertedRow;
  } catch (error) {
    console.error('[Accounting] Error creating journal entry:', error.message);
    console.error('[Accounting] Error name:', error.name);
    console.error('[Accounting] Error stack:', error.stack);
    
    // Only rollback if transaction is still active
    if (transaction && !transaction.finished) {
      try {
        await transaction.rollback();
        console.log('[Accounting] Transaction rolled back');
      } catch (rollbackError) {
        console.error('[Accounting] Error during rollback:', rollbackError.message);
      }
    }
    throw error;
  }
}

/**
 * Post a journal entry (move from draft to posted, update general ledger)
 */
async function postJournalEntry(entryId, postedBy, companyId = 1) {
  const transaction = await sequelize.transaction();

  try {
    const entry = await JournalEntry.findByPk(entryId, {
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
      transaction
    });

    if (!entry) {
      throw new Error('Journal entry not found');
    }

    if (entry.status !== 'draft') {
      throw new Error(`Cannot post journal entry with status: ${entry.status}`);
    }

    // Update entry status using raw SQL to avoid date issues
    const formattedPostedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const formattedUpdatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    
    await sequelize.query(`
      UPDATE [dbo].[journal_entries]
      SET [status] = 'posted',
          [postedBy] = ?,
          [postedAt] = ?,
          [updatedAt] = ?
      WHERE [id] = ?
    `, {
      replacements: [postedBy, formattedPostedAt, formattedUpdatedAt, entryId],
      transaction,
      type: sequelize.QueryTypes.UPDATE
    });

    // Create general ledger entries and update account balances
    // Track running balances per account to handle multiple lines for same account correctly
    const accountBalances = new Map(); // accountId -> current running balance
    
    for (const line of entry.lines) {
      const account = line.account;
      const debitAmount = roundAmount(line.debitAmount);
      const creditAmount = roundAmount(line.creditAmount);

      // Get or calculate starting balance for this account
      let runningBalance;
      if (accountBalances.has(account.id)) {
        // We've already processed a line for this account in this journal entry
        // Use the balance we calculated for the previous line
        runningBalance = accountBalances.get(account.id);
      } else {
        // First line for this account in this journal entry
        // Get the last ledger entry (excluding entries from this journal entry)
        const lastLedgerEntry = await GeneralLedger.findOne({
          where: { 
            accountId: account.id,
            journalEntryId: { [Op.ne]: entry.id } // Exclude current entry
          },
          order: [['entryDate', 'DESC'], ['id', 'DESC']],
          transaction
        });

        runningBalance = lastLedgerEntry 
          ? normalizeNumber(lastLedgerEntry.runningBalance) 
          : normalizeNumber(account.openingBalance);
      }

      // Update running balance based on account type
      if (account.accountType === 'Asset' || account.accountType === 'Expense') {
        // Assets and Expenses: Debit increases, Credit decreases
        runningBalance = runningBalance + debitAmount - creditAmount;
      } else {
        // Liabilities, Equity, Revenue: Credit increases, Debit decreases
        runningBalance = runningBalance + creditAmount - debitAmount;
      }

      // Store the updated balance for this account
      accountBalances.set(account.id, runningBalance);

      // Create general ledger entry using raw SQL
      const formattedEntryDate = dayjs(entry.entryDate).format('YYYY-MM-DD HH:mm:ss');
      const formattedCreatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
      
      await sequelize.query(`
        INSERT INTO [dbo].[general_ledger]
          ([companyId], [accountId], [journalEntryId], [journalEntryLineId], [entryDate], [debitAmount], [creditAmount], [runningBalance], [description], [reference], [createdAt])
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, {
        replacements: [
          companyId,
          account.id,
          entry.id,
          line.id,
          formattedEntryDate,
          debitAmount,
          creditAmount,
          roundAmount(runningBalance),
          line.description || entry.description || null,
          entry.reference || null,
          formattedCreatedAt
        ],
        transaction,
        type: sequelize.QueryTypes.INSERT
      });

      // Update account current balance using raw SQL
      const formattedAccountUpdatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
      
      await sequelize.query(`
        UPDATE [dbo].[chart_of_accounts]
        SET [currentBalance] = ?,
            [updatedAt] = ?
        WHERE [id] = ?
      `, {
        replacements: [roundAmount(runningBalance), formattedAccountUpdatedAt, account.id],
        transaction,
        type: sequelize.QueryTypes.UPDATE
      });
    }

    await transaction.commit();

    // Reload entry
    const updatedEntry = await JournalEntry.findByPk(entryId, {
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
      ]
    });

    if (updatedEntry) {
      return updatedEntry.get({ plain: true });
    }
    // Fallback: return entry as plain object if available
    return entry && typeof entry.get === 'function' ? entry.get({ plain: true }) : entry;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Get chart of accounts
 */
async function getChartOfAccounts({ companyId = 1, accountType = null, includeInactive = false } = {}) {
  const where = { companyId };
  
  if (accountType) {
    where.accountType = accountType;
  }
  
  if (!includeInactive) {
    where.isActive = true;
  }

  const accounts = await ChartOfAccount.findAll({
    where,
    order: [['accountCode', 'ASC']],
    include: [
      {
        model: ChartOfAccount,
        as: 'parentAccount',
        required: false
      },
      {
        model: ChartOfAccount,
        as: 'childAccounts',
        required: false
      }
    ]
  });

  return accounts;
}

/**
 * Create or update chart of account
 */
async function saveChartOfAccount({ id, accountCode, accountName, accountType, parentAccountId, isActive, openingBalance, description, companyId = 1 }) {
  if (id) {
    // Update existing account
    const account = await ChartOfAccount.findByPk(id);
    if (!account) {
      throw new Error('Account not found');
    }

    // If account code is being changed, check if the new code already exists on another account
    if (account.accountCode !== accountCode) {
      const existing = await ChartOfAccount.findOne({
        where: { 
          accountCode, 
          companyId,
          id: { [Op.ne]: id } // Exclude current account
        }
      });

      if (existing) {
        throw new Error(`Account code ${accountCode} already exists`);
      }
    }

    // Use raw SQL to avoid Sequelize timezone issues with SQL Server DATETIME
    const formattedUpdatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    await sequelize.query(`
      UPDATE [dbo].[chart_of_accounts]
      SET [accountCode] = ?,
          [accountName] = ?,
          [accountType] = ?,
          [parentAccountId] = ?,
          [isActive] = ?,
          [openingBalance] = ?,
          [description] = ?,
          [updatedAt] = ?
      WHERE [id] = ?
    `, {
      replacements: [
        accountCode,
        accountName,
        accountType,
        parentAccountId || null,
        isActive !== undefined ? isActive : account.isActive,
        roundAmount(openingBalance || 0),
        description || null,
        formattedUpdatedAt,
        id
      ],
      type: sequelize.QueryTypes.UPDATE
    });

    // Reload the account to get the latest data from database
    await account.reload();

    // Note: If opening balance is changed, the user should run "Recalculate Balances"
    // to update currentBalance and all General Ledger running balances properly

    return account;
  } else {
    // Create new account
    // Check if account code already exists
    const existing = await ChartOfAccount.findOne({
      where: { accountCode, companyId }
    });

    if (existing) {
      throw new Error(`Account code ${accountCode} already exists`);
    }

    const account = await ChartOfAccount.create({
      companyId,
      accountCode,
      accountName,
      accountType,
      parentAccountId: parentAccountId || null,
      isActive: isActive !== undefined ? isActive : true,
      openingBalance: roundAmount(openingBalance || 0),
      currentBalance: roundAmount(openingBalance || 0),
      description: description || null
    });

    return account;
  }
}

/**
 * Get general ledger for an account
 */
async function getGeneralLedger({ accountId, fromDate, toDate, companyId = 1 } = {}) {
  // Build WHERE conditions
  const conditions = ['gl.companyId = ?'];
  const replacements = [companyId];

  if (accountId) {
    conditions.push('gl.accountId = ?');
    replacements.push(accountId);
  }

  // Handle date range filtering with formatted dates for SQL Server
  if (fromDate && toDate) {
    conditions.push('gl.entryDate >= ? AND gl.entryDate <= ?');
    replacements.push(
      dayjs(fromDate).startOf('day').format('YYYY-MM-DD HH:mm:ss'),
      dayjs(toDate).endOf('day').format('YYYY-MM-DD HH:mm:ss')
    );
  } else if (fromDate) {
    conditions.push('gl.entryDate >= ?');
    replacements.push(dayjs(fromDate).startOf('day').format('YYYY-MM-DD HH:mm:ss'));
  } else if (toDate) {
    conditions.push('gl.entryDate <= ?');
    replacements.push(dayjs(toDate).endOf('day').format('YYYY-MM-DD HH:mm:ss'));
  }

  const whereClause = conditions.join(' AND ');

  // Use raw SQL query for better SQL Server date handling
  const queryResult = await sequelize.query(`
    SELECT 
      gl.id,
      gl.companyId,
      gl.accountId,
      gl.journalEntryId,
      gl.journalEntryLineId,
      gl.entryDate,
      gl.debitAmount,
      gl.creditAmount,
      gl.runningBalance,
      gl.description,
      gl.reference,
      gl.createdAt,
      ca.id as account_id,
      ca.accountCode as account_accountCode,
      ca.accountName as account_accountName,
      ca.accountType as account_accountType,
      je.id as journalEntry_id,
      je.entryNumber as journalEntry_entryNumber,
      je.description as journalEntry_description
    FROM [dbo].[general_ledger] gl
    INNER JOIN [dbo].[chart_of_accounts] ca ON gl.accountId = ca.id
    INNER JOIN [dbo].[journal_entries] je ON gl.journalEntryId = je.id
    WHERE ${whereClause}
    ORDER BY gl.entryDate ASC, gl.id ASC
  `, {
    replacements,
    type: sequelize.QueryTypes.SELECT
  });

  // Handle SQL Server return format
  // sequelize.query with QueryTypes.SELECT returns [results, metadata] where results is an array
  let results;
  if (Array.isArray(queryResult)) {
    // Check if it's [results, metadata] tuple or just results array
    if (queryResult.length === 2 && Array.isArray(queryResult[0])) {
      results = queryResult[0]; // It's [results, metadata]
    } else if (Array.isArray(queryResult[0])) {
      results = queryResult[0]; // First element is the results array
    } else {
      results = queryResult; // The whole thing is the results array
    }
  } else {
    console.error('[Accounting] getGeneralLedger: Query result is not an array:', typeof queryResult);
    results = [];
  }

  // Safety check
  if (!Array.isArray(results)) {
    console.error('[Accounting] getGeneralLedger: Results is not an array:', typeof results, results);
    return [];
  }

  return results.map(row => ({
    id: row.id,
    companyId: row.companyId,
    accountId: row.accountId,
    journalEntryId: row.journalEntryId,
    journalEntryLineId: row.journalEntryLineId,
    entryDate: row.entryDate,
    debitAmount: row.debitAmount,
    creditAmount: row.creditAmount,
    runningBalance: row.runningBalance,
    description: row.description,
    reference: row.reference,
    createdAt: row.createdAt,
    account: {
      id: row.account_id,
      accountCode: row.account_accountCode,
      accountName: row.account_accountName,
      accountType: row.account_accountType
    },
    journalEntry: {
      id: row.journalEntry_id,
      entryNumber: row.journalEntry_entryNumber,
      description: row.journalEntry_description
    }
  }));
}

/**
 * Get trial balance
 */
async function getTrialBalance({ fromDate, toDate, companyId = 1 } = {}) {
  const accounts = await getChartOfAccounts({ companyId, includeInactive: false });

  const trialBalance = [];

  for (const account of accounts) {
    // Get opening balance
    let openingBalance = normalizeNumber(account.openingBalance);
    let openingDebit = 0;
    let openingCredit = 0;

    if (account.accountType === 'Asset' || account.accountType === 'Expense') {
      if (openingBalance >= 0) {
        openingDebit = openingBalance;
      } else {
        openingCredit = Math.abs(openingBalance);
      }
    } else {
      if (openingBalance >= 0) {
        openingCredit = openingBalance;
      } else {
        openingDebit = Math.abs(openingBalance);
      }
    }

    // Get period transactions
    const where = { accountId: account.id, companyId };
    if (fromDate) {
      where.entryDate = {
        ...where.entryDate,
        [Op.gte]: dayjs(fromDate).startOf('day').format('YYYY-MM-DD HH:mm:ss')
      };
    }
    if (toDate) {
      where.entryDate = {
        ...where.entryDate,
        [Op.lte]: dayjs(toDate).endOf('day').format('YYYY-MM-DD HH:mm:ss')
      };
    }

    const [result] = await sequelize.query(`
      SELECT 
        SUM(debitAmount) as totalDebits,
        SUM(creditAmount) as totalCredits
      FROM general_ledger
      WHERE accountId = ? AND companyId = ?
        ${fromDate ? `AND entryDate >= '${dayjs(fromDate).format('YYYY-MM-DD HH:mm:ss')}'` : ''}
        ${toDate ? `AND entryDate <= '${dayjs(toDate).format('YYYY-MM-DD HH:mm:ss')}'` : ''}
    `, {
      replacements: [account.id, companyId],
      type: sequelize.QueryTypes.SELECT
    });

    const periodDebits = normalizeNumber(result?.totalDebits || 0);
    const periodCredits = normalizeNumber(result?.totalCredits || 0);

    const totalDebits = roundAmount(openingDebit + periodDebits);
    const totalCredits = roundAmount(openingCredit + periodCredits);

    let endingBalance = 0;
    if (account.accountType === 'Asset' || account.accountType === 'Expense') {
      endingBalance = totalDebits - totalCredits;
    } else {
      endingBalance = totalCredits - totalDebits;
    }

    trialBalance.push({
      accountId: account.id,
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      openingDebit: roundAmount(openingDebit),
      openingCredit: roundAmount(openingCredit),
      periodDebits: roundAmount(periodDebits),
      periodCredits: roundAmount(periodCredits),
      endingDebit: endingBalance >= 0 && (account.accountType === 'Asset' || account.accountType === 'Expense') ? roundAmount(endingBalance) : 0,
      endingCredit: endingBalance >= 0 && (account.accountType !== 'Asset' && account.accountType !== 'Expense') ? roundAmount(endingBalance) : 0,
      endingBalance: roundAmount(endingBalance)
    });
  }

  return trialBalance;
}

/**
 * Get Profit & Loss Statement
 */
async function getProfitAndLoss({ fromDate, toDate, companyId = 1 } = {}) {
  const startDate = fromDate ? dayjs(fromDate).startOf('day') : dayjs().startOf('year');
  const endDate = toDate ? dayjs(toDate).endOf('day') : dayjs().endOf('day');

  // Get revenue accounts
  const revenueAccounts = await ChartOfAccount.findAll({
    where: {
      companyId,
      accountType: 'Revenue',
      isActive: true
    }
  });

  // Get expense accounts
  const expenseAccounts = await ChartOfAccount.findAll({
    where: {
      companyId,
      accountType: 'Expense',
      isActive: true
    }
  });

  const revenues = [];
  let totalRevenue = 0;

  for (const account of revenueAccounts) {
    const [result] = await sequelize.query(`
      SELECT 
        SUM(creditAmount) - SUM(debitAmount) as netAmount
      FROM general_ledger
      WHERE accountId = ? 
        AND companyId = ?
        AND entryDate >= ?
        AND entryDate <= ?
    `, {
      replacements: [
        account.id,
        companyId,
        startDate.format('YYYY-MM-DD HH:mm:ss'),
        endDate.format('YYYY-MM-DD HH:mm:ss')
      ],
      type: sequelize.QueryTypes.SELECT
    });

    const amount = roundAmount(result?.netAmount || 0);
    if (amount !== 0) {
      revenues.push({
        accountCode: account.accountCode,
        accountName: account.accountName,
        amount
      });
      totalRevenue += amount;
    }
  }

  const expenses = [];
  let totalExpenses = 0;

  for (const account of expenseAccounts) {
    const [result] = await sequelize.query(`
      SELECT 
        SUM(debitAmount) - SUM(creditAmount) as netAmount
      FROM general_ledger
      WHERE accountId = ? 
        AND companyId = ?
        AND entryDate >= ?
        AND entryDate <= ?
    `, {
      replacements: [
        account.id,
        companyId,
        startDate.format('YYYY-MM-DD HH:mm:ss'),
        endDate.format('YYYY-MM-DD HH:mm:ss')
      ],
      type: sequelize.QueryTypes.SELECT
    });

    const amount = roundAmount(result?.netAmount || 0);
    if (amount !== 0) {
      expenses.push({
        accountCode: account.accountCode,
        accountName: account.accountName,
        amount
      });
      totalExpenses += amount;
    }
  }

  const netIncome = roundAmount(totalRevenue - totalExpenses);

  return {
    period: {
      from: startDate.format('YYYY-MM-DD'),
      to: endDate.format('YYYY-MM-DD')
    },
    revenues: {
      items: revenues,
      total: roundAmount(totalRevenue)
    },
    expenses: {
      items: expenses,
      total: roundAmount(totalExpenses)
    },
    netIncome: roundAmount(netIncome)
  };
}

/**
 * Get Balance Sheet
 */
async function getBalanceSheet({ asOfDate, companyId = 1 } = {}) {
  const date = asOfDate ? dayjs(asOfDate).endOf('day') : dayjs().endOf('day');

  // Get all accounts with balances
  const accounts = await ChartOfAccount.findAll({
    where: {
      companyId,
      isActive: true
    }
  });

  const assets = [];
  const liabilities = [];
  const equity = [];
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  for (const account of accounts) {
    // Get opening balance
    let balance = normalizeNumber(account.openingBalance);

    // Get transactions up to date
    const [result] = await sequelize.query(`
      SELECT 
        SUM(CASE WHEN ? IN ('Asset', 'Expense') THEN debitAmount - creditAmount ELSE creditAmount - debitAmount END) as netChange
      FROM general_ledger
      WHERE accountId = ? 
        AND companyId = ?
        AND entryDate <= ?
    `, {
      replacements: [
        account.accountType,
        account.id,
        companyId,
        date.format('YYYY-MM-DD HH:mm:ss')
      ],
      type: sequelize.QueryTypes.SELECT
    });

    balance += normalizeNumber(result?.netChange || 0);
    balance = roundAmount(balance);

    if (balance === 0) continue;

    const accountData = {
      accountCode: account.accountCode,
      accountName: account.accountName,
      balance
    };

    if (account.accountType === 'Asset') {
      assets.push(accountData);
      totalAssets += balance;
    } else if (account.accountType === 'Liability') {
      liabilities.push(accountData);
      totalLiabilities += balance;
    } else if (account.accountType === 'Equity') {
      equity.push(accountData);
      totalEquity += balance;
    }
  }

  // Calculate retained earnings (if not explicitly tracked)
  const netIncome = await getProfitAndLoss({
    fromDate: dayjs().startOf('year').format('YYYY-MM-DD'),
    toDate: date.format('YYYY-MM-DD'),
    companyId
  });

  return {
    asOfDate: date.format('YYYY-MM-DD'),
    assets: {
      items: assets,
      total: roundAmount(totalAssets)
    },
    liabilities: {
      items: liabilities,
      total: roundAmount(totalLiabilities)
    },
    equity: {
      items: equity,
      total: roundAmount(totalEquity),
      retainedEarnings: netIncome.netIncome
    },
    totalLiabilitiesAndEquity: roundAmount(totalLiabilities + totalEquity + netIncome.netIncome),
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity + netIncome.netIncome)) < 0.01
  };
}

/**
 * Auto-create journal entry from invoice
 * This function handles all accounting automatically - no accounting knowledge required!
 */
async function createJournalEntryFromInvoice(invoice, companyId = 1) {
  console.log('[Accounting] Creating journal entry from invoice:', invoice.invoiceNumber || invoice.id);
  console.log('[Accounting] Invoice data:', {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    totalWithVAT: invoice.totalWithVAT,
    total: invoice.total,
    vatAmount: invoice.vatAmount,
    issueDate: invoice.issueDate
  });

  // Check if journal entry already exists for this invoice
  // Convert invoice.id to number to ensure type matching
  const invoiceId = typeof invoice.id === 'string' ? parseInt(invoice.id, 10) : invoice.id;
  
  const existingEntry = await JournalEntry.findOne({
    where: {
      companyId,
      referenceType: 'invoice',
      referenceId: invoiceId
    }
  });

  if (existingEntry) {
    console.log('[Accounting] ⚠️  Journal entry already exists for invoice:', invoice.invoiceNumber, 'Entry:', existingEntry.entryNumber);
    return existingEntry.get({ plain: true });
  }
  
  console.log('[Accounting] No existing journal entry found, creating new one for invoice ID:', invoiceId);

  const lines = [];

  // Debit: Accounts Receivable (money customer owes you)
  const arAccount = await ChartOfAccount.findOne({
    where: { accountCode: '1120', companyId }
  });

  if (!arAccount) {
    console.error('[Accounting] Accounts Receivable account (1120) not found. Please run the accounting migration script.');
    throw new Error('Accounts Receivable account (1120) not found in chart of accounts. Please contact support.');
  }

  const totalAmount = normalizeNumber(invoice.totalWithVAT || invoice.total || 0);
  const vatAmount = normalizeNumber(invoice.vatAmount || 0);
  const taxableAmount = totalAmount - vatAmount;

  console.log('[Accounting] Calculated amounts:', { totalAmount, vatAmount, taxableAmount });

  // Credit: Sales Revenue (money you earned)
  const salesAccount = await ChartOfAccount.findOne({
    where: { accountCode: '4100', companyId }
  });

  if (!salesAccount) {
    console.error('[Accounting] Sales Revenue account (4100) not found. Please run the accounting migration script.');
    throw new Error('Sales Revenue account (4100) not found in chart of accounts. Please contact support.');
  }

  // Credit: VAT Payable (VAT you collected - must pay to government)
  let vatAccount = null;
  if (vatAmount > 0) {
    vatAccount = await ChartOfAccount.findOne({
      where: { accountCode: '2120', companyId }
    });

    if (!vatAccount) {
      console.error('[Accounting] VAT Payable account (2120) not found. Please run the accounting migration script.');
      throw new Error('VAT Payable account (2120) not found in chart of accounts. Please contact support.');
    }
  }

  // Line 1: Debit Accounts Receivable
  lines.push({
    accountId: arAccount.id,
    debitAmount: totalAmount,
    creditAmount: 0,
    description: `Invoice ${invoice.invoiceNumber}`
  });

  // Line 2: Credit Sales Revenue
  lines.push({
    accountId: salesAccount.id,
    debitAmount: 0,
    creditAmount: taxableAmount,
    description: `Sales from invoice ${invoice.invoiceNumber}`
  });

  // Line 3: Credit VAT Payable (if applicable)
  if (vatAccount && vatAmount > 0) {
    lines.push({
      accountId: vatAccount.id,
      debitAmount: 0,
      creditAmount: vatAmount,
      description: `VAT from invoice ${invoice.invoiceNumber}`
    });
  }

  const entry = await createJournalEntry({
    entryDate: invoice.issueDate || new Date(),
    description: `Invoice ${invoice.invoiceNumber} - ${invoice.customerName}`,
    reference: invoice.invoiceNumber,
    referenceType: 'invoice',
    referenceId: invoiceId, // Use the normalized invoice ID
    lines,
    createdBy: 'system',
    companyId
  });
  
  console.log('[Accounting] ✓ Journal entry created successfully:', entry.entryNumber || entry.id);

  return entry;
}

/**
 * Auto-create journal entry from inventory sale (cash sale)
 * This function handles all accounting automatically for sales
 */
async function createJournalEntryFromSale(sale, companyId = 1) {
  if (!sale || !sale.id) {
    throw new Error('Invalid sale data: sale object or sale.id is missing');
  }

  console.log('[Accounting] Creating journal entry from sale:', sale.id);
  console.log('[Accounting] Sale data:', {
    id: sale.id,
    totalSales: sale.totalSales,
    totalVAT: sale.totalVAT,
    date: sale.date,
    summary: sale.summary
  });

  // Check if journal entry already exists for this sale
  const saleId = typeof sale.id === 'string' ? parseInt(sale.id, 10) : sale.id;
  
  if (isNaN(saleId)) {
    throw new Error(`Invalid sale ID: ${sale.id} (could not convert to number)`);
  }
  
  const existingEntry = await JournalEntry.findOne({
    where: {
      companyId,
      referenceType: 'sale',
      referenceId: saleId
    }
  });

  if (existingEntry) {
    console.log('[Accounting] ⚠️  Journal entry already exists for sale:', saleId, 'Entry:', existingEntry.entryNumber);
    return existingEntry.get({ plain: true });
  }
  
  console.log('[Accounting] No existing journal entry found, creating new one for sale ID:', saleId);

  const lines = [];

  // Debit: Cash and Bank (money received - cash sale)
  const cashAccount = await ChartOfAccount.findOne({
    where: { accountCode: '1110', companyId } // Cash and Bank
  });

  if (!cashAccount) {
    console.error('[Accounting] Cash and Bank account (1110) not found. Please run the accounting migration script.');
    throw new Error('Cash and Bank account (1110) not found in chart of accounts. Please contact support.');
  }

  const totalAmount = normalizeNumber(sale.totalSales || 0);
  const vatAmount = normalizeNumber(sale.totalVAT || 0);
  const taxableAmount = roundAmount(totalAmount - vatAmount);

  console.log('[Accounting] Calculated amounts:', { totalAmount, vatAmount, taxableAmount });

  if (totalAmount <= 0) {
    console.warn('[Accounting] ⚠️ Sale total amount is 0 or negative, skipping journal entry creation');
    return null;
  }

  // Credit: Sales Revenue (money you earned)
  const salesAccount = await ChartOfAccount.findOne({
    where: { accountCode: '4100', companyId }
  });

  if (!salesAccount) {
    console.error('[Accounting] Sales Revenue account (4100) not found. Please run the accounting migration script.');
    throw new Error('Sales Revenue account (4100) not found in chart of accounts. Please contact support.');
  }

  // Credit: VAT Payable (VAT you collected - must pay to government)
  let vatAccount = null;
  if (vatAmount > 0) {
    vatAccount = await ChartOfAccount.findOne({
      where: { accountCode: '2120', companyId }
    });

    if (!vatAccount) {
      console.error('[Accounting] VAT Payable account (2120) not found. Please run the accounting migration script.');
      throw new Error('VAT Payable account (2120) not found in chart of accounts. Please contact support.');
    }
  }

  // Line 1: Debit Cash and Bank
  lines.push({
    accountId: cashAccount.id,
    debitAmount: totalAmount,
    creditAmount: 0,
    description: `Sale ${sale.id}${sale.summary ? ' - ' + sale.summary : ''}`
  });

  // Line 2: Credit Sales Revenue
  lines.push({
    accountId: salesAccount.id,
    debitAmount: 0,
    creditAmount: taxableAmount,
    description: `Sales from sale ${sale.id}`
  });

  // Line 3: Credit VAT Payable (if applicable)
  if (vatAccount && vatAmount > 0) {
    lines.push({
      accountId: vatAccount.id,
      debitAmount: 0,
      creditAmount: vatAmount,
      description: `VAT from sale ${sale.id}`
    });
  }

  const entry = await createJournalEntry({
    entryDate: sale.date || new Date(),
    description: `Sale ${sale.id}${sale.summary ? ' - ' + sale.summary : ''}`,
    reference: `SALE-${saleId}`,
    referenceType: 'sale',
    referenceId: saleId,
    lines,
    createdBy: 'system',
    companyId
  });
  
  console.log('[Accounting] ✓ Journal entry created successfully for sale:', entry.entryNumber || entry.id);

  return entry;
}

/**
 * Auto-create journal entry from expense
 * This function handles all accounting automatically - no accounting knowledge required!
 */
async function createJournalEntryFromExpense(expense, companyId = 1) {
  if (!expense || !expense.id) {
    throw new Error('Invalid expense data: expense object or expense.id is missing');
  }

  console.log('[Accounting] Creating journal entry from expense:', expense.id);
  console.log('[Accounting] Expense data:', {
    id: expense.id,
    amount: expense.amount,
    vatAmount: expense.vatAmount,
    totalAmount: expense.totalAmount,
    date: expense.date,
    category: expense.category
  });

  // Check if journal entry already exists for this expense
  const expenseId = typeof expense.id === 'string' ? parseInt(expense.id, 10) : expense.id;
  
  if (isNaN(expenseId)) {
    throw new Error(`Invalid expense ID: ${expense.id} (could not convert to number)`);
  }

  const existingEntry = await JournalEntry.findOne({
    where: {
      companyId,
      referenceType: 'expense',
      referenceId: expenseId
    }
  });

  if (existingEntry) {
    console.log('[Accounting] ⚠️  Journal entry already exists for expense:', expenseId, 'Entry:', existingEntry.entryNumber);
    return existingEntry.get({ plain: true });
  }

  console.log('[Accounting] No existing journal entry found, creating new one for expense ID:', expenseId);

  const lines = [];

  // Debit: Operating Expenses (money you spent)
  const expenseAccount = await ChartOfAccount.findOne({
    where: { accountCode: '5200', companyId } // Operating Expenses default
  });

  if (!expenseAccount) {
    console.error('[Accounting] Operating Expenses account (5200) not found. Please run the accounting migration script.');
    throw new Error('Operating Expenses account (5200) not found in chart of accounts. Please contact support.');
  }

  // Credit: Accounts Payable (money you owe)
  const apAccount = await ChartOfAccount.findOne({
    where: { accountCode: '2110', companyId }
  });

  if (!apAccount) {
    console.error('[Accounting] Accounts Payable account (2110) not found. Please run the accounting migration script.');
    throw new Error('Accounts Payable account (2110) not found in chart of accounts. Please contact support.');
  }

  const amount = normalizeNumber(expense.amount || 0);
  const vatAmount = normalizeNumber(expense.vatAmount || 0);
  const totalAmount = roundAmount(amount + vatAmount);

  console.log('[Accounting] Calculated amounts:', { amount, vatAmount, totalAmount });

  if (totalAmount <= 0) {
    console.warn('[Accounting] ⚠️ Expense total amount is 0 or negative, skipping journal entry creation');
    return null;
  }

  // Line 1: Debit Operating Expenses (full amount including VAT)
  // Note: For expenses with VAT, we typically include VAT in the expense amount
  // Alternatively, you could debit a VAT Input account separately, but including it in expense is simpler
  lines.push({
    accountId: expenseAccount.id,
    debitAmount: totalAmount,  // Total amount including VAT (expense includes VAT paid)
    creditAmount: 0,
    description: `${expense.category} - ${expense.description || expense.category || ''}`
  });

  // Line 2: Credit Accounts Payable (total amount owed - must equal debit)
  lines.push({
    accountId: apAccount.id,
    debitAmount: 0,
    creditAmount: totalAmount,  // Total amount including VAT (must match debit)
    description: `Expense ${expense.category}`
  });

  const entry = await createJournalEntry({
    entryDate: expense.date || new Date(),
    description: `Expense: ${expense.category} - ${expense.description || ''}`,
    reference: `EXP-${expenseId}`,
    referenceType: 'expense',
    referenceId: expenseId,  // Use normalized expenseId
    lines,
    createdBy: 'system',
    companyId
  });
  
  console.log('[Accounting] ✓ Journal entry created successfully for expense:', entry.entryNumber || entry.id);

  return entry;
}

/**
 * Auto-create journal entry from inventory purchase/adjustment
 * This handles inventory value changes in accounting
 */
async function createJournalEntryFromInventory(inventoryItem, oldStock, newStock, companyId = 1) {
  console.log('[Accounting] Creating journal entry from inventory:', inventoryItem.name || inventoryItem.id);
  console.log('[Accounting] Inventory data:', {
    id: inventoryItem.id,
    name: inventoryItem.name,
    costPrice: inventoryItem.costPrice,
    oldStock: oldStock,
    newStock: newStock
  });

  // Check if journal entry already exists for this inventory transaction
  // We'll use a combination of inventory ID and date to avoid duplicates
  const inventoryId = typeof inventoryItem.id === 'string' ? parseInt(inventoryItem.id, 10) : inventoryItem.id;
  
  // Calculate stock change
  const stockChange = (newStock || 0) - (oldStock || 0);
  const costPrice = normalizeNumber(inventoryItem.costPrice || 0);
  const totalValue = Math.abs(stockChange) * costPrice;

  // Only create journal entry if there's a meaningful change
  if (stockChange === 0 || totalValue === 0) {
    console.log('[Accounting] No stock change or zero value - skipping journal entry');
    return null;
  }

  const lines = [];

  // Get Inventory Asset account
  const inventoryAccount = await ChartOfAccount.findOne({
    where: { accountCode: '1130', companyId } // Inventory Asset
  });

  if (!inventoryAccount) {
    console.error('[Accounting] Inventory Asset account (1130) not found. Please run the accounting migration script.');
    throw new Error('Inventory Asset account (1130) not found in chart of accounts. Please contact support.');
  }

  // Get Accounts Payable account (for purchases) or Cash account (for cash purchases)
  const apAccount = await ChartOfAccount.findOne({
    where: { accountCode: '2110', companyId } // Accounts Payable
  });

  if (!apAccount) {
    console.error('[Accounting] Accounts Payable account (2110) not found. Please run the accounting migration script.');
    throw new Error('Accounts Payable account (2110) not found in chart of accounts. Please contact support.');
  }

  if (stockChange > 0) {
    // Stock increase (purchase/adjustment)
    // Debit: Inventory Asset (increase)
    lines.push({
      accountId: inventoryAccount.id,
      debitAmount: totalValue,
      creditAmount: 0,
      description: `Inventory purchase: ${inventoryItem.name} (+${stockChange} units)`
    });

    // Credit: Accounts Payable (money owed) or Cash (if paid immediately)
    lines.push({
      accountId: apAccount.id,
      debitAmount: 0,
      creditAmount: totalValue,
      description: `Purchase of ${inventoryItem.name}`
    });
  } else {
    // Stock decrease (sale/adjustment/write-off)
    // Credit: Inventory Asset (decrease)
    lines.push({
      accountId: inventoryAccount.id,
      debitAmount: 0,
      creditAmount: Math.abs(totalValue),
      description: `Inventory decrease: ${inventoryItem.name} (${stockChange} units)`
    });

    // Debit: Cost of Goods Sold (if sold) or Expense (if written off)
    const cogsAccount = await ChartOfAccount.findOne({
      where: { accountCode: '5100', companyId } // Cost of Goods Sold
    });

    if (cogsAccount) {
      lines.push({
        accountId: cogsAccount.id,
        debitAmount: Math.abs(totalValue),
        creditAmount: 0,
        description: `COGS: ${inventoryItem.name}`
      });
    } else {
      // Fallback to Operating Expenses if COGS account doesn't exist
      const expenseAccount = await ChartOfAccount.findOne({
        where: { accountCode: '5200', companyId } // Operating Expenses
      });
      if (expenseAccount) {
        lines.push({
          accountId: expenseAccount.id,
          debitAmount: Math.abs(totalValue),
          creditAmount: 0,
          description: `Inventory write-off: ${inventoryItem.name}`
        });
      }
    }
  }

  const entry = await createJournalEntry({
    entryDate: new Date(),
    description: `Inventory ${stockChange > 0 ? 'Purchase' : 'Adjustment'}: ${inventoryItem.name}`,
    reference: `INV-${inventoryId}`,
    referenceType: 'inventory',
    referenceId: inventoryId,
    lines,
    createdBy: 'system',
    companyId
  });

  console.log('[Accounting] ✓ Journal entry created for inventory:', entry.entryNumber || entry.id);
  return entry;
}

/**
 * Recalculate all account balances from General Ledger
 * This ensures balances are accurate by recalculating from scratch
 */
async function recalculateAccountBalances({ companyId = 1, accountId = null } = {}) {
  const transaction = await sequelize.transaction();

  try {
    console.log('[Accounting] Starting balance recalculation for company:', companyId, accountId ? `(Account: ${accountId})` : '');
    
    // Get all active accounts (or specific account if provided)
    const whereClause = { companyId, isActive: true };
    if (accountId) {
      whereClause.id = accountId;
    }
    
    const accounts = await ChartOfAccount.findAll({
      where: whereClause,
      transaction
    });

    const results = {
      totalAccounts: accounts.length,
      updatedAccounts: 0,
      discrepancies: [],
      errors: []
    };

    for (const account of accounts) {
      try {
        // Get all general ledger entries for this account, ordered by date
        const ledgerEntries = await GeneralLedger.findAll({
          where: { accountId: account.id },
          order: [['entryDate', 'ASC'], ['id', 'ASC']],
          transaction
        });

        // Start with opening balance
        let calculatedBalance = normalizeNumber(account.openingBalance);

        // Recalculate balance from all ledger entries and update each entry's running balance
        for (const entry of ledgerEntries) {
          const debitAmount = normalizeNumber(entry.debitAmount);
          const creditAmount = normalizeNumber(entry.creditAmount);

          // Update balance based on account type
          if (account.accountType === 'Asset' || account.accountType === 'Expense') {
            // Assets and Expenses: Debit increases, Credit decreases
            calculatedBalance = calculatedBalance + debitAmount - creditAmount;
          } else {
            // Liabilities, Equity, Revenue: Credit increases, Debit decreases
            calculatedBalance = calculatedBalance + creditAmount - debitAmount;
          }

          // Round the calculated balance
          const roundedBalance = roundAmount(calculatedBalance);

          // Update the running balance in the General Ledger entry if it's different
          const storedBalance = normalizeNumber(entry.runningBalance);
          if (Math.abs(roundedBalance - storedBalance) > 0.01) {
            const formattedUpdatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
            await sequelize.query(`
              UPDATE [dbo].[general_ledger]
              SET [runningBalance] = ?
              WHERE [id] = ?
            `, {
              replacements: [roundedBalance, entry.id],
              transaction,
              type: sequelize.QueryTypes.UPDATE
            });
          }
        }

        // Round the final calculated balance
        calculatedBalance = roundAmount(calculatedBalance);
        const currentBalance = normalizeNumber(account.currentBalance);

        // Check for discrepancies
        if (Math.abs(calculatedBalance - currentBalance) > 0.01) {
          results.discrepancies.push({
            accountId: account.id,
            accountCode: account.accountCode,
            accountName: account.accountName,
            currentBalance,
            calculatedBalance,
            difference: roundAmount(calculatedBalance - currentBalance)
          });
        }

        // Update the account balance in Chart of Accounts
        const formattedUpdatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
        await sequelize.query(`
          UPDATE [dbo].[chart_of_accounts]
          SET [currentBalance] = ?,
              [updatedAt] = ?
          WHERE [id] = ?
        `, {
          replacements: [calculatedBalance, formattedUpdatedAt, account.id],
          transaction,
          type: sequelize.QueryTypes.UPDATE
        });

        results.updatedAccounts++;
      } catch (error) {
        console.error(`[Accounting] Error recalculating balance for account ${account.accountCode}:`, error.message);
        results.errors.push({
          accountId: account.id,
          accountCode: account.accountCode,
          accountName: account.accountName,
          error: error.message
        });
      }
    }

    await transaction.commit();
    console.log(`[Accounting] ✓ Balance recalculation completed. Updated ${results.updatedAccounts} accounts.`);
    console.log(`[Accounting] Found ${results.discrepancies.length} discrepancies.`);
    
    return results;
  } catch (error) {
    await transaction.rollback();
    console.error('[Accounting] Error during balance recalculation:', error);
    throw error;
  }
}

module.exports = {
  createJournalEntry,
  postJournalEntry,
  validateJournalEntry,
  getChartOfAccounts,
  saveChartOfAccount,
  getGeneralLedger,
  getTrialBalance,
  getProfitAndLoss,
  recalculateAccountBalances,
  getBalanceSheet,
  createJournalEntryFromInvoice,
  createJournalEntryFromExpense,
  createJournalEntryFromInventory,
  createJournalEntryFromSale,
  generateEntryNumber,
  recalculateAccountBalances
};

