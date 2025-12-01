# How to Enable SQL Server Authentication - Step by Step

## What You Need
- **SQL Server Management Studio (SSMS)** - If you don't have it, download from: https://learn.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms

## Step-by-Step Instructions

### Step 1: Open SQL Server Management Studio (SSMS)

1. Press `Win` key (Windows key)
2. Type "SQL Server Management Studio" or "SSMS"
3. Click on it to open

**If you don't have SSMS:**
- Download from: https://learn.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms
- Install it (takes 5-10 minutes)

### Step 2: Connect to SQL Server

1. When SSMS opens, you'll see a "Connect to Server" dialog
2. **Server name:** Type one of these:
   - `localhost`
   - `(local)`
   - `.\MSSQLSERVER`
   - `.\SQLEXPRESS` (if you have Express edition)
3. **Authentication:** Select **"Windows Authentication"** (this is important!)
4. Click **Connect**

### Step 3: Enable SQL Server Authentication Mode

1. In SSMS, look at the left side (Object Explorer)
2. **Right-click** on your server name (the top item, usually shows your computer name)
3. Click **Properties**
4. A new window opens - click **Security** tab (on the left side)
5. Under **"Server authentication"**, you'll see two options:
   - ⚪ **Windows Authentication mode** (currently selected - this is why it's not working)
   - ⚪ **SQL Server and Windows Authentication mode** ← **SELECT THIS ONE!**
6. Click **OK**
7. You'll see a message: **"You must restart SQL Server for this change to take effect"**
8. Click **OK** on the message

### Step 4: Restart SQL Server Service

**Option A: Using Services (Easiest)**

1. Press `Win + R` keys together
2. Type: `services.msc`
3. Press Enter
4. Find **"SQL Server (MSSQLSERVER)"** in the list
5. **Right-click** on it
6. Click **Restart**
7. Wait 30-60 seconds for it to restart (you'll see the status change)

**Option B: Using SSMS**

1. In SSMS, **right-click** on your server name (in Object Explorer)
2. Click **Restart**
3. Confirm the restart
4. Wait for it to restart

### Step 5: Enable 'sa' Account

1. In SSMS, expand your server name (click the +)
2. Expand **Security** (click the +)
3. Expand **Logins** (click the +)
4. Find **sa** in the list
5. **Right-click** on **sa**
6. Click **Properties**
7. Go to **General** tab:
   - **Password:** Enter your password (or keep current one)
   - **Confirm password:** Enter again
   - **Uncheck** "Enforce password policy" (optional, for easier testing)
8. Go to **Status** tab:
   - Under **"Login"**, select **Enabled** ✅
   - **Uncheck** "Login is locked out" if it's checked
9. Click **OK**

### Step 6: Test the Connection

1. In SSMS, click **Connect** button (top left)
2. Select **Database Engine**
3. **Server name:** `localhost`
4. **Authentication:** Select **SQL Server Authentication**
5. **Login:** `sa`
6. **Password:** (enter your password)
7. Click **Connect**

**If this works**, your app will work too! ✅

### Step 7: Test in Your App

Go back to PowerShell and test:

```powershell
cd D:\Personal\Biz\server
node diagnose-sql-connection.js
```

You should see: **✅ Connection successful!**

## Visual Guide

```
SSMS Window:
┌─────────────────────────────────┐
│ Object Explorer                 │
│ ┌─────────────────────────────┐ │
│ │ YourServerName (right-click)│ │ ← Right-click here
│ │   ├─ Databases              │ │
│ │   ├─ Security               │ │
│ │   │   └─ Logins             │ │
│ │   │       └─ sa (right-click)│ │ ← Enable here
│ │   └─ ...                    │ │
└─────────────────────────────────┘
```

## Troubleshooting

### "I can't find SSMS"
- Download from: https://learn.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms
- Or use Azure Data Studio if you have it

### "I can't connect with Windows Authentication"
- Make sure SQL Server service is running (services.msc)
- Try different server names: `localhost`, `(local)`, `.\MSSQLSERVER`

### "sa account is grayed out"
- Make sure you're connected as an administrator
- Try connecting with a Windows account that has admin rights

### "After restart, I can't connect"
- Wait a bit longer (30-60 seconds)
- Try connecting again
- Check if SQL Server service is running

## After Success

Once connection works:
1. ✅ Create database: `CREATE DATABASE Biz;` (in SSMS)
2. ✅ Initialize tables: `node scripts/init-database.js`
3. ✅ Restart server: The database will connect automatically!

## Quick Checklist

- [ ] Opened SSMS
- [ ] Connected with Windows Authentication
- [ ] Enabled "SQL Server and Windows Authentication mode"
- [ ] Restarted SQL Server service
- [ ] Enabled 'sa' account
- [ ] Tested connection with SQL Server Authentication in SSMS
- [ ] Tested connection in app (node diagnose-sql-connection.js)

Once all checked, your app will work! 🎉

