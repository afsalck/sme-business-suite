/**
 * KYC Service
 * Handles client onboarding, document management, and KYC verification
 */

const { sequelize } = require('../config/database');
const dayjs = require('dayjs');
const { Client, KycDocument, KycAuditLog } = require('../../models/kycAssociations');
const fs = require('fs').promises;
const path = require('path');

/**
 * Create a new client for KYC onboarding
 */
async function createClient(clientData, companyId = 1, createdBy = 'system') {
  const transaction = await sequelize.transaction();

  try {
    console.log('[KYC] Creating client:', { 
      clientData: { ...clientData, fullName: clientData.fullName?.substring(0, 50) }, 
      companyId, 
      createdBy 
    });

    // Validate required fields
    if (!clientData.fullName || clientData.fullName.trim() === '') {
      throw new Error('Full name is required');
    }

    // Check if table exists (basic validation)
    try {
      await sequelize.query('SELECT TOP 1 id FROM [dbo].[clients]', { transaction });
    } catch (tableError) {
      console.error('[KYC] Table check failed:', tableError.message);
      throw new Error('KYC clients table not found. Please run the database migration: server/create-kyc-aml-module.sql');
    }

    // Format dates for SQL Server
    const formattedDob = clientData.dateOfBirth ? dayjs(clientData.dateOfBirth).format('YYYY-MM-DD') : null;
    const formattedCompanyRegDate = clientData.companyRegistrationDate ? dayjs(clientData.companyRegistrationDate).format('YYYY-MM-DD') : null;
    const formattedPassportExpiry = clientData.passportExpiry ? dayjs(clientData.passportExpiry).format('YYYY-MM-DD') : null;
    const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const formattedOnboardedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    
    console.log('[KYC] Formatted dates:', { formattedDob, formattedCompanyRegDate, formattedPassportExpiry, formattedNow });

    // Calculate initial risk score
    const riskScore = calculateInitialRiskScore(clientData);

    const clientResult = await sequelize.query(`
      INSERT INTO [dbo].[clients]
        ([companyId], [clientType], [fullName], [email], [phone], [dateOfBirth], [nationality], [companyName], [tradeLicenseNumber], [companyRegistrationDate], [emiratesId], [passportNumber], [passportCountry], [passportExpiry], [trn], [address], [city], [state], [country], [postalCode], [kycStatus], [kycLevel], [riskScore], [riskCategory], [amlStatus], [onboardedBy], [onboardedAt], [createdAt], [updatedAt])
      OUTPUT INSERTED.id, INSERTED.companyId, INSERTED.clientType, INSERTED.fullName, INSERTED.email, INSERTED.phone, INSERTED.dateOfBirth, INSERTED.nationality, INSERTED.companyName, INSERTED.tradeLicenseNumber, INSERTED.companyRegistrationDate, INSERTED.emiratesId, INSERTED.passportNumber, INSERTED.passportCountry, INSERTED.passportExpiry, INSERTED.trn, INSERTED.address, INSERTED.city, INSERTED.state, INSERTED.country, INSERTED.postalCode, INSERTED.kycStatus, INSERTED.kycLevel, INSERTED.riskScore, INSERTED.riskCategory, INSERTED.amlStatus, INSERTED.onboardedBy, INSERTED.onboardedAt, INSERTED.createdAt, INSERTED.updatedAt
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, {
      replacements: [
        companyId,
        clientData.clientType || 'individual',
        clientData.fullName || '',
        clientData.email || null,
        clientData.phone || null,
        formattedDob,
        clientData.nationality || null,
        clientData.companyName || null,
        clientData.tradeLicenseNumber || null,
        formattedCompanyRegDate,
        clientData.emiratesId || null,
        clientData.passportNumber || null,
        clientData.passportCountry || null,
        formattedPassportExpiry,
        clientData.trn || null,
        clientData.address || null,
        clientData.city || null,
        clientData.state || null,
        clientData.country || 'UAE',
        clientData.postalCode || null,
        'pending',
        clientData.kycLevel || 'basic',
        riskScore,
        getRiskCategory(riskScore),
        'pending',
        createdBy,
        formattedOnboardedAt,
        formattedNow,
        formattedNow
      ],
      transaction,
      type: sequelize.QueryTypes.SELECT
    });

    // Sequelize returns [rows, metadata] for SELECT queries
    const rows = Array.isArray(clientResult) ? clientResult[0] : clientResult;
    let insertedClient = null;

    if (Array.isArray(rows) && rows.length > 0) {
      insertedClient = rows[0];
    } else if (rows && typeof rows === 'object' && rows.id) {
      insertedClient = rows;
    }

    if (!insertedClient || !insertedClient.id) {
      console.error('[KYC] Unexpected insert result structure:');
      console.error('[KYC] Full result:', JSON.stringify(clientResult, null, 2));
      console.error('[KYC] Rows:', JSON.stringify(rows, null, 2));
      throw new Error('Failed to create client - invalid result structure');
    }

    const clientId = insertedClient.id;

    // Create audit log
    await createAuditLog({
      clientId,
      companyId,
      action: 'client_created',
      actionType: 'create',
      entityType: 'client',
      description: `Client ${clientData.fullName} created`,
      performedBy: createdBy
    }, transaction);

    await transaction.commit();
    console.log('[KYC] ✓ Client created with ID:', clientId);

    // Reload client
    const client = await Client.findByPk(clientId);
    return client ? client.get({ plain: true }) : insertedClient;
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('[KYC] ✗ Error creating client:', error);
    throw error;
  }
}

/**
 * Calculate initial risk score based on client data
 */
function calculateInitialRiskScore(clientData) {
  let score = 0;

  // High-risk countries (example list - should be configurable)
  const highRiskCountries = ['AF', 'IQ', 'SY', 'YE', 'LY', 'SD'];
  if (clientData.nationality && highRiskCountries.includes(clientData.nationality)) {
    score += 20;
  }

  // Missing identification documents
  if (!clientData.emiratesId && !clientData.passportNumber) {
    score += 15;
  }

  // Company without trade license
  if (clientData.clientType === 'company' && !clientData.tradeLicenseNumber) {
    score += 10;
  }

  // Missing address
  if (!clientData.address) {
    score += 5;
  }

  // PEP status (if known)
  if (clientData.pepStatus && clientData.pepStatus !== 'none') {
    score += 30;
  }

  return Math.min(score, 100); // Cap at 100
}

/**
 * Get risk category from score
 */
function getRiskCategory(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/**
 * Upload KYC document
 */
async function uploadDocument(clientId, documentData, fileInfo, companyId = 1, uploadedBy = 'system') {
  const transaction = await sequelize.transaction();

  try {
    console.log('[KYC] Uploading document for client:', clientId);

    // Verify client exists
    const client = await Client.findByPk(clientId, { transaction });
    if (!client) {
      throw new Error('Client not found');
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../../uploads/kyc-documents');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const fileExt = path.extname(fileInfo.originalname);
    const fileName = `client-${clientId}-${Date.now()}${fileExt}`;
    const filePath = path.join(uploadsDir, fileName);

    // Save file (fileInfo.buffer should contain file data)
    if (fileInfo.buffer) {
      await fs.writeFile(filePath, fileInfo.buffer);
    } else if (fileInfo.path) {
      // If file was already saved via multer
      await fs.copyFile(fileInfo.path, filePath);
    }

    const relativePath = `kyc-documents/${fileName}`;
    const formattedIssueDate = documentData.issueDate ? dayjs(documentData.issueDate).format('YYYY-MM-DD') : null;
    const formattedExpiryDate = documentData.expiryDate ? dayjs(documentData.expiryDate).format('YYYY-MM-DD') : null;
    const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const formattedUploadedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');

    // Insert document record
    const [docResult] = await sequelize.query(`
      INSERT INTO [dbo].[kyc_documents]
        ([clientId], [companyId], [documentType], [documentName], [documentNumber], [issueDate], [expiryDate], [issuingAuthority], [issuingCountry], [filePath], [fileName], [fileSize], [mimeType], [status], [uploadedBy], [uploadedAt], [createdAt], [updatedAt])
      OUTPUT INSERTED.id, INSERTED.clientId, INSERTED.documentType, INSERTED.documentName, INSERTED.documentNumber, INSERTED.issueDate, INSERTED.expiryDate, INSERTED.filePath, INSERTED.fileName, INSERTED.fileSize, INSERTED.mimeType, INSERTED.status, INSERTED.uploadedBy, INSERTED.uploadedAt, INSERTED.createdAt, INSERTED.updatedAt
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    `, {
      replacements: [
        clientId,
        companyId,
        documentData.documentType || 'other',
        documentData.documentName || fileInfo.originalname || 'Document',
        documentData.documentNumber || null,
        formattedIssueDate,
        formattedExpiryDate,
        documentData.issuingAuthority || null,
        documentData.issuingCountry || null,
        relativePath,
        fileInfo.originalname || fileName,
        fileInfo.size || 0,
        fileInfo.mimetype || 'application/octet-stream',
        uploadedBy,
        formattedUploadedAt,
        formattedNow,
        formattedNow
      ],
      transaction,
      type: sequelize.QueryTypes.SELECT
    });

    const docRows = Array.isArray(docResult) ? docResult : [docResult];
    const insertedDoc = docRows[0];

    if (!insertedDoc || !insertedDoc.id) {
      throw new Error('Failed to create document - invalid result structure');
    }

    // Create audit log
    await createAuditLog({
      clientId,
      companyId,
      action: 'document_uploaded',
      actionType: 'create',
      entityType: 'document',
      description: `Document ${documentData.documentName || fileInfo.originalname} uploaded`,
      performedBy: uploadedBy
    }, transaction);

    await transaction.commit();
    console.log('[KYC] ✓ Document uploaded with ID:', insertedDoc.id);

    return insertedDoc;
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('[KYC] ✗ Error uploading document:', error);
    throw error;
  }
}

/**
 * Verify a document
 */
async function verifyDocument(documentId, verifiedBy, verificationNotes = null, companyId = 1) {
  const transaction = await sequelize.transaction();

  try {
    const document = await KycDocument.findByPk(documentId, { transaction });
    if (!document) {
      throw new Error('Document not found');
    }

    if (document.companyId !== companyId) {
      throw new Error('Unauthorized access to document');
    }

    const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');

    await sequelize.query(`
      UPDATE [dbo].[kyc_documents]
      SET [verified] = 1, [verifiedAt] = ?, [verifiedBy] = ?, [verificationNotes] = ?, [status] = 'verified', [updatedAt] = ?
      WHERE [id] = ? AND [companyId] = ?
    `, {
      replacements: [formattedNow, verifiedBy, verificationNotes || null, formattedNow, documentId, companyId],
      transaction
    });

    // Create audit log
    await createAuditLog({
      clientId: document.clientId,
      companyId,
      action: 'document_verified',
      actionType: 'verify',
      entityType: 'document',
      description: `Document ${document.documentName} verified`,
      performedBy: verifiedBy
    }, transaction);

    await transaction.commit();
    console.log('[KYC] ✓ Document verified:', documentId);

    // Reload document
    const updatedDoc = await KycDocument.findByPk(documentId);
    return updatedDoc ? updatedDoc.get({ plain: true }) : document.get({ plain: true });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('[KYC] ✗ Error verifying document:', error);
    throw error;
  }
}

/**
 * Update client KYC status
 */
async function updateKycStatus(clientId, status, updatedBy, notes = null, companyId = 1) {
  const transaction = await sequelize.transaction();

  try {
    const client = await Client.findByPk(clientId, { transaction });
    if (!client) {
      throw new Error('Client not found');
    }

    if (client.companyId !== companyId) {
      throw new Error('Unauthorized access to client');
    }

    const oldStatus = client.kycStatus;
    const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const formattedReviewedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');

    await sequelize.query(`
      UPDATE [dbo].[clients]
      SET [kycStatus] = ?, [lastReviewedAt] = ?, [lastReviewedBy] = ?, [updatedAt] = ?
      WHERE [id] = ? AND [companyId] = ?
    `, {
      replacements: [status, formattedReviewedAt, updatedBy, formattedNow, clientId, companyId],
      transaction
    });

    // Create audit log
    await createAuditLog({
      clientId,
      companyId,
      action: 'kyc_status_changed',
      actionType: 'update',
      entityType: 'client',
      oldValue: oldStatus,
      newValue: status,
      description: notes || `KYC status changed from ${oldStatus} to ${status}`,
      performedBy: updatedBy
    }, transaction);

    await transaction.commit();
    console.log('[KYC] ✓ KYC status updated:', { clientId, oldStatus, status });

    // Reload client
    const updatedClient = await Client.findByPk(clientId);
    return updatedClient ? updatedClient.get({ plain: true }) : client.get({ plain: true });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('[KYC] ✗ Error updating KYC status:', error);
    throw error;
  }
}

/**
 * Get clients with filters
 */
async function getClients({ companyId = 1, kycStatus = null, amlStatus = null, riskCategory = null } = {}) {
  const where = { companyId };
  if (kycStatus) where.kycStatus = kycStatus;
  if (amlStatus) where.amlStatus = amlStatus;
  if (riskCategory) where.riskCategory = riskCategory;

  const clients = await Client.findAll({
    where,
    include: [{
      model: KycDocument,
      as: 'documents'
    }],
    order: [['createdAt', 'DESC']]
  });

  return clients.map(c => c.get({ plain: true }));
}

/**
 * Get client by ID
 */
async function getClient(clientId, companyId = 1) {
  const client = await Client.findByPk(clientId, {
    include: [
      {
        model: KycDocument,
        as: 'documents'
      }
    ]
  });

  if (!client) {
    throw new Error('Client not found');
  }

  if (client.companyId !== companyId) {
    throw new Error('Unauthorized access to client');
  }

  return client.get({ plain: true });
}

/**
 * Create audit log entry
 */
async function createAuditLog(logData, transaction = null) {
  const formattedNow = dayjs().format('YYYY-MM-DD HH:mm:ss');

  await sequelize.query(`
    INSERT INTO [dbo].[kyc_audit_log]
      ([clientId], [companyId], [action], [actionType], [entityType], [oldValue], [newValue], [description], [performedBy], [performedAt])
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, {
    replacements: [
      logData.clientId,
      logData.companyId || 1,
      logData.action,
      logData.actionType,
      logData.entityType || null,
      logData.oldValue || null,
      logData.newValue || null,
      logData.description || null,
      logData.performedBy,
      formattedNow
    ],
    transaction
  });
}

module.exports = {
  createClient,
  uploadDocument,
  verifyDocument,
  updateKycStatus,
  getClients,
  getClient,
  calculateInitialRiskScore,
  getRiskCategory,
  createAuditLog
};

