# Fix SQL Server Authentication - Step by Step

## ✅ What We Know
- SQL Server is **running** ✅
- SQL Server is **listening on port 1433** ✅
- Your credentials are **correct** ✅
- **Problem:** SQL Server Authentication is **NOT enabled** ❌

## 🔧 Solution: Enable SQL Server Authentication

### Method 1: Using SQL Server Management Studio (SSMS)

#### Step 1: Open SSMS
- If you don't have SSMS, download: https://learn.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms
- Or use Azure Data Studio if you have it

#### Step 2: Connect with Windows Authentication
1. Open SSMS
2. **Server name:** `localhost` or `(local)` or `.\MSSQLSERVER`
3. **Authentication:** **Windows Authentication**
4. Click **Connect**

#### Step 3: Enable SQL Server Authentication Mode
1. **Right-click** on your server name (top of Object Explorer, left side)
2. Click **Properties**
3. Click **Security** tab (left side)
4. Under **"Server authentication"**, you'll see:
   - ⚪ Windows Authentication mode (currently selected)
   - ⚪ SQL Server and Windows Authentication mode (select this!)
5. **Select:** "SQL Server and Windows Authentication mode"
6. Click **OK**
7. **IMPORTANT:** You'll see a message: "You must restart SQL Server for this change to take effect"

#### Step 4: Restart SQL Server
**Option A: Using Services (Easiest)**
1. Press `Win + R`
2. Type `services.msc` and press Enter
3. Find **"SQL Server (MSSQLSERVER)"**
4. **Right-click** → **Restart**
5. Wait 30-60 seconds

**Option B: Using SSMS**
1. Right-click server name in SSMS
2. Click **Restart**
3. Confirm

#### Step 5: Enable 'sa' Account
1. In SSMS, expand **Security** → **Logins** (left side)
2. **Right-click** on **sa** → **Properties**
3. **General** tab:
   - **Password:** Enter your password (or keep current)
   - **Confirm password:** Enter again
   - **Uncheck** "Enforce password policy" (optional, for testing)
4. **Status** tab:
   - **Login:** Select **Enabled** ✅
   - **Uncheck** "Login is locked out" if checked
5. Click **OK**

#### Step 6: Test Connection
In SSMS, try connecting with SQL Server Authentication:
1. Click **Connect** → **Database Engine**
2. **Server name:** `localhost`
3. **Authentication:** **SQL Server Authentication**
4. **Login:** `sa`
5. **Password:** (your password)
6. Click **Connect**

If this works, your app will work too!

#### Step 7: Test in Your App
```powershell
cd D:\Personal\Biz\server
node diagnose-sql-connection.js
```

You should see: **✅ Connection successful!**

---

## Method 2: Using SQL Server Configuration Manager

If you can't access SSMS:

1. Press `Win + R`
2. Type `SQLServerManager16.msc` (or `SQLServerManager15.msc` for older versions)
3. Expand **SQL Server Network Configuration**
4. Click **Protocols for MSSQLSERVER**
5. **Right-click** **TCP/IP** → **Properties**
6. Go to **IP Addresses** tab
7. Scroll to bottom, set **TCP Dynamic Ports** to blank
8. Set **TCP Port** to `1433` for all IP addresses
9. Click **OK**
10. Restart SQL Server service

Then follow Steps 3-7 from Method 1.

---

## Method 3: Use Windows Authentication Instead

If you can't enable SQL Server Authentication, use Windows Authentication:

### Update `.env` file:
```env
DB_USER=YourWindowsUsername
DB_PASSWORD=
```

### Update `server/config/database.js`:
Change to use Windows Authentication (trusted connection).

---

## Still Not Working?

### Check SQL Server Error Log:
1. In SSMS: **Management** → **SQL Server Logs**
2. Look for authentication errors
3. Check the exact error message

### Verify 'sa' Status:
Run this in SSMS (Windows Auth):
```sql
SELECT name, is_disabled, is_policy_checked, is_expiration_checked
FROM sys.sql_logins
WHERE name = 'sa';
```

### Reset 'sa' Password:
```sql
ALTER LOGIN sa WITH PASSWORD = 'YourNewPassword';
ALTER LOGIN sa ENABLE;
```

Then update your `.env` file with the new password.

---

## Quick Checklist

- [ ] SQL Server is running (services.msc)
- [ ] SQL Server Authentication mode is enabled (SSMS → Properties → Security)
- [ ] SQL Server service was restarted after enabling Mixed Mode
- [ ] 'sa' account is enabled (SSMS → Security → Logins → sa)
- [ ] 'sa' password is correct in .env file
- [ ] Can connect with SSMS using SQL Server Authentication

If all checked, connection should work! ✅

