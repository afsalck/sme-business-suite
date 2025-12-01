# SQL Server Connection Troubleshooting

## Current Error
```
Login failed for user 'sa'
```

## Possible Causes & Solutions

### 1. SQL Server Not Running
**Check:**
- Press `Win + R`
- Type `services.msc` and press Enter
- Look for "SQL Server (MSSQLSERVER)" or "SQL Server (SQLEXPRESS)"
- Status should be "Running"

**Fix:**
- If stopped, right-click → Start
- Wait for it to start (takes 30-60 seconds)

### 2. Wrong Password
**Check:**
- Open your `.env` file
- Verify `DB_PASSWORD` matches your SQL Server 'sa' password

**Fix:**
- Update the password in `.env` file
- Or reset SQL Server 'sa' password (see below)

### 3. SQL Server Authentication Not Enabled
**Check:**
- SQL Server might only allow Windows Authentication

**Fix:**
1. Open **SQL Server Management Studio (SSMS)**
2. Connect using **Windows Authentication**
3. Right-click server name → **Properties**
4. Go to **Security** tab
5. Select **"SQL Server and Windows Authentication mode"**
6. Click **OK**
7. **Restart SQL Server service** (services.msc)

### 4. 'sa' Account Disabled or Locked
**Check:**
- The 'sa' account might be disabled

**Fix:**
1. Open SSMS (Windows Authentication)
2. Expand **Security** → **Logins**
3. Right-click **sa** → **Properties**
4. Go to **Status** tab
5. Set **Login: Enabled**
6. Uncheck **"Login is locked out"** if checked
7. Click **OK**

### 5. Reset 'sa' Password
**If you forgot the password:**

1. Open SSMS (Windows Authentication)
2. Expand **Security** → **Logins**
3. Right-click **sa** → **Properties**
4. Go to **General** tab
5. Enter new password in **Password** and **Confirm password**
6. Uncheck **"Enforce password policy"** (optional)
7. Go to **Status** tab → Enable login
8. Click **OK**

### 6. Use Windows Authentication Instead
**If you can't get 'sa' working:**

Update your `.env` file:
```env
DB_USER=YourWindowsUsername
DB_PASSWORD=
```

Or use Integrated Security (update `server/config/database.js`):
```javascript
const sequelize = new Sequelize(
  process.env.DB_NAME || 'Biz',
  null, // No username
  null, // No password
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mssql',
    dialectOptions: {
      options: {
        trustedConnection: true, // Use Windows Authentication
        encrypt: false
      }
    }
  }
);
```

## Test Connection

After fixing the issue, test:
```powershell
cd D:\Personal\Biz\server
node scripts/init-database.js
```

## Quick Test in SSMS

1. Open SQL Server Management Studio
2. Try connecting with:
   - **Server name:** `localhost` or `.\SQLEXPRESS`
   - **Authentication:** SQL Server Authentication
   - **Login:** `sa`
   - **Password:** (your password)

If this works in SSMS, it should work in the app.

## Alternative: Use SQL Server Express LocalDB

If you have SQL Server Express LocalDB installed:

Update `.env`:
```env
DB_HOST=(localdb)\MSSQLLocalDB
DB_PORT=1433
DB_NAME=Biz
DB_USER=
DB_PASSWORD=
```

And update `server/config/database.js` to use Windows Authentication.

## Still Having Issues?

1. Check SQL Server error logs:
   - `C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\Log\ERRORLOG`
   
2. Verify SQL Server is listening on port 1433:
   ```powershell
   netstat -an | findstr 1433
   ```

3. Check Windows Firewall isn't blocking SQL Server

4. Try connecting with `sqlcmd`:
   ```powershell
   sqlcmd -S localhost -U sa -P YourPassword
   ```

