/**
 * Middleware to check if company has access to a specific module
 * 
 * This middleware should be used after authMiddleware and tenantMiddleware
 * to ensure req.companyId and req.user are available.
 * 
 * Usage:
 * router.get('/inventory', moduleAccessCheck('inventory'), inventoryController);
 */

const Company = require('../../models/Company');

/**
 * Check if company has access to a module
 * @param {string} moduleName - Name of the module to check
 * @returns {Function} Express middleware
 */
function moduleAccessCheck(moduleName) {
  return async (req, res, next) => {
    try {
      // Skip check for developers
      if (req.user && req.user.email) {
        const { isDeveloperEmail } = require('./authMiddleware');
        if (isDeveloperEmail(req.user.email)) {
          return next();
        }
      }

      const companyId = req.companyId || 1;
      
      const company = await Company.findOne({
        where: { companyId },
        attributes: ['enabledModules']
      });

      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      // If enabledModules is null, all modules are available (backward compatibility)
      if (!company.enabledModules) {
        return next();
      }

      // Parse enabledModules if it's a string
      let enabledModules = company.enabledModules;
      if (typeof enabledModules === 'string') {
        try {
          enabledModules = JSON.parse(enabledModules);
        } catch (e) {
          // If parsing fails, allow access (backward compatibility)
          return next();
        }
      }

      // Check if module is in enabled list
      if (Array.isArray(enabledModules) && enabledModules.includes(moduleName)) {
        return next();
      }

      // Module not enabled for this company
      return res.status(403).json({ 
        message: `Module '${moduleName}' is not enabled for this company` 
      });
    } catch (error) {
      console.error('[ModuleAccess] Error checking module access:', error);
      // On error, allow access (fail open for backward compatibility)
      return next();
    }
  };
}

module.exports = {
  moduleAccessCheck
};
