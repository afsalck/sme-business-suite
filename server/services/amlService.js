/**
 * AML (Anti-Money Laundering) Service
 * Handles sanctions screening, PEP checks, and risk assessment
 */

const { sequelize } = require('../config/database');
const dayjs = require('dayjs');
const { Client, AmlScreening } = require('../../models/kycAssociations');
const { createAuditLog } = require('./kycService');

/**
 * Basic sanctions list (for demo purposes)
 * In production, this would be integrated with a third-party API or database
 */
const SANCTIONS_LIST = [
  // Example entries - in production, use a real sanctions database
  { name: 'John Doe', country: 'US', type: 'sanctions' },
  // Add more entries as needed
];

/**
 * Basic PEP list (for demo purposes)
 * In production, this would be integrated with a PEP database
 */
const PEP_LIST = [
  // Example entries - in production, use a real PEP database
  { name: 'Jane Smith', country: 'UAE', type: 'pep' },
  // Add more entries as needed
];

/**
 * Perform AML screening on a client
 */
async function performAmlScreening(clientId, screeningType = 'sanctions', companyId = 1, screenedBy = 'system') {
  const transaction = await sequelize.transaction();

  try {
    console.log('[AML] Performing screening for client:', clientId);

    const client = await Client.findByPk(clientId, { transaction });
    if (!client) {
      throw new Error('Client not found');
    }

    if (client.companyId !== companyId) {
      throw new Error('Unauthorized access to client');
    }

    // Perform screening based on type
    let matchFound = false;
    let matchScore = 0;
    let matchDetails = null;
    let matchedLists = [];

    if (screeningType === 'sanctions') {
      const result = checkSanctionsList(client);
      matchFound = result.matchFound;
      matchScore = result.matchScore;
      matchDetails = result.matchDetails;
      if (matchFound) {
        matchedLists.push('UN Sanctions List');
      }
    } else if (screeningType === 'pep') {
      const result = checkPepList(client);
      matchFound = result.matchFound;
      matchScore = result.matchScore;
      matchDetails = result.matchDetails;
      if (matchFound) {
        matchedLists.push('PEP Database');
      }
    }

    // Determine decision
    let decision = 'cleared';
    if (matchFound) {
      if (matchScore >= 80) {
        decision = 'blocked';
      } else if (matchScore >= 50) {
        decision = 'flagged';
      } else {
        decision = 'cleared'; // Low confidence match, cleared with review
      }
    }

    const formattedScreeningDate = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');

    // Create screening record
    const [screeningResult] = await sequelize.query(`
      INSERT INTO [dbo].[aml_screenings]
        ([clientId], [companyId], [screeningType], [screeningSource], [screeningDate], [matchFound], [matchScore], [matchDetails], [matchedLists], [decision], [screenedBy], [createdAt], [updatedAt])
      OUTPUT INSERTED.id, INSERTED.clientId, INSERTED.screeningType, INSERTED.matchFound, INSERTED.matchScore, INSERTED.decision, INSERTED.screenedBy, INSERTED.createdAt, INSERTED.updatedAt
      VALUES (?, ?, ?, 'manual', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, {
      replacements: [
        clientId,
        companyId,
        screeningType,
        formattedScreeningDate,
        matchFound ? 1 : 0,
        matchScore || null,
        matchDetails || null,
        matchedLists.length > 0 ? JSON.stringify(matchedLists) : null,
        decision,
        screenedBy,
        formattedNow,
        formattedNow
      ],
      transaction,
      type: sequelize.QueryTypes.SELECT
    });

    const screeningRows = Array.isArray(screeningResult) ? screeningResult : [screeningResult];
    const insertedScreening = screeningRows[0];

    if (!insertedScreening || !insertedScreening.id) {
      throw new Error('Failed to create AML screening - invalid result structure');
    }

    // Update client AML status
    const formattedScreenedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    await sequelize.query(`
      UPDATE [dbo].[clients]
      SET [amlStatus] = ?, [amlScreenedAt] = ?, [amlScreenedBy] = ?, [amlMatchFound] = ?, [amlMatchDetails] = ?, [updatedAt] = ?
      WHERE [id] = ? AND [companyId] = ?
    `, {
      replacements: [
        decision,
        formattedScreenedAt,
        screenedBy,
        matchFound ? 1 : 0,
        matchDetails || null,
        formattedNow,
        clientId,
        companyId
      ],
      transaction
    });

    // Create audit log
    await createAuditLog({
      clientId,
      companyId,
      action: 'aml_screened',
      actionType: 'screen',
      entityType: 'screening',
      description: `AML screening performed (${screeningType}): ${matchFound ? 'Match found' : 'No match'}`,
      performedBy: screenedBy
    }, transaction);

    await transaction.commit();
    console.log('[AML] ✓ Screening completed:', { clientId, screeningType, matchFound, decision });

    return insertedScreening;
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('[AML] ✗ Error performing screening:', error);
    throw error;
  }
}

/**
 * Check client against sanctions list
 */
function checkSanctionsList(client) {
  // Basic name matching (in production, use fuzzy matching and multiple fields)
  const clientName = (client.fullName || '').toLowerCase();
  
  for (const entry of SANCTIONS_LIST) {
    const entryName = entry.name.toLowerCase();
    
    // Simple exact match (in production, use advanced matching algorithms)
    if (clientName === entryName) {
      return {
        matchFound: true,
        matchScore: 95,
        matchDetails: `Exact match found in sanctions list: ${entry.name}`
      };
    }
    
    // Partial match (in production, use Levenshtein distance or similar)
    if (clientName.includes(entryName) || entryName.includes(clientName)) {
      return {
        matchFound: true,
        matchScore: 60,
        matchDetails: `Partial match found in sanctions list: ${entry.name}`
      };
    }
  }

  return {
    matchFound: false,
    matchScore: 0,
    matchDetails: null
  };
}

/**
 * Check client against PEP list
 */
function checkPepList(client) {
  const clientName = (client.fullName || '').toLowerCase();
  
  for (const entry of PEP_LIST) {
    const entryName = entry.name.toLowerCase();
    
    if (clientName === entryName) {
      return {
        matchFound: true,
        matchScore: 90,
        matchDetails: `Match found in PEP database: ${entry.name}`
      };
    }
    
    if (clientName.includes(entryName) || entryName.includes(clientName)) {
      return {
        matchFound: true,
        matchScore: 55,
        matchDetails: `Partial match found in PEP database: ${entry.name}`
      };
    }
  }

  return {
    matchFound: false,
    matchScore: 0,
    matchDetails: null
  };
}

/**
 * Update AML screening decision
 */
async function updateScreeningDecision(screeningId, decision, decidedBy, decisionNotes = null, companyId = 1) {
  const transaction = await sequelize.transaction();

  try {
    const screening = await AmlScreening.findByPk(screeningId, { transaction });
    if (!screening) {
      throw new Error('Screening not found');
    }

    if (screening.companyId !== companyId) {
      throw new Error('Unauthorized access to screening');
    }

    const formattedDecidedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');

    await sequelize.query(`
      UPDATE [dbo].[aml_screenings]
      SET [decision] = ?, [decidedBy] = ?, [decidedAt] = ?, [decisionNotes] = ?, [updatedAt] = ?
      WHERE [id] = ? AND [companyId] = ?
    `, {
      replacements: [decision, decidedBy, formattedDecidedAt, decisionNotes || null, formattedNow, screeningId, companyId],
      transaction
    });

    // Update client AML status if decision changed
    if (screening.decision !== decision) {
      await sequelize.query(`
        UPDATE [dbo].[clients]
        SET [amlStatus] = ?, [updatedAt] = ?
        WHERE [id] = ? AND [companyId] = ?
      `, {
        replacements: [decision, formattedNow, screening.clientId, companyId],
        transaction
      });
    }

    // Create audit log
    await createAuditLog({
      clientId: screening.clientId,
      companyId,
      action: 'aml_decision_updated',
      actionType: 'update',
      entityType: 'screening',
      oldValue: screening.decision,
      newValue: decision,
      description: decisionNotes || `AML decision updated to ${decision}`,
      performedBy: decidedBy
    }, transaction);

    await transaction.commit();
    console.log('[AML] ✓ Screening decision updated:', { screeningId, decision });

    // Reload screening
    const updatedScreening = await AmlScreening.findByPk(screeningId);
    return updatedScreening ? updatedScreening.get({ plain: true }) : screening.get({ plain: true });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('[AML] ✗ Error updating screening decision:', error);
    throw error;
  }
}

/**
 * Get AML screenings for a client
 */
async function getClientScreenings(clientId, companyId = 1) {
  const screenings = await AmlScreening.findAll({
    where: {
      clientId,
      companyId
    },
    order: [['screeningDate', 'DESC']]
  });

  return screenings.map(s => s.get({ plain: true }));
}

module.exports = {
  performAmlScreening,
  updateScreeningDecision,
  getClientScreenings,
  checkSanctionsList,
  checkPepList
};

