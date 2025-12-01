# 🔧 Fix ERR_NETWORK Error

## ❌ Problem

**Error:** `ERR_NETWORK` / `AxiosError`

**Cause:** The server is **not running** on port 5004.

## ✅ Solution

### Step 1: Start the Server

1. **Open a new terminal/PowerShell window**

2. **Navigate to server directory:**
   ```powershell
   cd D:\Personal\Biz\server
   ```

3. **Start the server:**
   ```powershell
   npm run dev
   ```

4. **Wait for this message:**
   ```
   ✅ SQL Server connection established successfully.
   Server running on port 5004
   ```

### Step 2: Verify Server is Running

**Test the health endpoint:**
```powershell
curl http://localhost:5004/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "...",
  "database": {
    "type": "SQL Server",
    "state": "connected",
    "ping": 10
  }
}
```

### Step 3: Refresh Your Frontend

1. **Go back to your browser**
2. **Refresh the Dashboard page** (F5)
3. **The ERR_NETWORK error should be gone!**

## 🔍 How to Check if Server is Running

### Method 1: Check Port
```powershell
netstat -ano | findstr ":5004"
```

**If server is running, you'll see:**
```
TCP    0.0.0.0:5004           0.0.0.0:0              LISTENING       12345
```

**If server is NOT running, you'll see nothing.**

### Method 2: Test Health Endpoint
```powershell
curl http://localhost:5004/health
```

**If server is running:** JSON response with server status
**If server is NOT running:** "Unable to connect to the remote server"

## 🚨 Common Issues

### Issue 1: Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::5004`

**Fix:**
1. Find and kill the process:
   ```powershell
   netstat -ano | findstr ":5004"
   taskkill /F /PID <PID_NUMBER>
   ```
2. Restart the server

### Issue 2: SQL Server Not Connected

**Error:** `❌ Unable to connect to SQL Server`

**Fix:**
1. Check your `.env` file in the root directory
2. Verify SQL Server is running
3. Check database credentials

### Issue 3: Server Crashed

**Check server terminal for errors:**
- Look for red error messages
- Check if server stopped unexpectedly
- Restart the server

## 📋 Quick Checklist

- [ ] Server terminal is open
- [ ] Server is running (`npm run dev` in server directory)
- [ ] See "Server running on port 5004" message
- [ ] Health endpoint works: `curl http://localhost:5004/health`
- [ ] Frontend is running (`npm start` in client directory)
- [ ] Browser refreshed

## 🎯 Expected Result

After starting the server:
- ✅ No more ERR_NETWORK errors
- ✅ Dashboard loads successfully
- ✅ API requests work
- ✅ Data displays correctly

## 💡 Pro Tip

**Keep both terminals open:**
1. **Terminal 1:** Server (`cd server && npm run dev`)
2. **Terminal 2:** Client (`cd client && npm start`)

This way you can see logs from both!

