const kycService = require('../services/kycService');
const amlService = require('../services/amlService');
const { sequelize } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
    }
  }
});

/**
 * Create a new client
 */
async function createClient(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const createdBy = req.user?.email || req.user?.uid || 'unknown';

    console.log('[KYC Controller] Creating client with data:', {
      body: req.body,
      companyId,
      createdBy
    });

    const client = await kycService.createClient(req.body, companyId, createdBy);
    res.status(201).json(client);
  } catch (error) {
    console.error('[KYC] Create client error:', error);
    console.error('[KYC] Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to create client', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Get all clients
 */
async function getClients(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { kycStatus, amlStatus, riskCategory } = req.query;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const clients = await kycService.getClients({
      companyId,
      kycStatus: kycStatus || null,
      amlStatus: amlStatus || null,
      riskCategory: riskCategory || null
    });

    res.json(clients);
  } catch (error) {
    console.error('[KYC] Get clients error:', error);
    res.status(500).json({ message: 'Failed to fetch clients', error: error.message });
  }
}

/**
 * Get client by ID
 */
async function getClient(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { id } = req.params;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const client = await kycService.getClient(parseInt(id), companyId);
    res.json(client);
  } catch (error) {
    console.error('[KYC] Get client error:', error);
    res.status(500).json({ message: 'Failed to fetch client', error: error.message });
  }
}

/**
 * Upload document
 */
const uploadDocument = [
  upload.single('file'),
  async (req, res) => {
    try {
      await sequelize.authenticate();
    } catch (dbError) {
      return res.status(503).json({ message: 'Database connection unavailable' });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { id } = req.params;
      const companyId = req.companyId || 1; // ✅ Get from tenant context
      const uploadedBy = req.user?.email || req.user?.uid || 'unknown';

      const documentData = {
        documentType: req.body.documentType || 'other',
        documentName: req.body.documentName || req.file.originalname,
        documentNumber: req.body.documentNumber || null,
        issueDate: req.body.issueDate || null,
        expiryDate: req.body.expiryDate || null,
        issuingAuthority: req.body.issuingAuthority || null,
        issuingCountry: req.body.issuingCountry || null
      };

      const fileInfo = {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer
      };

      const document = await kycService.uploadDocument(
        parseInt(id),
        documentData,
        fileInfo,
        companyId,
        uploadedBy
      );

      res.status(201).json(document);
    } catch (error) {
      console.error('[KYC] Upload document error:', error);
      res.status(500).json({ message: 'Failed to upload document', error: error.message });
    }
  }
];

/**
 * Verify document
 */
async function verifyDocument(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { id } = req.params;
    const { verificationNotes } = req.body;
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const verifiedBy = req.user?.email || req.user?.uid || 'unknown';

    const document = await kycService.verifyDocument(
      parseInt(id),
      verifiedBy,
      verificationNotes,
      companyId
    );

    res.json(document);
  } catch (error) {
    console.error('[KYC] Verify document error:', error);
    res.status(500).json({ message: 'Failed to verify document', error: error.message });
  }
}

/**
 * Update KYC status
 */
async function updateKycStatus(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const updatedBy = req.user?.email || req.user?.uid || 'unknown';

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const client = await kycService.updateKycStatus(
      parseInt(id),
      status,
      updatedBy,
      notes,
      companyId
    );

    res.json(client);
  } catch (error) {
    console.error('[KYC] Update KYC status error:', error);
    res.status(500).json({ message: 'Failed to update KYC status', error: error.message });
  }
}

/**
 * Perform AML screening
 */
async function performAmlScreening(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { id } = req.params;
    const { screeningType } = req.body;
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const screenedBy = req.user?.email || req.user?.uid || 'unknown';

    const screening = await amlService.performAmlScreening(
      parseInt(id),
      screeningType || 'sanctions',
      companyId,
      screenedBy
    );

    res.status(201).json(screening);
  } catch (error) {
    console.error('[KYC] Perform AML screening error:', error);
    res.status(500).json({ message: 'Failed to perform AML screening', error: error.message });
  }
}

/**
 * Get AML screenings for a client
 */
async function getClientScreenings(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { id } = req.params;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const screenings = await amlService.getClientScreenings(parseInt(id), companyId);
    res.json(screenings);
  } catch (error) {
    console.error('[KYC] Get client screenings error:', error);
    res.status(500).json({ message: 'Failed to fetch AML screenings', error: error.message });
  }
}

/**
 * Update AML screening decision
 */
async function updateScreeningDecision(req, res) {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { id } = req.params;
    const { decision, decisionNotes } = req.body;
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const decidedBy = req.user?.email || req.user?.uid || 'unknown';

    if (!decision) {
      return res.status(400).json({ message: 'Decision is required' });
    }

    const screening = await amlService.updateScreeningDecision(
      parseInt(id),
      decision,
      decidedBy,
      decisionNotes,
      companyId
    );

    res.json(screening);
  } catch (error) {
    console.error('[KYC] Update screening decision error:', error);
    res.status(500).json({ message: 'Failed to update screening decision', error: error.message });
  }
}

/**
 * Download document
 */
async function downloadDocument(req, res) {
  try {
    const { id } = req.params;
    const companyId = req.companyId || 1; // ✅ Get from tenant context

    const { KycDocument } = require('../../models/kycAssociations');
    const document = await KycDocument.findByPk(parseInt(id));

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.companyId !== companyId) {
      return res.status(403).json({ message: 'Unauthorized access to document' });
    }

    const filePath = path.join(__dirname, '../../uploads', document.filePath);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ message: 'Document file not found on server' });
    }

    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
    
    const fileContent = await fs.readFile(filePath);
    res.send(fileContent);
  } catch (error) {
    console.error('[KYC] Download document error:', error);
    res.status(500).json({ message: 'Failed to download document', error: error.message });
  }
}

module.exports = {
  createClient,
  getClients,
  getClient,
  uploadDocument,
  verifyDocument,
  updateKycStatus,
  performAmlScreening,
  getClientScreenings,
  updateScreeningDecision,
  downloadDocument
};

