# Fix API Port Mismatch

## Problem
- Server is running on **port 5000**
- Client expects **port 5004**
- API calls fail because of port mismatch

## Solution

### Step 1: Stop the Current Server
In the terminal where the server is running:
- Press `Ctrl + C` to stop it

### Step 2: Restart the Server
```powershell
cd D:\Personal\Biz\server
npm run dev
```

The server will now start on **port 5004** (from .env file).

### Step 3: Verify
```powershell
curl http://localhost:5004/health
```

Should return:
```json
{
  "status": "ok",
  "database": {
    "type": "SQL Server",
    "state": "connected"
  }
}
```

## Configuration Summary

✅ **Server .env:** `PORT=5004`  
✅ **Client .env:** `REACT_APP_API_BASE_URL=http://localhost:5004/api`  
✅ **apiClient.js:** Defaults to `http://localhost:5004/api`

## After Restart

1. Server will be on port 5004
2. Client will connect to port 5004
3. API will work correctly!

## Test the API

### From Browser (After Login):
- Open: `http://localhost:3000`
- Log in with Firebase
- API calls will work automatically

### From Command Line:
```powershell
# Health check (no auth needed)
curl http://localhost:5004/health

# API endpoints (need Firebase token)
# Use the frontend instead - it handles tokens automatically
```

## Summary

- ✅ Port configuration fixed
- ✅ SQL Server connected
- ✅ Tables created
- 🔄 **Just restart the server** to apply port change

The API will work once the server restarts on port 5004!

