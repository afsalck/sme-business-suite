/**
 * Query Helpers
 * Utilities for building database queries with multi-tenancy support
 * Developers can access all companies
 */

/**
 * Build a where clause with optional companyId filtering
 * Developers bypass companyId filtering (can see all companies)
 * 
 * @param {Object} req - Express request object (must have req.isDeveloper and req.companyId)
 * @param {Object} additionalWhere - Additional where conditions
 * @returns {Object} - Where clause object
 * 
 * @example
 * const where = buildWhereClause(req, { status: 'active' });
 * // For regular user: { companyId: 1, status: 'active' }
 * // For developer: { status: 'active' }
 */
function buildWhereClause(req, additionalWhere = {}) {
  const where = { ...additionalWhere };
  
  // Only add companyId filter if user is NOT a developer
  if (!req.isDeveloper) {
    where.companyId = req.companyId || 1;
  }
  
  return where;
}

/**
 * Build companyId for create/update operations
 * Developers can still set companyId explicitly if needed
 * 
 * @param {Object} req - Express request object
 * @param {number} [explicitCompanyId] - Explicit companyId to use (optional)
 * @returns {number} - CompanyId to use
 */
function getCompanyIdForOperation(req, explicitCompanyId = null) {
  // If explicit companyId provided, use it (even for developers)
  if (explicitCompanyId !== null && explicitCompanyId !== undefined) {
    return explicitCompanyId;
  }
  
  // For developers, default to 1 if not specified
  // For regular users, use their companyId
  return req.companyId || 1;
}

module.exports = {
  buildWhereClause,
  getCompanyIdForOperation
};

