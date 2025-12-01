# How to Update Database Name to "bizease"

## Overview
Your database name is specified in the MongoDB connection string (`MONGO_URI`). To change it from "biz" to "bizease", you need to update your `.env` file.

## Step-by-Step Instructions

### 1. Locate Your `.env` File
The `.env` file should be in the root directory:
```
D:\Personal\Biz\.env
```

### 2. Find the MONGO_URI
Your `MONGO_URI` should look something like this:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/biz?retryWrites=true&w=majority
```

### 3. Update the Database Name
Change the database name from `biz` to `bizease`:

**Before:**
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/biz?retryWrites=true&w=majority
```

**After:**
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/bizease?retryWrites=true&w=majority
```

### 4. Save the File
Save the `.env` file after making the change.

### 5. Restart Your Server
Restart your server for the changes to take effect:
```powershell
# Stop the current server (Ctrl+C)
# Then restart:
cd D:\Personal\Biz\server
npm run dev
```

## Verify the Change

### Option 1: Check Server Logs
When the server starts, you should see:
```
✅ Connected to MongoDB successfully
   Database: bizease
   ReadyState: 1 (1 = connected)
```

### Option 2: Test Connection
Run the test script:
```powershell
cd D:\Personal\Biz\server
node test-mongodb-connection.js
```

You should see:
```
✅ Successfully connected to MongoDB!
   Database: bizease
```

### Option 3: Check Health Endpoint
Visit: `http://localhost:5004/health`

The response should show the database connection status.

## Important Notes

1. **Database Must Exist**: Make sure the `bizease` database exists in MongoDB Atlas. If it doesn't:
   - MongoDB will create it automatically when you first insert data
   - OR create it manually in MongoDB Atlas

2. **Existing Data**: If you have data in the old `biz` database:
   - You can migrate it to `bizease`
   - OR keep using `biz` if you prefer
   - The database name doesn't affect existing collections

3. **Connection String Format**:
   ```
   mongodb+srv://[username]:[password]@[cluster]/[database-name]?[options]
   ```
   The database name is the part after the last `/` and before the `?`

## Troubleshooting

### "Database not found"
- MongoDB will create the database automatically on first use
- Or create it manually in MongoDB Atlas

### "Connection failed"
- Check your `MONGO_URI` format
- Make sure there are no extra spaces
- Verify your username and password are correct

### "Still connecting to old database"
- Make sure you saved the `.env` file
- Restart the server completely
- Check that you're editing the correct `.env` file (root directory, not server/.env)

## Current Configuration

- **Database Name**: `bizease`
- **Connection String**: Set in `.env` file as `MONGO_URI`
- **Location**: `D:\Personal\Biz\.env`

