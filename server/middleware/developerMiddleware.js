/**
 * Developer Middleware
 * For routes that need to bypass tenant isolation (developer-only features)
 * 
 * Usage:
 *   - Use this INSTEAD of setTenantContext for developer routes
 *   - Allows developers to see/manage all companies
 *   - Regular users are blocked
 */

const { authorizeRole } = require('./authMiddleware');

/**
 * Middleware to allow developers to bypass tenant context
 * Sets req.isDeveloper = true and allows access to all companies
 * 
 * IMPORTANT: This should be used INSTEAD of setTenantContext for developer routes
 */
function allowDeveloperAccess(req, res, next) {
  // Check if user is admin/developer
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Forbidden: Developer access required',
      error: 'This endpoint is only accessible to developers'
    });
  }

  // Mark as developer access (bypasses tenant isolation)
  req.isDeveloper = true;
  req.developerMode = true;
  
  console.log(`[Developer] ✅ Developer access granted for ${req.user.email}`);
  next();
}

/**
 * Optional tenant context for developers
 * Allows developers to optionally filter by companyId via query param
 * If no companyId provided, returns all data
 */
function optionalTenantContext(req, res, next) {
  // If user is developer and companyId is in query, use it
  // Otherwise, allow access to all companies
  if (req.user && req.user.role === 'admin' && req.query.companyId) {
    req.companyId = parseInt(req.query.companyId);
    req.isDeveloper = true;
    console.log(`[Developer] Filtering by companyId: ${req.companyId}`);
  } else if (req.user && req.user.role === 'admin') {
    req.isDeveloper = true;
    req.developerMode = true;
    console.log(`[Developer] Accessing all companies`);
  } else {
    // Regular user - require tenant context
    const { setTenantContext } = require('./tenantMiddleware');
    return setTenantContext(req, res, next);
  }
  
  next();
}

module.exports = {
  allowDeveloperAccess,
  optionalTenantContext
};

