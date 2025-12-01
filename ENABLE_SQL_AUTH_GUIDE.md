# Enable SQL Server Authentication - Step by Step

## Problem
Your credentials are correct, but SQL Server is rejecting the connection because:
- SQL Server Authentication mode is disabled (only Windows Auth is enabled)
- OR the 'sa' account is disabled

## Solution: Enable SQL Server Authentication

### Step 1: Open SQL Server Management Studio (SSMS)

If you don't have SSMS:
- Download from: https://learn.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms
- Or use Azure Data Studio (if installed)

### Step 2: Connect with Windows Authentication

1. Open SSMS
2. **Server name:** `localhost` or `.\MSSQLSERVER` or `(local)`
3. **Authentication:** Windows Authentication
4. Click **Connect**

### Step 3: Enable SQL Server Authentication Mode

1. **Right-click** on your server name (top of Object Explorer)
2. Click **Properties**
3. Go to **Security** tab (left side)
4. Under **Server authentication**, select:
   - ✅ **"SQL Server and Windows Authentication mode"**
5. Click **OK**
6. **IMPORTANT:** You'll see a message saying you need to restart SQL Server

### Step 4: Restart SQL Server Service

**Option A: Using Services (Easiest)**
1. Press `Win + R`
2. Type `services.msc` and press Enter
3. Find **"SQL Server (MSSQLSERVER)"**
4. **Right-click** → **Restart**
5. Wait 30-60 seconds for it to restart

**Option B: Using SSMS**
1. Right-click server name in SSMS
2. Click **Restart**
3. Confirm the restart

### Step 5: Enable 'sa' Account

1. In SSMS, expand **Security** → **Logins**
2. **Right-click** on **sa** → **Properties**
3. Go to **General** tab:
   - **Password:** Enter your password (or keep current)
   - **Confirm password:** Enter again
   - **Uncheck** "Enforce password policy" (optional, for easier testing)
4. Go to **Status** tab:
   - **Login:** Select **Enabled** ✅
   - **Uncheck** "Login is locked out" if checked
5. Click **OK**

### Step 6: Test Connection

Run this in PowerShell:
```powershell
cd D:\Personal\Biz\server
node test-sql-connection.js
```

You should see: **✅ Connection successful!**

## Alternative: Use Windows Authentication

If you can't enable SQL Server Authentication, you can use Windows Authentication instead:

### Update `.env` file:
```env
DB_USER=YourWindowsUsername
DB_PASSWORD=
```

### Update `server/config/database.js`:
Change the Sequelize configuration to use Windows Authentication (trusted connection).

## Quick Test in SSMS

After enabling SQL Server Authentication, test in SSMS:
1. Click **Connect** → **Database Engine**
2. **Server name:** `localhost`
3. **Authentication:** SQL Server Authentication
4. **Login:** `sa`
5. **Password:** (your password)
6. Click **Connect**

If this works in SSMS, it will work in your app!

## Still Not Working?

1. **Check SQL Server Error Log:**
   - In SSMS: Management → SQL Server Logs
   - Look for authentication errors

2. **Verify 'sa' is not locked:**
   ```sql
   SELECT name, is_disabled, is_policy_checked
   FROM sys.sql_logins
   WHERE name = 'sa';
   ```

3. **Reset 'sa' password:**
   ```sql
   ALTER LOGIN sa WITH PASSWORD = 'NewPassword123';
   ALTER LOGIN sa ENABLE;
   ```

## After Success

Once connection works:
1. ✅ Create database: `CREATE DATABASE Biz;`
2. ✅ Initialize tables: `node scripts/init-database.js`
3. ✅ Start server: `npm run dev`

