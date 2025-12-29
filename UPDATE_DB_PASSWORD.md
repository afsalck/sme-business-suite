# Update SQL Server Password

## Quick Update Method

### Option 1: Manual Edit (Recommended)
1. Open the file: `D:\Personal\Biz\.env`
2. Find the line: `DB_PASSWORD=old_password`
3. Change it to: `DB_PASSWORD=your_new_password`
4. Save the file
5. **Restart your server** (stop and start again)

### Option 2: Using PowerShell Script
1. Run this command in PowerShell (from the project root):
   ```powershell
   .\update_db_password.ps1 "your_new_password_here"
   ```
2. Restart your server

### Option 3: Direct PowerShell Command
```powershell
# Navigate to project root
cd D:\Personal\Biz

# Update the password (replace 'YourNewPassword' with your actual password)
$content = Get-Content .env
$content = $content | ForEach-Object {
    if ($_ -match '^DB_PASSWORD=') {
        "DB_PASSWORD=YourNewPassword"
    } else {
        $_
    }
}
$content | Set-Content .env

# Restart your server!
```

## Current Configuration
Based on your `.env` file:
- **DB_HOST**: Afsal-PC
- **DB_USER**: sa
- **DB_PORT**: 1433
- **DB_NAME**: Biz
- **DB_PASSWORD**: (needs to be updated)

## After Updating

1. **Save the .env file**
2. **Stop your server** (Ctrl+C in the terminal)
3. **Start your server again**: `cd server && npm run dev`

The server will read the new password from the `.env` file on startup.

## Verify Connection

After restarting, you should see:
```
✅ SQL Server connection established successfully.
```

Instead of:
```
❌ [Auth] SQL Server not connected: Login failed for user 'sa'.
```
