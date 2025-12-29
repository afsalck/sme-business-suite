# 🔐 Role-Based Access Control (RBAC)

This document describes the role-based access control system that divides modules and features based on user roles.

---

## 👥 User Roles

The system supports four roles:

1. **Staff** - Basic operational access
2. **HR** - Staff permissions + HR and Payroll
3. **Accountant** - Financial and accounting access
4. **Admin** - Full system access

---

## 📊 Module Access Matrix

| Module | Staff | HR | Accountant | Admin |
|--------|-------|----|-----------|-------|
| **Dashboard** | ✅ | ✅ | ✅ | ✅ |
| **Invoices** | ✅ | ✅ | ✅ | ✅ |
| **Inventory & Sales** | ✅ | ✅ | ✅ (View only) | ✅ |
| **Point of Sale (POS)** | ✅ | ✅ | ✅ | ✅ |
| **Expenses** | ❌ | ❌ | ✅ | ✅ |
| **Daily Sales Report** | ✅ | ✅ | ✅ | ✅ |
| **HR Management** | ❌ | ✅ | ❌ | ✅ |
| **Payroll** | ❌ | ✅ | ❌ | ✅ |
| **Accounting** | ❌ | ❌ | ✅ | ✅ |
| **VAT** | ❌ | ❌ | ✅ | ✅ |
| **KYC/AML** | ❌ | ❌ | ❌ | ✅ |
| **Reports & Analytics** | ❌ (Daily Sales only) | ❌ (Daily Sales only) | ✅ (Financial only) | ✅ |
| **Company Settings** | ❌ | ❌ | ❌ | ✅ |
| **Admin Management** | ❌ | ❌ | ❌ | ✅ |

---

## 📋 Detailed Role Permissions

### 👤 Staff Role

**Description:** Basic staff access for core business operations

**Accessible Modules:**
- ✅ Dashboard
- ✅ Invoices (create, edit)
- ✅ Inventory & Sales (view, create)
- ✅ Point of Sale (POS)
- ✅ Daily Sales Report

**Restricted Modules:**
- ❌ Expenses
- ❌ HR Management
- ❌ Payroll
- ❌ Accounting
- ❌ VAT
- ❌ KYC/AML
- ❌ Advanced Reports
- ❌ Admin Management
- ❌ Company Settings

---

### 👥 HR Role

**Description:** HR access - includes all Staff permissions plus HR and Payroll modules

**Accessible Modules:**
- ✅ All Staff modules
- ✅ HR Management
- ✅ Payroll (Periods & Records)

**Restricted Modules:**
- ❌ Expenses
- ❌ Accounting
- ❌ VAT
- ❌ KYC/AML
- ❌ Advanced Reports
- ❌ Admin Management
- ❌ Company Settings

---

### 💼 Accountant Role

**Description:** Accounting and financial modules only

**Accessible Modules:**
- ✅ Dashboard
- ✅ Expenses (create, edit, view)
- ✅ Reports (Financial reports only)
- ✅ Accounting (Chart of Accounts, Journal Entries, General Ledger, Financial Statements, Payments)
- ✅ VAT (Dashboard, Report, Filing, Settings)

**Restricted Modules:**
- ❌ Invoices
- ❌ Inventory & Sales
- ❌ POS
- ❌ Daily Sales Report
- ❌ HR Management
- ❌ Payroll
- ❌ KYC/AML
- ❌ Admin Management
- ❌ Company Settings

---

### 👑 Admin Role

**Description:** Full system access - all modules and features

**Accessible Modules:**
- ✅ **All modules** - Complete access to everything
- ✅ All actions (create, edit, delete, view)

**Special Permissions:**
- ✅ User Management (Admin Management)
- ✅ Company Settings
- ✅ Full Reports & Analytics
- ✅ All financial operations
- ✅ System configuration

---

## 🔒 Route Protection

Routes are protected using the `authorizeRole` middleware on the backend:

```javascript
// Example: Protect route for admin only
router.put('/company', authorizeRole('admin'), async (req, res) => {
  // Only admins can access this route
});

// Example: Protect route for multiple roles
router.get('/payroll/records', authorizeRole('admin', 'hr', 'accountant'), async (req, res) => {
  // Admins, HR, and Accountants can access
});
```

---

## 🎨 Frontend Access Control

The frontend uses role permissions to:
1. **Filter navigation menu** - Only show modules user can access
2. **Hide/show UI elements** - Hide buttons/features based on permissions
3. **Protect routes** - Redirect unauthorized users

### Example Usage in Components:

```javascript
import { hasModuleAccess, canPerformAction } from '../utils/rolePermissions';

// Check if user can access a module
if (hasModuleAccess(role, 'accounting')) {
  // Show accounting menu items
}

// Check if user can perform an action
if (canPerformAction(role, 'invoices', 'delete')) {
  // Show delete button
}
```

---

## 📝 Implementation Files

### Backend:
- `server/config/rolePermissions.js` - Role permissions configuration
- `server/middleware/authMiddleware.js` - `authorizeRole` middleware
- Routes use `authorizeRole('role1', 'role2')` to protect endpoints

### Frontend:
- `client/src/utils/rolePermissions.js` - Frontend permissions
- `client/src/components/Sidebar.js` - Filters navigation based on role
- Components use `hasModuleAccess()` and `canPerformAction()` utilities

---

## ✅ Adding New Modules

To add a new module:

1. **Update Backend Permissions** (`server/config/rolePermissions.js`):
```javascript
modules: {
  newModule: { 
    access: true, // or false
    label: "New Module",
    canCreate: true,
    canEdit: true,
    canDelete: true
  }
}
```

2. **Update Frontend Permissions** (`client/src/utils/rolePermissions.js`):
   - Add same configuration as backend

3. **Add Route Protection**:
```javascript
router.get('/new-module', authorizeRole('admin', 'accountant'), handler);
```

4. **Update Sidebar** (`client/src/components/Sidebar.js`):
   - Add navigation item with `module: "newModule"`
   - Sidebar will automatically filter based on permissions

---

## 🔍 Testing Role Access

1. **Login as different roles:**
   - Staff: Basic access
   - HR: Staff + HR/Payroll
   - Accountant: Financial modules
   - Admin: Everything

2. **Verify navigation:**
   - Only accessible modules appear in sidebar
   - Restricted modules are hidden

3. **Verify route protection:**
   - Try accessing restricted routes directly
   - Should return 403 Forbidden

4. **Verify UI elements:**
   - Buttons/actions respect role permissions
   - Only allowed actions are visible

---

## 📚 Role Assignment

Roles are assigned in the database `users` table:

```sql
UPDATE users SET role = 'staff' WHERE email = 'user@example.com';
UPDATE users SET role = 'hr' WHERE email = 'hr@example.com';
UPDATE users SET role = 'accountant' WHERE email = 'accountant@example.com';
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

Or via Admin Management page in the UI (admin only).

---

## 🎯 Quick Reference

| Role | Primary Use Case | Key Modules |
|------|-----------------|-------------|
| **Staff** | Daily operations | Invoices, Inventory, POS, Daily Reports |
| **HR** | HR operations | Staff modules + HR, Payroll |
| **Accountant** | Financial operations | Accounting, VAT, Expenses, Financial Reports |
| **Admin** | System management | Everything + Admin, Company Settings |

---

**Last Updated:** 2025-01-05  
**Version:** 1.0
