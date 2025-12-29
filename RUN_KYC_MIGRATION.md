# How to Run KYC/AML Database Migration

## Quick Instructions

The KYC/AML module requires database tables to be created. Run the migration script:

### Option 1: SQL Server Management Studio (Recommended)

1. Open **SQL Server Management Studio (SSMS)**
2. Connect to your SQL Server instance
3. Select the **Biz** database
4. Open the file: `server/create-kyc-aml-module.sql`
5. Click **Execute** (or press F5)

### Option 2: Command Line (sqlcmd)

```bash
# Replace with your actual server name
sqlcmd -S localhost -d Biz -i server/create-kyc-aml-module.sql
```

Or if you need authentication:
```bash
sqlcmd -S localhost -d Biz -U your_username -P your_password -i server/create-kyc-aml-module.sql
```

### Option 3: Azure Data Studio

1. Open **Azure Data Studio**
2. Connect to your SQL Server
3. Select the **Biz** database
4. Open `server/create-kyc-aml-module.sql`
5. Click **Run**

## What This Creates

The migration script creates 4 tables:
- `clients` - Client profiles and KYC status
- `kyc_documents` - Document storage and verification
- `aml_screenings` - AML screening records
- `kyc_audit_log` - Complete audit trail

## Verification

After running the migration, you can verify by:

1. Check the server console - it should no longer show "Table not found" errors
2. Try creating a client again in the UI
3. Or run this SQL query:
   ```sql
   SELECT COUNT(*) FROM [dbo].[clients]
   ```

## Troubleshooting

**Error: "Database does not exist"**
- Make sure you're connected to the correct database (Biz)

**Error: "Permission denied"**
- Make sure your SQL user has CREATE TABLE permissions

**Error: "Table already exists"**
- The script uses `IF NOT EXISTS`, so it's safe to run multiple times
- If you get this error, the tables are already created

