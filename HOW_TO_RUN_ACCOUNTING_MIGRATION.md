# How to Run Accounting Module Migration

## Step-by-Step Instructions

### Option 1: Using SQL Server Management Studio (SSMS) - Recommended

1. **Open SQL Server Management Studio (SSMS)**
   - If you don't have it, download from: https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms

2. **Connect to Your Database**
   - Server name: Your SQL Server instance (e.g., `localhost`, `localhost\SQLEXPRESS`, or your server name)
   - Authentication: Windows Authentication or SQL Server Authentication
   - Click "Connect"

3. **Open the Migration Script**
   - In SSMS, go to: `File` → `Open` → `File...`
   - Navigate to: `D:\Personal\Biz\server\create-accounting-module.sql`
   - Click "Open"

4. **Select the Correct Database**
   - In the toolbar, find the database dropdown (usually shows "master" by default)
   - Select your database: `Biz` (or whatever your database name is)
   - **Important:** Make sure you're connected to the correct database!

5. **Execute the Script**
   - Press `F5` or click the "Execute" button (green play icon)
   - Wait for the script to complete

6. **Verify Success**
   - You should see messages like:
     ```
     Chart of Accounts table created successfully
     Journal Entries table created successfully
     Journal Entry Lines table created successfully
     General Ledger table created successfully
     Financial Periods table created successfully
     Default Chart of Accounts inserted successfully
     Current financial period created
     ========================================
     Accounting Module Migration Complete!
     ========================================
     ```

### Option 2: Using Azure Data Studio

1. **Open Azure Data Studio**
   - Download if needed: https://aka.ms/azuredatastudio

2. **Connect to Database**
   - Click "New Connection"
   - Enter your server details
   - Select your database

3. **Open Script**
   - `File` → `Open File...`
   - Select: `server\create-accounting-module.sql`

4. **Run Script**
   - Click "Run" button or press `F5`

### Option 3: Using Command Line (sqlcmd)

1. **Open Command Prompt or PowerShell**
   - Navigate to your project directory:
     ```powershell
     cd D:\Personal\Biz
     ```

2. **Run sqlcmd**
   ```powershell
   sqlcmd -S localhost -d Biz -i server\create-accounting-module.sql
   ```
   
   Replace:
   - `localhost` with your SQL Server instance name
   - `Biz` with your database name
   - Use `-U username -P password` if using SQL Authentication

3. **Check Output**
   - You should see success messages

### Option 4: Using Node.js Script (Alternative)

If you prefer to run it programmatically, you can create a simple Node.js script:

```javascript
// run-accounting-migration.js
const { sequelize } = require('./server/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'server', 'create-accounting-module.sql'),
      'utf8'
    );
    
    // Split by GO statements
    const statements = sql.split(/\bGO\b/gi).filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await sequelize.query(statement);
        console.log('✓ Executed statement');
      }
    }
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
```

Then run:
```powershell
node run-accounting-migration.js
```

## Verify Migration Success

After running the migration, verify the tables were created:

### Using SSMS:

1. **Expand Your Database** in Object Explorer
2. **Expand "Tables"**
3. **Look for these tables:**
   - `dbo.chart_of_accounts`
   - `dbo.journal_entries`
   - `dbo.journal_entry_lines`
   - `dbo.general_ledger`
   - `dbo.financial_periods`

### Using SQL Query:

Run this query in SSMS:

```sql
SELECT 
    TABLE_NAME,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = t.TABLE_NAME) as COLUMN_COUNT
FROM INFORMATION_SCHEMA.TABLES t
WHERE TABLE_SCHEMA = 'dbo'
    AND TABLE_NAME IN (
        'chart_of_accounts', 
        'journal_entries', 
        'journal_entry_lines', 
        'general_ledger', 
        'financial_periods'
    )
ORDER BY TABLE_NAME;
```

You should see all 5 tables listed.

### Verify Default Accounts:

```sql
SELECT COUNT(*) as AccountCount 
FROM chart_of_accounts;
```

Should return a number greater than 0 (default accounts were inserted).

## Troubleshooting

### Error: "Database does not exist"
- Make sure you're connected to the correct database
- Check your database name in `.env` file
- Create the database first if it doesn't exist

### Error: "Table already exists"
- The tables might have been created already
- Check if tables exist using the verification query above
- If you want to recreate, you'll need to drop existing tables first (be careful!)

### Error: "Permission denied"
- Make sure your SQL Server user has CREATE TABLE permissions
- Try running as a user with `db_owner` role

### Error: "Cannot find the object"
- Make sure you're connected to the correct database
- Check that the database name matches your `.env` file

### Script Runs But No Tables Created
- Check for error messages in the output
- Verify you selected the correct database before running
- Check SQL Server error log

## What the Migration Does

1. **Creates 5 Tables:**
   - `chart_of_accounts` - Your account structure
   - `journal_entries` - Transaction records
   - `journal_entry_lines` - Double-entry lines
   - `general_ledger` - Immutable ledger entries
   - `financial_periods` - Period management

2. **Inserts Default Chart of Accounts:**
   - Assets (1000-1999)
   - Liabilities (2000-2999)
   - Equity (3000-3999)
   - Revenue (4000-4999)
   - Expenses (5000-5999)

3. **Creates Current Financial Period:**
   - Sets up the current year as an open period

## After Migration

Once the migration is complete:

1. **Restart your Node.js server** (if it's running)
2. **Log in to your application** as admin or accountant
3. **Navigate to Accounting** in the sidebar
4. **View Chart of Accounts** to see the default accounts
5. **Create a test journal entry** to verify everything works

## Need Help?

If you encounter any issues:
1. Check the error message carefully
2. Verify your database connection settings in `.env`
3. Make sure SQL Server is running
4. Check that you have the correct permissions

---

**Recommended Method:** Use SQL Server Management Studio (SSMS) - it's the easiest and most reliable way.

