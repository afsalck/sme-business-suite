# Connect to SQL Server on AFSAL-PC

## Your Server Details
- **Server Name:** `AFSAL-PC` or `AFSAL-PC\MSSQLSERVER`
- **Alternative:** `localhost` or `(local)` (should also work)

## Step-by-Step Connection

### Step 1: Open SQL Server Management Studio (SSMS)

1. Press `Win` key
2. Type "SQL Server Management Studio" or "SSMS"
3. Click to open

**Don't have SSMS?** Download: https://learn.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms

### Step 2: Connect to Your Server

When SSMS opens, in the "Connect to Server" dialog:

1. **Server name:** Try one of these:
   - `AFSAL-PC`
   - `AFSAL-PC\MSSQLSERVER`
   - `localhost`
   - `(local)`
   - `.\MSSQLSERVER`

2. **Authentication:** Select **"Windows Authentication"**

3. Click **Connect**

**If connection fails:**
- Try `localhost` instead
- Make sure SQL Server service is running (services.msc)

### Step 3: Enable SQL Server Authentication

1. In SSMS, **right-click** on **"AFSAL-PC"** (or your server name at the top of Object Explorer)
2. Click **Properties**
3. Click **Security** tab (left side)
4. Under **"Server authentication"**, select:
   - ✅ **"SQL Server and Windows Authentication mode"**
5. Click **OK**
6. You'll see: "You must restart SQL Server for this change to take effect"
7. Click **OK**

### Step 4: Restart SQL Server

1. Press `Win + R`
2. Type: `services.msc`
3. Press Enter
4. Find **"SQL Server (MSSQLSERVER)"**
5. **Right-click** → **Restart**
6. Wait 30-60 seconds

### Step 5: Enable 'sa' Account

1. In SSMS, expand:
   - **AFSAL-PC** → **Security** → **Logins**
2. Find **sa** in the list
3. **Right-click** on **sa** → **Properties**
4. **General** tab:
   - Enter/confirm password
   - Uncheck "Enforce password policy" (optional)
5. **Status** tab:
   - **Login:** Select **Enabled** ✅
   - Uncheck "Login is locked out" if checked
6. Click **OK**

### Step 6: Test Connection

1. In SSMS, click **Connect** button (top)
2. Select **Database Engine**
3. **Server name:** `AFSAL-PC` or `localhost`
4. **Authentication:** **SQL Server Authentication**
5. **Login:** `sa`
6. **Password:** (your password)
7. Click **Connect**

**If this works**, your app will work! ✅

### Step 7: Test in Your App

```powershell
cd D:\Personal\Biz\server
node diagnose-sql-connection.js
```

Should show: **✅ Connection successful!**

## Quick Reference

**For SSMS Connection:**
- Server: `AFSAL-PC` or `localhost`
- Auth: Windows Authentication (first time)
- Then: SQL Server Authentication (after enabling)

**For Your App (.env file):**
- DB_HOST=localhost (or AFSAL-PC)
- DB_PORT=1433
- DB_NAME=Biz
- DB_USER=sa
- DB_PASSWORD=(your password)

## Troubleshooting

### "Cannot connect to AFSAL-PC"
- Try `localhost` instead
- Check if SQL Server service is running
- Try `.\MSSQLSERVER` or `(local)`

### "Login failed"
- Make sure you enabled "SQL Server and Windows Authentication mode"
- Make sure you restarted SQL Server after enabling
- Make sure 'sa' account is enabled

## After Success

1. Create database: `CREATE DATABASE Biz;` (in SSMS)
2. Initialize tables: `node scripts/init-database.js`
3. Restart your server - database will connect!

