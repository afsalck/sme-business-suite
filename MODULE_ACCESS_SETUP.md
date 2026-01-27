# Module Access Control Setup Guide

This guide explains how to configure which modules are available to each company, allowing you to provide POS and Inventory only to specific customers.

## Overview

The system now supports company-level module access control. This means you can configure which modules (features) each company can access:

- **All Modules (Default)**: If `enabledModules` is `null`, the company has access to all modules (backward compatible)
- **Custom Selection**: If `enabledModules` is an array, only the modules in that array are available

## Available Modules

- `dashboard` - Dashboard
- `invoices` - Invoices
- `inventory` - Inventory & Sales
- `pos` - Point of Sale (POS)
- `expenses` - Expenses
- `reports` - Reports
- `hr` - HR Management
- `payroll` - Payroll
- `accounting` - Accounting
- `vat` - VAT
- `kyc` - KYC/AML

## Setup Steps

### 1. Run Migration

First, add the `enabledModules` column to the companies table:

```bash
node scripts/add-enabled-modules-column.js
```

This script will:
- Add the `enabledModules` column to the companies table
- Set existing companies to `null` (all modules enabled) for backward compatibility

### 2. Configure Company Modules

#### Option A: Using the UI (Recommended)

1. Log in as a developer/admin
2. Navigate to **Companies Management** (`/admin/companies`)
3. Click **Edit** on the company you want to configure
4. In the **Enabled Modules** section:
   - Select **"All Modules (Default)"** to enable all modules
   - Select **"Custom Selection"** to choose specific modules
5. Check/uncheck the modules you want to enable
6. Click **Update Company**

#### Option B: Direct Database Update

You can also update the database directly:

```sql
-- Enable only POS and Inventory for companyId 2
UPDATE companies 
SET enabledModules = '["pos", "inventory"]'
WHERE companyId = 2;

-- Enable all modules (default)
UPDATE companies 
SET enabledModules = NULL
WHERE companyId = 2;
```

## Example: POS and Inventory Only

To provide a customer with only POS and Inventory:

1. **Via UI**:
   - Go to Companies Management
   - Edit the company
   - Select "Custom Selection"
   - Check only "Point of Sale (POS)" and "Inventory & Sales"
   - Save

2. **Via SQL**:
   ```sql
   UPDATE companies 
   SET enabledModules = '["pos", "inventory", "dashboard"]'
   WHERE companyId = <companyId>;
   ```
   Note: Include "dashboard" as it's typically needed for navigation.

## How It Works

### Frontend
- The Sidebar automatically filters menu items based on company `enabledModules`
- Users only see modules that are enabled for their company
- The permission system checks both:
  1. User role permissions (staff, admin, etc.)
  2. Company module access

### Backend
- API routes can optionally use `moduleAccessCheck` middleware for additional security
- The middleware checks company module access before allowing requests
- Developers can bypass module restrictions

## Testing

1. **Test with All Modules**:
   - Set `enabledModules` to `null`
   - Verify all modules are visible in the sidebar

2. **Test with Limited Modules**:
   - Set `enabledModules` to `["pos", "inventory", "dashboard"]`
   - Verify only POS, Inventory, and Dashboard are visible
   - Verify other modules are hidden

3. **Test Role Permissions**:
   - Even if a module is enabled for the company, users still need proper role permissions
   - A staff user with only POS/Inventory enabled won't see accounting modules

## Important Notes

1. **Dashboard Module**: It's recommended to always include "dashboard" in enabled modules, as it's the default landing page.

2. **Backward Compatibility**: 
   - Existing companies with `null` enabledModules have access to all modules
   - This ensures existing deployments continue to work

3. **Developer Access**: 
   - Developers (emails ending with `@bizease.ae` or `@developer.com`) can bypass module restrictions
   - This allows developers to test and manage all features

4. **Role vs Module Access**:
   - Module access is checked AFTER role permissions
   - If a user's role doesn't allow a module, they won't see it even if the company has it enabled
   - This provides two layers of security

## Troubleshooting

### Modules Not Showing
1. Check company `enabledModules` in database
2. Verify user role has access to the module
3. Check browser console for errors
4. Ensure migration script ran successfully

### All Modules Hidden
- Check if `enabledModules` is an empty array `[]`
- Set to `null` to enable all modules

### Migration Issues
- Ensure SQL Server connection is working
- Check that the companies table exists
- Verify column was added: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'companies' AND COLUMN_NAME = 'enabledModules'`

## API Usage

For backend routes, you can optionally add module access checks:

```javascript
const { moduleAccessCheck } = require('../server/middleware/moduleAccessMiddleware');

router.get('/inventory', 
  authorizeRole('staff'), 
  setTenantContext,
  moduleAccessCheck('inventory'),
  inventoryController
);
```

This provides an additional layer of security, though the frontend filtering is the primary user-facing control.
