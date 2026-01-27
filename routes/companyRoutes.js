const express = require('express');
const router = express.Router();
const { authorizeRole } = require('../server/middleware/authMiddleware');
const { setTenantContext } = require('../server/middleware/tenantMiddleware');
const Company = require('../models/Company');
const { sequelize } = require('../server/config/database');

// Helper to check if user is developer
function isDeveloperEmail(email) {
  if (!email) return false;
  const emailLower = email.toLowerCase();
  const developerDomains = ['@bizease.ae', '@developer.com'];
  if (developerDomains.some(domain => emailLower.endsWith(domain))) {
    return true;
  }
  const developerEmails = ['developer@bizease.ae', 'admin@bizease.ae'];
  if (developerEmails.includes(emailLower)) {
    return true;
  }
  if (process.env.DEVELOPER_EMAILS) {
    const allowedEmails = process.env.DEVELOPER_EMAILS
      .split(',')
      .map(e => e.trim().toLowerCase());
    if (allowedEmails.includes(emailLower)) {
      return true;
    }
  }
  return false;
}

// Log route registration
console.log('[Company Routes] ✓ Routes module loaded');
console.log('[Company Routes] Registered routes:');
console.log('  - GET    /api/company/admin/all');
console.log('  - DELETE /api/company/admin/:companyId');
console.log('  - PUT    /api/company/admin/:companyId');
console.log('  - POST   /api/company/admin/create');
console.log('  - GET    /api/company');
console.log('  - PUT    /api/company');

