# Quick API Test Guide

## ✅ Good News: Your Server is Working!

The "Unauthorized: missing token" message means:
- ✅ Server is running
- ✅ API is working
- ✅ Security is enabled (as it should be)

## 🔐 Why You See This Error

All `/api/*` endpoints require Firebase authentication. This is **by design** for security.

## 🧪 How to Test Properly

### Option 1: Use the Frontend (Easiest)

1. **Start the frontend:**
   ```powershell
   cd D:\Personal\Biz\client
   npm start
   ```

2. **Open browser:** `http://localhost:3000`

3. **Log in with Firebase**

4. **Use the app** - All API calls work automatically!

### Option 2: Test Health Endpoint (No Auth Needed)

```powershell
curl http://localhost:5004/health
```

This should return:
```json
{
  "status": "ok",
  "timestamp": "...",
  "database": {
    "type": "SQL Server",
    "state": "connected",
    "ping": "..."
  }
}
```

### Option 3: Test from Browser Console (After Login)

1. Log in to your app: `http://localhost:3000`
2. Open browser console (F12)
3. Run:
```javascript
// Get your Firebase token
const user = firebase.auth().currentUser;
if (user) {
  const token = await user.getIdToken();
  console.log('Token:', token);
  
  // Test API
  fetch('http://localhost:5004/api/dashboard/metrics', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(r => r.json())
  .then(data => console.log('✅ Success:', data))
  .catch(err => console.error('❌ Error:', err));
}
```

## 📋 What Endpoints Need Authentication

### ❌ Requires Token:
- `GET /api/dashboard/metrics`
- `GET /api/employees`
- `POST /api/employees`
- `GET /api/invoices`
- `POST /api/invoices`
- All `/api/*` endpoints

### ✅ No Token Needed:
- `GET /health` - Server health check

## 🎯 Summary

- **"Unauthorized: missing token"** = Server is working correctly!
- **Use the frontend** to test - it handles authentication automatically
- **Database is ready** - Tables are created, data will save!

## 🚀 Next Steps

1. Start frontend: `cd client && npm start`
2. Log in with Firebase
3. Create employees, invoices, etc.
4. Data will save to SQL Server automatically!

The error you're seeing is **normal and expected** - it means your security is working! 🔒

