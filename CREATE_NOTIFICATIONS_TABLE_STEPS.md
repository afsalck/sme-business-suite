# Create Notifications Table - Step by Step

## The Problem
You're seeing this error: `"Invalid object name 'dbo.notifications'."`

This means the `notifications` table doesn't exist in your database yet.

## Solution: Run the SQL Script

### Option 1: Using SQL Server Management Studio (SSMS)

1. **Open SQL Server Management Studio**
2. **Connect to your database server** (the same one your app uses)
3. **Open a New Query window**
4. **Copy the entire contents** of `server/create-notifications-table.sql`
5. **Paste it into the query window**
6. **Click Execute** (or press F5)
7. **You should see**: `Notifications table created successfully`

### Option 2: Using Azure Data Studio

1. **Open Azure Data Studio**
2. **Connect to your database**
3. **Open a new query** (Ctrl+N)
4. **Copy and paste** the SQL from `server/create-notifications-table.sql`
5. **Run the query** (F5)
6. **Check the Messages tab** for success message

### Option 3: Using Command Line (sqlcmd)

```powershell
# Make sure sqlcmd is in your PATH
sqlcmd -S localhost -d Biz -U sa -P "YourPassword" -i server\create-notifications-table.sql
```

## Verify the Table Was Created

Run this SQL query to verify:

```sql
USE [Biz];
GO

-- Check if table exists
SELECT 
    TABLE_NAME,
    TABLE_SCHEMA
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = 'notifications';

-- If it exists, show structure
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'notifications'
ORDER BY ORDINAL_POSITION;
```

Or use the verification script:
```sql
-- Run: server/verify-notifications-table.sql
```

## After Creating the Table

1. **Restart your Node.js server** (if it's running)
2. **Refresh your browser**
3. **The notification bell should work** without errors
4. **Test notifications** using the browser console code from `TEST_NOTIFICATIONS_BROWSER.md`

## Troubleshooting

### "Database 'Biz' does not exist"
- Replace `[Biz]` with your actual database name in the SQL script
- Check your `.env` file for `DB_NAME`

### "Permission denied"
- Make sure you're using a user with CREATE TABLE permissions
- Try using `sa` account or a user with `db_owner` role

### "Table already exists" message
- This is fine! The script checks before creating
- If you see this, the table should already be there
- Run the verification query above to confirm

### Still seeing errors after creating table
- Make sure you're connected to the **same database** your app uses
- Check your `.env` file: `DB_NAME` should match
- Restart your Node.js server
- Clear browser cache and refresh

## Quick Test After Creation

Once the table is created, test it:

```javascript
// In browser console (F12)
window.auth.currentUser?.getIdToken(true).then(token => 
  fetch('http://localhost:5004/api/notifications/unread-count', {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(r => r.json()).then(d => console.log('Unread count:', d))
);
```

You should see: `{ count: 0 }` (or a number if notifications exist)

