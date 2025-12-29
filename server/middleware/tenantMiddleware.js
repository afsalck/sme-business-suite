/**
 * Tenant Middleware
 * Sets companyId (tenant context) from authenticated user
 * This ensures all queries are filtered by the user's company
 * Developers can access all companies (req.isDeveloper = true)
 */

const User = require('../../models/User');

/**
 * Check if email belongs to a developer
 * Developers can access all companies
 */
function isDeveloperEmail(email) {
  if (!email) return false;
  
  const emailLower = email.toLowerCase();
  
  // Check by email domain
  const developerDomains = [
    '@bizease.ae',
    '@developer.com'
  ];
  
  if (developerDomains.some(domain => emailLower.endsWith(domain))) {
    return true;
  }
  
  // Check by specific email addresses
  const developerEmails = [
    'developer@bizease.ae',
    'admin@bizease.ae'
  ];
  
  if (developerEmails.includes(emailLower)) {
    return true;
  }
  
  // Check by environment variable
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

/**
 * Set tenant context (companyId) from authenticated user
 * This middleware should be used after verifyFirebaseToken
 * Developers can access all companies (req.isDeveloper = true)
 */
async function setTenantContext(req, res, next) {
  try {
    // Check if user is a developer
    const isDev = req.user && req.user.email ? isDeveloperEmail(req.user.email) : false;
    req.isDeveloper = isDev;
    
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
          
          if (isDev) {
            console.log(`[Tenant] ✅ Developer access: ${req.user.email} (can access ALL companies)`);
          } else {
            console.log(`[Tenant] ✅ Company context set: companyId=${req.companyId} for user ${req.user.email}`);
          }
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

