# SQL Server Migration Guide

## Overview
This application has been migrated from MongoDB to SQL Server using Sequelize ORM.

## Setup Instructions

### 1. Update .env File

Add the following SQL Server connection variables to your `.env` file in the root directory:

```env
# SQL Server Configuration
DB_HOST=localhost
DB_PORT=1433
DB_NAME=bizease
DB_USER=sa
DB_PASSWORD=YourPasswordHere
DB_ENCRYPT=false
DB_TRUST_CERT=true
```

**For Local SQL Server:**
- `DB_HOST`: Usually `localhost` or `127.0.0.1`
- `DB_PORT`: Default is `1433`
- `DB_NAME`: Your database name (e.g., `bizease`)
- `DB_USER`: SQL Server username (e.g., `sa` for SQL Authentication)
- `DB_PASSWORD`: SQL Server password
- `DB_ENCRYPT`: Set to `false` for local SQL Server
- `DB_TRUST_CERT`: Set to `true` for local SQL Server

**For Azure SQL Database:**
- `DB_HOST`: Your Azure SQL server (e.g., `yourserver.database.windows.net`)
- `DB_PORT`: Usually `1433`
- `DB_NAME`: Your database name
- `DB_USER`: Your Azure SQL username
- `DB_PASSWORD`: Your Azure SQL password
- `DB_ENCRYPT`: Set to `true` for Azure
- `DB_TRUST_CERT`: Set to `false` for Azure (uses proper certificates)

### 2. Create Database

If you haven't created the database yet, connect to SQL Server and run:

```sql
CREATE DATABASE bizease;
```

### 3. Initialize Database Tables

Run the initialization script to create all tables:

```powershell
cd D:\Personal\Biz\server
node scripts/init-database.js
```

This will:
- Connect to SQL Server
- Create all necessary tables (users, employees, invoices, expenses, sales, inventoryItems)
- Set up proper relationships and constraints

### 4. Start the Server

```powershell
cd D:\Personal\Biz\server
npm run dev
```

## What Changed

### Models
- All Mongoose models converted to Sequelize models
- Models are in `models/` directory
- Database configuration in `server/config/database.js`

### Routes
- All routes updated to use Sequelize queries
- Connection checks use `sequelize.authenticate()`
- Queries use Sequelize methods (`findAll`, `findByPk`, `create`, `update`, `destroy`)

### Authentication
- `authMiddleware.js` updated to use Sequelize
- User lookup and creation use Sequelize

### Server
- `server/index.js` updated to connect to SQL Server instead of MongoDB
- Health check endpoint shows SQL Server status

## Troubleshooting

### Connection Issues

1. **"Cannot connect to SQL Server"**
   - Verify SQL Server is running
   - Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` in `.env`
   - Ensure SQL Server allows TCP/IP connections
   - Check Windows Firewall settings

2. **"Login failed for user"**
   - Verify username and password are correct
   - Check if SQL Server Authentication is enabled (not just Windows Auth)
   - For local SQL Server, ensure mixed mode authentication is enabled

3. **"Database does not exist"**
   - Create the database manually: `CREATE DATABASE bizease;`
   - Or update `DB_NAME` in `.env` to an existing database

### Table Creation Issues

If tables aren't created automatically:
1. Run `node server/scripts/init-database.js` manually
2. Check SQL Server permissions - user needs `CREATE TABLE` permission
3. Verify database name is correct

## Benefits of SQL Server

- **Faster queries**: No more timeout issues
- **Reliable connections**: Local database is always available
- **Better performance**: Optimized for relational data
- **Transaction support**: ACID compliance
- **Familiar SQL**: Easy to query and debug

## Next Steps

1. Update your `.env` file with SQL Server credentials
2. Create the database if needed
3. Run the initialization script
4. Start the server
5. Test the application

