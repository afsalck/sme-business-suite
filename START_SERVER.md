# How to Start the Server

## Quick Start

The server must be running for the Employee page (and all other pages) to work.

### Option 1: Start Server Only
```powershell
cd D:\Personal\Biz\server
npm run dev
```

### Option 2: Start Both Server and Client
```powershell
cd D:\Personal\Biz
npm start
```

## Verify Server is Running

After starting, you should see:
```
✓ Connected to MongoDB
✓ Employee routes loaded
Server listening on port 5004
```

## Test Server Connection

Open your browser and go to:
```
http://localhost:5004/health
```

You should see a JSON response with server status.

## Troubleshooting

1. **Port 5004 already in use:**
   - The server will automatically try to kill the process
   - If it fails, manually kill it:
     ```powershell
     netstat -ano | findstr :5004
     taskkill /PID <PID_NUMBER> /F
     ```

2. **MongoDB connection issues:**
   - Check your `.env` file in the root directory
   - Make sure `MONGO_URI` is set correctly
   - Check MongoDB Atlas connection string

3. **Module not found errors:**
   - Make sure dependencies are installed:
     ```powershell
     cd D:\Personal\Biz\server
     npm install
     ```

## Current Status

- **Server Port:** 5004
- **API Base URL:** http://localhost:5004/api
- **Health Check:** http://localhost:5004/health

