/**
 * Role-Based Access Control (RBAC) Configuration
 * Defines which modules and features each role can access
 */

const rolePermissions = {
  staff: {
    name: "Staff",
    description: "Basic staff access - core business operations",
    modules: {
      dashboard: { access: true, label: "Dashboard" },
      invoices: { access: true, label: "Invoices", canCreate: true, canEdit: true },
      inventory: { access: true, label: "Inventory & Sales", canView: true, canCreate: true },
      pos: { access: true, label: "Point of Sale (POS)" },
      expenses: { access: false, label: "Expenses" },
      reports: { 
        access: true, 
        label: "Reports", 
        modules: ["daily-sales"] 
      },
      hr: { access: false, label: "HR Management" },
      payroll: { access: false, label: "Payroll" },
      accounting: { access: false, label: "Accounting" },
      vat: { access: false, label: "VAT" },
      kyc: { access: false, label: "KYC/AML" },
      admin: { access: false, label: "Admin Management" },
      companySettings: { access: false, label: "Company Settings" }
    }
  },
  hr: {
    name: "HR",
    description: "HR access - staff permissions + HR and Payroll",
    modules: {
      dashboard: { access: true, label: "Dashboard" },
      invoices: { access: true, label: "Invoices", canCreate: true, canEdit: true },
      inventory: { access: true, label: "Inventory & Sales", canView: true, canCreate: true },
      pos: { access: true, label: "Point of Sale (POS)" },
      expenses: { access: false, label: "Expenses" },
      reports: { 
        access: true, 
        label: "Reports", 
        modules: ["daily-sales"] 
      },
      hr: { access: true, label: "HR Management" },
      payroll: { access: true, label: "Payroll" },
      accounting: { access: false, label: "Accounting" },
      vat: { access: false, label: "VAT" },
      kyc: { access: false, label: "KYC/AML" },
      admin: { access: false, label: "Admin Management" },
      companySettings: { access: false, label: "Company Settings" }
    }
  },
  admin: {
    name: "Admin",
    description: "Full system access - all modules and features",
    modules: {
      dashboard: { access: true, label: "Dashboard" },
      invoices: { access: true, label: "Invoices", canCreate: true, canEdit: true, canDelete: true },
      inventory: { access: true, label: "Inventory & Sales", canView: true, canCreate: true, canEdit: true, canDelete: true },
      pos: { access: true, label: "Point of Sale (POS)" },
      expenses: { access: true, label: "Expenses", canCreate: true, canEdit: true, canDelete: true },
      reports: { 
        access: true, 
        label: "Reports", 
        modules: ["daily-sales", "financial", "custom"] 
      },
      hr: { access: true, label: "HR Management" },
      payroll: { access: true, label: "Payroll" },
      accounting: { access: true, label: "Accounting" },
      vat: { access: true, label: "VAT" },
      kyc: { access: true, label: "KYC/AML" },
      admin: { access: true, label: "Admin Management" },
      companySettings: { access: true, label: "Company Settings" }
    }
  },
  accountant: {
    name: "Accountant",
    description: "Accounting and financial modules only",
    modules: {
      dashboard: { access: true, label: "Dashboard" },
      invoices: { access: false, label: "Invoices" },
      inventory: { access: false, label: "Inventory & Sales" },
      pos: { access: false, label: "Point of Sale (POS)" },
      expenses: { access: true, label: "Expenses", canCreate: true, canEdit: true, canView: true },
      reports: { 
        access: true, 
        label: "Reports", 
        modules: ["financial"] 
      },
      hr: { access: false, label: "HR Management" },
      payroll: { access: false, label: "Payroll" },
      accounting: { access: true, label: "Accounting", canView: true, canCreate: true, canEdit: true },
      vat: { access: true, label: "VAT", canView: true, canCreate: true, canEdit: true },
      kyc: { access: false, label: "KYC/AML" },
      admin: { access: false, label: "Admin Management" },
      companySettings: { access: false, label: "Company Settings" }
    }
  }
};

/**
 * Check if a role has access to a module
 * @param {string} role - User role
 * @param {string} module - Module name
 * @returns {boolean}
 */
function hasModuleAccess(role, module) {
  if (!rolePermissions[role]) return false;
  return rolePermissions[role].modules[module]?.access === true;
}

/**
 * Get all accessible modules for a role
 * @param {string} role - User role
 * @returns {Array} List of accessible modules
 */
function getAccessibleModules(role) {
  if (!rolePermissions[role]) return [];
  
  return Object.entries(rolePermissions[role].modules)
    .filter(([_, config]) => config.access === true)
    .map(([module, config]) => ({
      module,
      ...config
    }));
}

/**
 * Check if role can perform an action on a module
 * @param {string} role - User role
 * @param {string} module - Module name
 * @param {string} action - Action (create, edit, delete, view)
 * @returns {boolean}
 */
function canPerformAction(role, module, action) {
  if (!hasModuleAccess(role, module)) return false;
  
  const moduleConfig = rolePermissions[role].modules[module];
  
  switch(action) {
    case 'create':
      return moduleConfig.canCreate === true;
    case 'edit':
      return moduleConfig.canEdit === true;
    case 'delete':
      return moduleConfig.canDelete === true;
    case 'view':
      return moduleConfig.canView !== false; // Default to true if access is granted
    default:
      return false;
  }
}

module.exports = {
  rolePermissions,
  hasModuleAccess,
  getAccessibleModules,
  canPerformAction
};
