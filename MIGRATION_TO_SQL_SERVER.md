# Migration from MongoDB to SQL Server

## Overview
This document outlines the migration from MongoDB (Mongoose) to SQL Server (Sequelize).

## Prerequisites

1. **SQL Server Installation**
   - Install SQL Server (Express edition is free for development)
   - Or use Azure SQL Database
   - Download: https://www.microsoft.com/en-us/sql-server/sql-server-downloads

2. **Create Database**
   ```sql
   CREATE DATABASE bizease;
   ```

3. **Environment Variables**
   Update your `.env` file:
   ```env
   # Remove MongoDB
   # MONGO_URI=mongodb://...

   # Add SQL Server
   DB_HOST=localhost
   DB_PORT=1433
   DB_NAME=bizease
   DB_USER=sa
   DB_PASSWORD=YourPassword
   DB_ENCRYPT=true
   DB_TRUST_CERT=false
   ```

## Migration Steps

### 1. Install Dependencies
```bash
cd server
npm install sequelize tedious
```

### 2. Database Connection
- File: `server/config/database.js`
- Uses Sequelize with SQL Server dialect

### 3. Model Conversion
All Mongoose models converted to Sequelize:
- `models/User.js`
- `models/Invoice.js`
- `models/Employee.js`
- `models/Expense.js`
- `models/InventoryItem.js`
- `models/Sale.js`

### 4. Route Updates
All routes updated to use Sequelize:
- `routes/invoiceRoutes.js`
- `routes/employeeRoutes.js`
- `routes/expenseRoutes.js`
- `routes/inventoryRoutes.js`
- `routes/dashboardRoutes.js`
- `routes/authRoutes.js`

### 5. Middleware Updates
- `server/middleware/authMiddleware.js` - Updated to use Sequelize

### 6. Server Updates
- `server/index.js` - Updated connection logic

## Key Differences

### MongoDB (Mongoose) → SQL Server (Sequelize)

1. **Connection**
   - MongoDB: `mongoose.connect(uri)`
   - SQL Server: `sequelize.authenticate()`

2. **Models**
   - MongoDB: `mongoose.Schema()` and `mongoose.model()`
   - SQL Server: `sequelize.define()`

3. **Queries**
   - MongoDB: `Model.find()`, `Model.create()`, `Model.findById()`
   - SQL Server: `Model.findAll()`, `Model.create()`, `Model.findByPk()`

4. **Data Types**
   - MongoDB: Flexible schema, ObjectId references
   - SQL Server: Strict schema, Foreign Key references

5. **Nested Objects**
   - MongoDB: Embedded documents (arrays of objects)
   - SQL Server: Separate tables with foreign keys

## Schema Changes

### Invoice Items
- **MongoDB**: Embedded array in Invoice document
- **SQL Server**: Separate `InvoiceItems` table with `invoiceId` foreign key

### Sale Items
- **MongoDB**: Embedded array in Sale document
- **SQL Server**: Separate `SaleItems` table with `saleId` foreign key

### CreatedBy Fields
- **MongoDB**: Embedded object `{ uid, displayName, email }`
- **SQL Server**: Separate columns `createdByUid`, `createdByDisplayName`, `createdByEmail`

## Running Migrations

After models are created, Sequelize will auto-create tables on first connection:
```javascript
await sequelize.sync({ alter: true }); // Creates/updates tables
```

Or use migrations:
```bash
npx sequelize-cli init
npx sequelize-cli migration:generate --name create-tables
```

## Testing

1. Start SQL Server
2. Create database: `CREATE DATABASE bizease;`
3. Update `.env` with SQL Server credentials
4. Start server: `npm run dev`
5. Tables will be created automatically

## Rollback

If you need to rollback to MongoDB:
1. Restore original model files
2. Restore original route files
3. Update `.env` to use `MONGO_URI`
4. Reinstall: `npm install mongoose`

