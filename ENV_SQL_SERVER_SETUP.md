# SQL Server .env Configuration Guide

## Current Status

Your `.env` file currently has:
- ✅ `PORT=5004`
- ✅ `MONGO_URI=...` (MongoDB - can be kept for reference)
- ✅ `FIREBASE_SERVICE_ACCOUNT=...`

## Missing SQL Server Configuration

You need to add these variables to your `.env` file:

```env
# SQL Server Configuration
DB_HOST=localhost
DB_PORT=1433
DB_NAME=bizease
DB_USER=sa
DB_PASSWORD=YourActualSQLServerPassword
DB_ENCRYPT=false
DB_TRUST_CERT=true
```

## How to Add

### Option 1: Manual Edit
1. Open `D:\Personal\Biz\.env` in a text editor
2. Add the SQL Server configuration lines above
3. Replace `YourActualSQLServerPassword` with your real SQL Server password
4. Save the file

### Option 2: Using PowerShell
```powershell
cd D:\Personal\Biz
Add-Content .env "`n# SQL Server Configuration"
Add-Content .env "DB_HOST=localhost"
Add-Content .env "DB_PORT=1433"
Add-Content .env "DB_NAME=bizease"
Add-Content .env "DB_USER=sa"
Add-Content .env "DB_PASSWORD=YourActualSQLServerPassword"
Add-Content .env "DB_ENCRYPT=false"
Add-Content .env "DB_TRUST_CERT=true"
```

**Important:** Replace `YourActualSQLServerPassword` with your actual SQL Server password!

## Configuration Details

### For Local SQL Server:
- `DB_HOST=localhost` - Your SQL Server instance (usually `localhost` or `127.0.0.1`)
- `DB_PORT=1433` - Default SQL Server port
- `DB_NAME=bizease` - Database name (will be created if it doesn't exist)
- `DB_USER=sa` - SQL Server username (or your Windows username for Windows Auth)
- `DB_PASSWORD=...` - Your SQL Server password
- `DB_ENCRYPT=false` - Set to `false` for local SQL Server
- `DB_TRUST_CERT=true` - Set to `true` for local SQL Server

### For Azure SQL Database:
- `DB_HOST=yourserver.database.windows.net`
- `DB_PORT=1433`
- `DB_NAME=yourdatabase`
- `DB_USER=yourusername`
- `DB_PASSWORD=yourpassword`
- `DB_ENCRYPT=true`
- `DB_TRUST_CERT=false`

## Verify Configuration

After adding the variables, run:

```powershell
cd D:\Personal\Biz\server
node verify-sql-config.js
```

This will verify that all required variables are present and correctly formatted.

## Next Steps

1. ✅ Add SQL Server variables to `.env`
2. ✅ Verify configuration: `node server/verify-sql-config.js`
3. ✅ Create database: `CREATE DATABASE bizease;` (in SQL Server)
4. ✅ Initialize tables: `node server/scripts/init-database.js`
5. ✅ Start server: `npm run dev`

## Common Issues

### "Cannot connect to SQL Server"
- Check if SQL Server is running (Windows Services)
- Verify `DB_HOST` and `DB_PORT` are correct
- Ensure TCP/IP is enabled in SQL Server Configuration Manager

### "Login failed for user"
- Verify `DB_USER` and `DB_PASSWORD` are correct
- Check if SQL Server Authentication is enabled (not just Windows Auth)
- For local SQL Server, enable Mixed Mode Authentication

### "Database does not exist"
- Create it manually: `CREATE DATABASE bizease;`
- Or update `DB_NAME` to an existing database

