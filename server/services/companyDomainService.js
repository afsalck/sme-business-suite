/**
 * Company Domain Service
 * 
 * Service to get companyId from email domain using database mappings.
 * This allows dynamic email domain mapping without code changes.
 */

const CompanyEmailDomain = require('../../models/CompanyEmailDomain');
const Company = require('../../models/Company');

// Cache for performance (refresh every 5 minutes)
let domainCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Configuration: Auto-create company for new domains?
const AUTO_CREATE_COMPANY = process.env.AUTO_CREATE_COMPANY !== 'false'; // Default: true

// Configuration: Block unmapped domains?
const BLOCK_UNMAPPED_DOMAINS = true; // Enable blocking - only allow biz.com

/**
 * Get companyId from email domain
 * @param {string} email - User's email address
 * @param {boolean} autoCreate - Whether to auto-create company if domain not found (default: true)
 * @returns {Promise<number>} - companyId (defaults to 1 if not found and autoCreate is false)
 */
async function getCompanyIdFromEmail(email, autoCreate = AUTO_CREATE_COMPANY) {
  if (!email) return 1;

  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return 1;

  try {
    // Check cache first
    const now = Date.now();
    if (domainCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      const cachedMapping = domainCache[domain];
      if (cachedMapping !== undefined) {
        return cachedMapping;
      }
    }

    // Query database
    let mapping = await CompanyEmailDomain.findOne({
      where: {
        emailDomain: domain,
        isActive: true
      },
      attributes: ['companyId']
    });

    let companyId;

    if (mapping) {
      // Domain exists, use it
      companyId = mapping.companyId;
    } else if (BLOCK_UNMAPPED_DOMAINS) {
      // Block unmapped domains - return null to indicate rejection
      console.log(`[CompanyDomain] ⚠️ Unmapped domain blocked: ${domain}`);
      return null; // Signal to reject
    } else if (autoCreate) {
      // Domain not found - auto-create company
      console.log(`[CompanyDomain] New domain detected: ${domain}, auto-creating company...`);
      companyId = await createCompanyForDomain(domain);
    } else {
      // Domain not found, use default
      companyId = 1;
    }

    // Update cache
    if (!domainCache) {
      domainCache = {};
    }
    domainCache[domain] = companyId;
    cacheTimestamp = now;

    return companyId;
  } catch (error) {
    console.error('[CompanyDomain] Error getting companyId from email:', error.message);
    // On error, return default
    return 1;
  }
}

/**
 * Auto-create a new company for a new email domain
 * @param {string} domain - Email domain (e.g., 'newcustomer.com')
 * @returns {Promise<number>} - The newly created companyId
 */
async function createCompanyForDomain(domain) {
  try {
    // Get the next available companyId
    const maxCompany = await Company.findOne({
      attributes: [[sequelize.fn('MAX', sequelize.col('companyId')), 'maxId']],
      raw: true
    });

    const nextCompanyId = (maxCompany?.maxId || 0) + 1;

    // Create new company
    const newCompany = await Company.create({
      companyId: nextCompanyId,
      name: `${domain} Company`, // Auto-generated name
      shopName: `${domain} Shop`,
      email: `info@${domain}`,
      // Other fields can be updated later by admin
    });

    console.log(`[CompanyDomain] ✅ Created new company: companyId=${nextCompanyId}, name="${newCompany.name}"`);

    // Create email domain mapping
    await CompanyEmailDomain.create({
      companyId: nextCompanyId,
      emailDomain: domain,
      isActive: true
    });

    console.log(`[CompanyDomain] ✅ Created domain mapping: ${domain} → companyId ${nextCompanyId}`);

    // Refresh cache
    await refreshCache();

    return nextCompanyId;
  } catch (error) {
    console.error('[CompanyDomain] Error creating company for domain:', error.message);
    // If creation fails, return default
    return 1;
  }
}

/**
 * Refresh the domain cache
 * Call this after adding/updating/deleting domain mappings
 */
async function refreshCache() {
  try {
    const mappings = await CompanyEmailDomain.findAll({
      where: { isActive: true },
      attributes: ['emailDomain', 'companyId']
    });

    domainCache = {};
    for (const mapping of mappings) {
      domainCache[mapping.emailDomain.toLowerCase()] = mapping.companyId;
    }
    cacheTimestamp = Date.now();

    console.log(`[CompanyDomain] Cache refreshed: ${Object.keys(domainCache).length} domains`);
  } catch (error) {
    console.error('[CompanyDomain] Error refreshing cache:', error.message);
  }
}

/**
 * Get all domain mappings (for admin UI)
 */
async function getAllMappings() {
  try {
    return await CompanyEmailDomain.findAll({
      order: [['companyId', 'ASC'], ['emailDomain', 'ASC']]
    });
  } catch (error) {
    console.error('[CompanyDomain] Error getting all mappings:', error.message);
    return [];
  }
}

/**
 * Add a new domain mapping
 */
async function addMapping(emailDomain, companyId) {
  try {
    const [mapping, created] = await CompanyEmailDomain.findOrCreate({
      where: { emailDomain: emailDomain.toLowerCase() },
      defaults: {
        companyId,
        isActive: true
      }
    });

    if (!created) {
      // Update existing mapping
      await mapping.update({ companyId, isActive: true });
    }

    // Refresh cache
    await refreshCache();

    return mapping;
  } catch (error) {
    console.error('[CompanyDomain] Error adding mapping:', error.message);
    throw error;
  }
}

/**
 * Delete a domain mapping
 */
async function deleteMapping(emailDomain) {
  try {
    const mapping = await CompanyEmailDomain.findOne({
      where: { emailDomain: emailDomain.toLowerCase() }
    });

    if (mapping) {
      await mapping.destroy();
      // Refresh cache
      await refreshCache();
    }

    return true;
  } catch (error) {
    console.error('[CompanyDomain] Error deleting mapping:', error.message);
    throw error;
  }
}

module.exports = {
  getCompanyIdFromEmail,
  refreshCache,
  getAllMappings,
  addMapping,
  deleteMapping
};

