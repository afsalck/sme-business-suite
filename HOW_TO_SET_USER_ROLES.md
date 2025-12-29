# 👤 How to Set User Roles (Staff, HR, Accountant, Admin)

This guide explains how to assign roles to users in the system.

---

## 🎯 Available Roles

1. **Staff** - Basic operational access (Invoices, Inventory, POS, Daily Reports)
2. **HR** - Staff permissions + HR Management and Payroll
3. **Accountant** - Financial and accounting access (Accounting, VAT, Expenses, etc.)
4. **Admin** - Full system access (everything)

---

## 📝 Method 1: Using Admin Management Page (Recommended)

### Steps:

1. **Login as Admin**
   - You must have the "admin" role to manage user roles

2. **Navigate to Admin Management**
   - Click "Admin Management" in the sidebar
   - Or go to: `/admin`

3. **Go to Users Tab**
   - The "Users" tab should be selected by default
   - If not, click on the "Users" tab

4. **Change User Role**
   - Find the user you want to update in the table
   - In the "Role" column, you'll see a dropdown menu
   - Select the desired role:
     - **Staff** - Basic access
     - **HR** - HR + Payroll access
     - **Accountant** - Financial access
     - **Admin** - Full access
   - The role will be saved automatically when you select it

5. **Verify the Change**
   - The role should update immediately in the table
   - The user will see their new permissions after refreshing or logging out and back in

---

## 💻 Method 2: Using SQL Server Directly

### Steps:

1. **Open SQL Server Management Studio**
   - Connect to your database

2. **Open Query Window**
   - Navigate to your database (e.g., `bizease`)

3. **Run SQL Query**

```sql
-- View all users and their current roles
SELECT uid, email, displayName, role 
FROM users 
ORDER BY email;

-- Update a specific user's role by email
UPDATE users 
SET role = 'hr'  -- Options: 'staff', 'hr', 'accountant', 'admin'
WHERE email = 'user@example.com';

-- Update a specific user's role by UID
UPDATE users 
SET role = 'accountant' 
WHERE uid = 'firebase-uid-here';

-- View updated user
SELECT uid, email, displayName, role 
FROM users 
WHERE email = 'user@example.com';
```

### Example Queries:

**Set user as HR:**
```sql
UPDATE users SET role = 'hr' WHERE email = 'hr@company.com';
```

**Set user as Accountant:**
```sql
UPDATE users SET role = 'accountant' WHERE email = 'accountant@company.com';
```

**Set user as Staff:**
```sql
UPDATE users SET role = 'staff' WHERE email = 'employee@company.com';
```

**Set user as Admin:**
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@company.com';
```

---

## ✅ Verifying Role Changes

### For the User:

1. **Logout and Login Again**
   - Changes take effect after re-authentication
   - Or refresh the browser (role may auto-refresh)

2. **Check Sidebar Navigation**
   - Only modules they have access to should be visible
   - Staff: Dashboard, Invoices, Inventory, POS, Daily Sales
   - HR: All Staff modules + HR Management, Payroll
   - Accountant: All financial modules (Accounting, VAT, Expenses, etc.)
   - Admin: Everything

3. **Check Topbar**
   - Should show their role badge
   - Example: "STAFF", "HR", "ACCOUNTANT", "ADMIN"

### For Admin:

1. **Check Admin Management Page**
   - Go to Admin Management → Users tab
   - Verify the role shows correctly in the dropdown

2. **Check Backend Logs**
   - When user makes API calls, logs should show their role
   - Example: `[AUTH] ✅ User authenticated: user@example.com (role: hr)`

---

## 🔒 Role Permissions Reference

### Staff Role:
- ✅ Dashboard
- ✅ Invoices (create, edit)
- ✅ Inventory & Sales (view, create)
- ✅ Point of Sale (POS)
- ✅ Daily Sales Report
- ❌ Expenses
- ❌ HR Management
- ❌ Payroll
- ❌ Accounting
- ❌ VAT
- ❌ Admin Management

### HR Role:
- ✅ All Staff permissions
- ✅ HR Management
- ✅ Payroll (Periods & Records)
- ❌ Expenses
- ❌ Accounting
- ❌ VAT
- ❌ Admin Management

### Accountant Role:
- ✅ Dashboard
- ✅ Expenses (create, edit, view)
- ✅ Reports (Financial reports only)
- ✅ Accounting (Chart of Accounts, Journal Entries, General Ledger, Financial Statements, Payments)
- ✅ VAT (Dashboard, Report, Filing, Settings)
- ❌ Invoices
- ❌ Inventory & Sales
- ❌ POS
- ❌ Daily Sales Report
- ❌ HR Management
- ❌ Payroll
- ❌ KYC/AML
- ❌ Admin Management
- ❌ Company Settings

### Admin Role:
- ✅ **Everything** - Full access to all modules
- ✅ User Management
- ✅ Company Settings
- ✅ All financial operations
- ✅ System configuration

---

## 🆘 Troubleshooting

### Role change not taking effect:

1. **User should logout and login again**
   - Role is checked on authentication
   - Or wait for auto-refresh (happens on page focus)

2. **Check database directly**
   ```sql
   SELECT email, role FROM users WHERE email = 'user@example.com';
   ```

3. **Check browser console**
   - Look for role refresh messages
   - Should see: `✅ Role refreshed: hr`

4. **Clear browser cache**
   - Sometimes cached data prevents role updates

### Cannot change role:

1. **Verify you're logged in as Admin**
   - Only admins can change roles

2. **Check backend logs**
   - Look for authorization errors
   - Should see: `[AUTH] ✅ User authenticated: admin@example.com (role: admin)`

3. **Verify API endpoint is accessible**
   - Should be: `PATCH /api/auth/users/:uid/role`

### User sees wrong modules:

1. **Check actual role in database**
   ```sql
   SELECT role FROM users WHERE email = 'user@example.com';
   ```

2. **Verify role permissions configuration**
   - Check `client/src/utils/rolePermissions.js`
   - Verify module access settings

3. **Clear browser cache and reload**

---

## 📋 Quick Reference

| Action | Location | Method |
|--------|----------|--------|
| **Change Role via UI** | Admin Management → Users Tab | Dropdown selection |
| **Change Role via SQL** | SQL Server Management Studio | `UPDATE users SET role = '...'` |
| **View All Roles** | Admin Management → Users Tab | Table view |
| **View Role in SQL** | SQL Server | `SELECT email, role FROM users` |

---

**Last Updated:** 2025-01-05  
**Version:** 1.0
