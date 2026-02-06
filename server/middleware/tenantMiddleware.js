/**
 * Tenant Middleware
 * Sets companyId (tenant context) from authenticated user.
 *
 * IMPORTANT:
 * - This middleware should NOT grant cross-tenant (all companies) access.
 * - Developer / super-admin cross-tenant access must be handled explicitly via
 *   `developerMiddleware` on developer-only routes.
 */

const User = require('../../models/User');

/**
 * Set tenant context (companyId) from authenticated user
 * This middleware should be used after verifyFirebaseToken
 */
async function setTenantContext(req, res, next) {
  try {
    // Tenant middleware never grants developer access.
    req.isDeveloper = false;
    
    // Get companyId from authenticated user
    if (req.user && req.user.uid) {
      try {
        const user = await User.findOne({
          where: { uid: req.user.uid },
          attributes: ['id', 'uid', 'email', 'companyId', 'role']
        });

        if (user && user.companyId) {
          req.companyId = user.companyId;
          req.userId = user.id;
          // Also update req.user with companyId for consistency
          req.user.companyId = user.companyId;
          console.log(`[Tenant] ✅ Company context set: companyId=${req.companyId} for user ${req.user.email}`);
        } else {
          // User exists but no companyId - use default
          req.companyId = 1;
          req.user.companyId = 1;
          console.warn(`[Tenant] ⚠️ User ${req.user.email} has no companyId, using default (1)`);
        }
      } catch (dbError) {
        // If database query fails, use default
        req.companyId = 1;
        req.user.companyId = 1;
        console.warn(`[Tenant] ⚠️ Could not fetch user companyId, using default (1):`, dbError.message);
      }
    } else {
      // No authenticated user - use default (shouldn't happen if auth middleware is before this)
      req.companyId = 1;
      console.warn(`[Tenant] ⚠️ No authenticated user, using default companyId (1)`);
    }

    next();
  } catch (error) {
    console.error('[Tenant] Error setting tenant context:', error);
    // On error, use default to prevent blocking requests
    req.companyId = 1;
    req.isDeveloper = false;
    next();
  }
}

module.exports = { setTenantContext };