// Ensure company table exists - create it if it doesn't exist
(async () => {
  try {
    console.log('[Company] Checking if companies table exists...');
    
    // Use raw SQL to check and create table
    await sequelize.query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[companies]') AND type in (N'U'))
      BEGIN
        CREATE TABLE [dbo].[companies] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [companyId] INT NOT NULL UNIQUE DEFAULT 1,
          [name] NVARCHAR(255) NOT NULL DEFAULT 'BizEase UAE',
          [shopName] NVARCHAR(255) NULL,
          [address] NTEXT NULL,
          [trn] NVARCHAR(50) NULL,
          [email] NVARCHAR(255) NULL,
          [phone] NVARCHAR(50) NULL,
          [website] NVARCHAR(255) NULL,
          [logo] NVARCHAR(500) NULL,
          [enabledModules] NTEXT NULL,
          [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
          [updatedAt] DATETIME NOT NULL DEFAULT GETDATE()
        );
        PRINT 'Company table created successfully';
      END
    `);
    
    console.log('[Company] ✓ Company table verified');
    
    // Insert default company if it doesn't exist
    await sequelize.query(`
      IF NOT EXISTS (SELECT * FROM [companies] WHERE [companyId] = 1)
      BEGIN
        INSERT INTO [companies] ([companyId], [name], [shopName], [address], [trn], [email], [phone], [website], [createdAt], [updatedAt])
        VALUES (1, 'BizEase UAE', NULL, 'Dubai, United Arab Emirates', '', 'info@bizease.ae', '+971 4 XXX XXXX', 'www.bizease.ae', GETDATE(), GETDATE());
      END
    `);
    
    console.log('[Company] ✓ Default company verified');
  } catch (error) {
    console.error('[Company] ✗ Failed to verify/create company table:', error.message);
    console.error('[Company] Error details:', error);
  }
})();

/**
 * ADMIN ROUTES - Bypass tenant context to manage all companies
 * These must be defined BEFORE the general routes to ensure proper matching
 */

/**
 * Get all companies (Admin only, or Developers)
 * GET /api/company/admin/all
 */
router.get('/admin/all', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Allow access if user is admin OR developer
    const isDev = isDeveloperEmail(req.user.email);
    if (req.user.role !== 'admin' && !isDev) {
      console.log(`[Company Admin] ❌ Access denied: User ${req.user.email} (role: ${req.user.role}) is not admin or developer`);
      return res.status(403).json({ 
        message: "Forbidden: Admin or Developer access required" 
      });
    }

    console.log(`[Company Admin] Getting all companies... (User: ${req.user.email}, Role: ${req.user.role}, Developer: ${isDev})`);
    
    const companies = await Company.findAll({
      order: [['companyId', 'ASC']],
      attributes: ['id', 'companyId', 'name', 'shopName', 'address', 'trn', 'email', 'phone', 'website', 'enabledModules', 'createdAt', 'updatedAt']
    });

    // Get email domains for each company
    let domains = [];
    try {
      const CompanyEmailDomain = require('../models/CompanyEmailDomain');
      domains = await CompanyEmailDomain.findAll({
        where: { isActive: true },
        attributes: ['companyId', 'emailDomain']
      });
    } catch (domainError) {
      console.warn('[Company Admin] ⚠️ Could not load email domains:', domainError.message);
      // Continue without domains - not critical
      domains = [];
    }

    // Group domains by companyId
    const domainsByCompany = {};
    domains.forEach(d => {
      if (!domainsByCompany[d.companyId]) {
        domainsByCompany[d.companyId] = [];
      }
      domainsByCompany[d.companyId].push(d.emailDomain);
    });

    // Add domains to companies and parse enabledModules
    const companiesWithDomains = companies.map(company => {
      const companyData = company.get({ plain: true });
      companyData.emailDomains = domainsByCompany[companyData.companyId] || [];
      // Parse enabledModules JSON if it exists
      if (companyData.enabledModules) {
        try {
          companyData.enabledModules = typeof companyData.enabledModules === 'string' 
            ? JSON.parse(companyData.enabledModules) 
            : companyData.enabledModules;
        } catch (e) {
          companyData.enabledModules = null;
        }
      } else {
        companyData.enabledModules = null;
      }
      return companyData;
    });

    console.log(`[Company Admin] ✓ Found ${companiesWithDomains.length} companies`);
    res.json(companiesWithDomains);
  } catch (error) {
    console.error('='.repeat(60));
    console.error('[Company Admin] ✗ Get all companies error:');
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    console.error('Error stack:', error.stack);
    console.error('='.repeat(60));
    
    // Check if it's a database connection error
    if (error.message && error.message.includes('timeout')) {
      return res.status(503).json({ 
        message: 'Database connection timeout. Please try again.',
        error: 'Database unavailable'
      });
    }
    
    // Check if it's a table doesn't exist error
    if (error.message && (error.message.includes('Invalid object name') || error.message.includes('does not exist'))) {
      return res.status(500).json({ 
        message: 'Companies table not found. Please run database migration.',
        error: error.message
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to get companies', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Delete any company by companyId (Admin only - for developers)
 * DELETE /api/company/admin/:companyId
 * MUST be defined BEFORE general routes
 */
router.delete('/admin/:companyId', authorizeRole('admin'), async (req, res) => {
  try {
    console.log('='.repeat(60));
    console.log('[Company Admin] 📥 DELETE /api/company/admin/:companyId');
    console.log('='.repeat(60));
    console.log('Request params:', req.params);
    
    const companyId = parseInt(req.params.companyId);

    if (!companyId || isNaN(companyId)) {
      console.error('[Company Admin] ❌ Invalid companyId:', req.params.companyId);
      return res.status(400).json({ message: 'Invalid companyId' });
    }

    // Prevent deleting companyId 1 (default company)
    if (companyId === 1) {
      console.error('[Company Admin] ❌ Cannot delete default company (companyId: 1)');
      return res.status(400).json({ message: 'Cannot delete the default company' });
    }

    console.log('[Company Admin] 🗑️ Deleting company:', companyId);

    const company = await Company.findOne({
      where: { companyId }
    });

    if (!company) {
      console.error('[Company Admin] ❌ Company not found:', companyId);
      return res.status(404).json({ message: 'Company not found' });
    }

    const companyName = company.name;

    // Delete email domain mappings
    const CompanyEmailDomain = require('../models/CompanyEmailDomain');
    await CompanyEmailDomain.destroy({
      where: { companyId }
    });
    console.log('[Company Admin] ✓ Deleted email domain mappings');

    // Delete the company
    await company.destroy();
    console.log(`[Company Admin] ✓ Company deleted: ${companyName} (companyId: ${companyId})`);

    // Refresh cache in companyDomainService
    const { refreshCache } = require('../server/services/companyDomainService');
    await refreshCache();

    res.json({ 
      message: 'Company deleted successfully',
      companyId: companyId
    });
  } catch (error) {
    console.error('[Company Admin] ✗ Delete company error:', error);
    res.status(500).json({ 
      message: 'Failed to delete company', 
      error: error.message
    });
  }
});

/**
 * Update any company by companyId (Admin only - for developers)
 * PUT /api/company/admin/:companyId
 * MUST be defined BEFORE general routes
 */
router.put('/admin/:companyId', authorizeRole('admin'), async (req, res) => {
  try {
    console.log('='.repeat(60));
    console.log('[Company Admin] 📥 PUT /api/company/admin/:companyId');
    console.log('='.repeat(60));
    console.log('Request params:', req.params);
    console.log('Request body:', req.body);
    
    const companyId = parseInt(req.params.companyId);
    const { name, shopName, address, trn, email, phone, website, logo, enabledModules } = req.body;

    if (!companyId || isNaN(companyId)) {
      console.error('[Company Admin] ❌ Invalid companyId:', req.params.companyId);
      return res.status(400).json({ message: 'Invalid companyId' });
    }

    console.log('[Company Admin] 🔄 Updating company:', { companyId, name, shopName });

    let company = await Company.findOne({
      where: { companyId }
    });

    if (!company) {
      console.error('[Company Admin] ❌ Company not found:', companyId);
      return res.status(404).json({ message: 'Company not found' });
    }

    // Build update query with only provided fields
    const updateFields = [];
    const replacements = {
      companyId: companyId
    };

    if (name !== undefined) {
      updateFields.push('name = :name');
      replacements.name = name;
    }
    if (shopName !== undefined) {
      updateFields.push('shopName = :shopName');
      replacements.shopName = shopName || null;
    }
    if (address !== undefined) {
      updateFields.push('address = :address');
      replacements.address = address || null;
    }
    if (trn !== undefined) {
      updateFields.push('trn = :trn');
      replacements.trn = trn || null;
    }
    if (email !== undefined) {
      updateFields.push('email = :email');
      replacements.email = email || null;
    }
    if (phone !== undefined) {
      updateFields.push('phone = :phone');
      replacements.phone = phone || null;
    }
    if (website !== undefined) {
      updateFields.push('website = :website');
      replacements.website = website || null;
    }
    if (logo !== undefined) {
      updateFields.push('logo = :logo');
      replacements.logo = logo || null;
    }
    if (enabledModules !== undefined) {
      updateFields.push('enabledModules = :enabledModules');
      replacements.enabledModules = enabledModules === null || enabledModules === undefined 
        ? null 
        : JSON.stringify(Array.isArray(enabledModules) ? enabledModules : []);
    }

    if (updateFields.length > 0) {
      updateFields.push('updatedAt = GETDATE()');
      const updateQuery = `
        UPDATE companies 
        SET ${updateFields.join(', ')}
        WHERE companyId = :companyId
      `;
      
      console.log('[Company Admin] Executing update query:', updateQuery);
      console.log('[Company Admin] Replacements:', replacements);
      
      await sequelize.query(updateQuery, {
        replacements,
        type: sequelize.QueryTypes.UPDATE
      });
      
      // Reload company to get fresh data
      await company.reload();
      console.log('[Company Admin] ✓ Company updated successfully');
    }

    const companyData = company.get({ plain: true });
    // Parse enabledModules JSON if it exists
    if (companyData.enabledModules) {
      try {
        companyData.enabledModules = typeof companyData.enabledModules === 'string' 
          ? JSON.parse(companyData.enabledModules) 
          : companyData.enabledModules;
      } catch (e) {
        companyData.enabledModules = null;
      }
    } else {
      companyData.enabledModules = null;
    }
    console.log('[Company Admin] ✅ Returning updated company:', companyData);
    res.json(companyData);
  } catch (error) {
    console.error('[Company Admin] ✗ Update company error:', error);
    res.status(500).json({ 
      message: 'Failed to update company information', 
      error: error.message
    });
  }
});

/**
 * Create new company (Admin only)
 * POST /api/company/admin/create
 */
router.post('/admin/create', authorizeRole('admin'), async (req, res) => {
  try {
    const { name, shopName, emailDomain, address, trn, email, phone, website, enabledModules } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Company name is required' });
    }

    if (!emailDomain) {
      return res.status(400).json({ message: 'Email domain is required' });
    }

    console.log('[Company Admin] Creating new company:', { name, emailDomain });

    // Get next available companyId
    const result = await sequelize.query(
      'SELECT MAX(companyId) + 1 AS nextId FROM companies',
      { type: sequelize.QueryTypes.SELECT }
    );
    const nextCompanyId = result[0]?.nextId || 1;

    // Create company
    const company = await Company.create({
      companyId: nextCompanyId,
      name: name,
      shopName: shopName || null,
      address: address || null,
      trn: trn || null,
      email: email || `info@${emailDomain}`,
      phone: phone || null,
      website: website || null,
      enabledModules: enabledModules === null || enabledModules === undefined 
        ? null 
        : (Array.isArray(enabledModules) ? enabledModules : [])
    });

    console.log(`[Company Admin] ✓ Company created: ${company.name} (companyId: ${company.companyId})`);

    // Create email domain mapping
    const CompanyEmailDomain = require('../models/CompanyEmailDomain');
    
    // Extract domain from email if full email is provided
    let normalizedDomain = emailDomain.toLowerCase().trim();
    if (normalizedDomain.includes('@')) {
      normalizedDomain = normalizedDomain.split('@')[1];
    }
    
    // Check if domain already exists
    const existing = await CompanyEmailDomain.findOne({
      where: { emailDomain: normalizedDomain }
    });

    if (existing) {
      // Update existing mapping using raw SQL to avoid date conversion issues
      await sequelize.query(
        `UPDATE company_email_domains 
         SET companyId = :companyId, isActive = 1, updatedAt = GETDATE()
         WHERE emailDomain = :domain`,
        {
          replacements: { companyId: company.companyId, domain: normalizedDomain },
          type: sequelize.QueryTypes.UPDATE
        }
      );
      console.log(`[Company Admin] ✓ Updated domain mapping: ${normalizedDomain} → companyId ${company.companyId}`);
    } else {
      // Create new mapping using raw SQL to avoid date conversion issues
      await sequelize.query(
        `INSERT INTO company_email_domains (companyId, emailDomain, isActive, createdAt, updatedAt)
         VALUES (:companyId, :domain, 1, GETDATE(), GETDATE())`,
        {
          replacements: { companyId: company.companyId, domain: normalizedDomain },
          type: sequelize.QueryTypes.INSERT
        }
      );
      console.log(`[Company Admin] ✓ Created domain mapping: ${normalizedDomain} → companyId ${company.companyId}`);
    }

    // Refresh cache in companyDomainService
    const { refreshCache } = require('../server/services/companyDomainService');
    await refreshCache();

    // Get email domains for response
    const domains = await CompanyEmailDomain.findAll({
      where: { companyId: company.companyId, isActive: true },
      attributes: ['emailDomain']
    });

    const companyData = company.get({ plain: true });
    companyData.emailDomains = domains.map(d => d.emailDomain);
    // Parse enabledModules JSON if it exists
    if (companyData.enabledModules) {
      try {
        companyData.enabledModules = typeof companyData.enabledModules === 'string' 
          ? JSON.parse(companyData.enabledModules) 
          : companyData.enabledModules;
      } catch (e) {
        companyData.enabledModules = null;
      }
    } else {
      companyData.enabledModules = null;
    }

    res.status(201).json(companyData);
  } catch (error) {
    console.error('[Company Admin] ✗ Create company error:', error);
    res.status(500).json({ 
      message: 'Failed to create company', 
      error: error.message
    });
  }
});

/**
 * Get company information
 * GET /api/company
 */
router.get('/', setTenantContext, async (req, res) => {
  try {
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    
    console.log('[Company] Getting company info for companyId:', companyId);
    
    // Ensure table exists before querying
    try {
      await Company.sync({ alter: false });
    } catch (syncError) {
      console.warn('[Company] Sync warning (table may already exist):', syncError.message);
    }
    
    let company = await Company.findOne({
      where: { companyId }
    });

    // If company doesn't exist, create default one
    if (!company) {
      console.log('[Company] Company not found, creating default...');
      try {
        company = await Company.create({
          companyId,
          name: 'BizEase UAE',
          shopName: null,
          address: 'Dubai, United Arab Emirates',
          trn: '',
          email: 'info@bizease.ae',
          phone: '+971 4 XXX XXXX',
          website: 'www.bizease.ae'
        });
        console.log('[Company] ✓ Default company created');
      } catch (createError) {
        console.error('[Company] ✗ Failed to create default company:', createError);
        throw createError;
      }
    } else {
      console.log('[Company] ✓ Company found:', company.name);
    }

    const companyData = company.get({ plain: true });
    // Parse enabledModules JSON if it exists
    if (companyData.enabledModules) {
      try {
        companyData.enabledModules = typeof companyData.enabledModules === 'string' 
          ? JSON.parse(companyData.enabledModules) 
          : companyData.enabledModules;
      } catch (e) {
        companyData.enabledModules = null;
      }
    } else {
      companyData.enabledModules = null;
    }
    res.json(companyData);
  } catch (error) {
    console.error('[Company] ✗ Get company error:', error);
    console.error('[Company] Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    res.status(500).json({ 
      message: 'Failed to get company information', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Update company information (for current tenant)
 * PUT /api/company
 */
router.put('/', authorizeRole('admin'), setTenantContext, async (req, res) => {
  try {
    const companyId = req.companyId || 1; // ✅ Get from tenant context
    const { name, shopName, address, trn, email, phone, website, logo, enabledModules } = req.body;

    console.log('[Company] Updating company:', { companyId, name, shopName });

    // Ensure table exists before querying
    try {
      await Company.sync({ alter: false });
    } catch (syncError) {
      console.warn('[Company] Sync warning (table may already exist):', syncError.message);
    }

    let company = await Company.findOne({
      where: { companyId }
    });

    if (!company) {
      console.log('[Company] Company not found, creating new one');
      // Create new company if doesn't exist
      try {
        company = await Company.create({
          companyId,
          name: name || 'BizEase UAE',
          shopName: shopName || null,
          address: address || null,
          trn: trn || null,
          email: email || null,
          phone: phone || null,
          website: website || null,
          logo: logo || null
        });
        console.log('[Company] ✓ Company created successfully');
      } catch (createError) {
        console.error('[Company] ✗ Failed to create company:', createError);
        throw createError;
      }
    } else {
      console.log('[Company] Company found, updating...');
      // Use raw SQL to avoid SQL Server date conversion issues
      const dayjs = require('dayjs');
      const formattedDate = dayjs().format('YYYY-MM-DD HH:mm:ss');
      
      // Build update query with only provided fields
      const updateFields = [];
      const replacements = {
        companyId: companyId,
        updatedAt: formattedDate
      };

      if (name !== undefined) {
        updateFields.push('name = :name');
        replacements.name = name;
      }
      if (shopName !== undefined) {
        updateFields.push('shopName = :shopName');
        replacements.shopName = shopName || null;
      }
      if (address !== undefined) {
        updateFields.push('address = :address');
        replacements.address = address || null;
      }
      if (trn !== undefined) {
        updateFields.push('trn = :trn');
        replacements.trn = trn || null;
      }
      if (email !== undefined) {
        updateFields.push('email = :email');
        replacements.email = email || null;
      }
      if (phone !== undefined) {
        updateFields.push('phone = :phone');
        replacements.phone = phone || null;
      }
      if (website !== undefined) {
        updateFields.push('website = :website');
        replacements.website = website || null;
      }
      if (logo !== undefined) {
        updateFields.push('logo = :logo');
        replacements.logo = logo || null;
      }
      if (enabledModules !== undefined) {
        updateFields.push('enabledModules = :enabledModules');
        replacements.enabledModules = enabledModules === null || enabledModules === undefined 
          ? null 
          : JSON.stringify(Array.isArray(enabledModules) ? enabledModules : []);
      }

      if (updateFields.length > 0) {
        updateFields.push('updatedAt = :updatedAt');
        const updateQuery = `
          UPDATE companies 
          SET ${updateFields.join(', ')}
          WHERE companyId = :companyId
        `;
        
        console.log('[Company] Executing update query:', updateQuery);
        console.log('[Company] Replacements:', replacements);
        
        await sequelize.query(updateQuery, {
          replacements,
          type: sequelize.QueryTypes.UPDATE
        });
        
        // Reload company to get fresh data
        await company.reload();
        console.log('[Company] ✓ Company updated successfully');
      }
    }

    const companyData = company.get({ plain: true });
    // Parse enabledModules JSON if it exists
    if (companyData.enabledModules) {
      try {
        companyData.enabledModules = typeof companyData.enabledModules === 'string' 
          ? JSON.parse(companyData.enabledModules) 
          : companyData.enabledModules;
      } catch (e) {
        companyData.enabledModules = null;
      }
    } else {
      companyData.enabledModules = null;
    }
    res.json(companyData);
  } catch (error) {
    console.error('[Company] ✗ Update company error:', error);
    console.error('[Company] Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Failed to update company information', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
