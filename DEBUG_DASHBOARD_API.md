# 🐛 Debug Dashboard API - Complete Guide

## 📍 API Endpoint

**Dashboard Metrics Endpoint:**
```
GET http://localhost:5004/api/dashboard/metrics
```

**Full Request Flow:**
1. Frontend: `DashboardPage.js` calls `apiClient.get("/dashboard/metrics")`
2. API Client: Adds base URL → `http://localhost:5004/api/dashboard/metrics`
3. Server: `verifyFirebaseToken` middleware checks authentication
4. Server: `routes/dashboardRoutes.js` handles the request
5. Server: Returns metrics data

## 🔍 How to Debug

### Step 1: Open Browser Developer Tools

1. **Open your frontend** in the browser
2. **Press F12** to open Developer Tools
3. **Go to Console tab** - You'll see detailed logs

### Step 2: Check Server Logs

Open your **server terminal** and watch for logs when you load the dashboard.

### Step 3: What to Look For

#### ✅ Success Flow (What You Should See)

**Browser Console:**
```
============================================================
🟢 [DASHBOARD PAGE] Starting to load metrics...
   API Base URL: http://localhost:5004/api
   Endpoint: /dashboard/metrics
   Full URL: http://localhost:5004/api/dashboard/metrics
   [DASHBOARD PAGE] Making API request...
[API Request] GET http://localhost:5004/api/dashboard/metrics
[API Request] Token attached for your-email@example.com
[API Response] GET /dashboard/metrics - 200
   [DASHBOARD PAGE] ✅ API request successful!
   [DASHBOARD PAGE] Response data: {totals: {...}, charts: {...}}
============================================================
```

**Server Console:**
```
============================================================
🔐 [AUTH] GET /api/dashboard/metrics
   [AUTH] Request path: /dashboard/metrics
   [AUTH] Original URL: /api/dashboard/metrics
   [AUTH] Token present: Yes (length: 1234)
   [AUTH] Verifying Firebase token...
   [AUTH] ✅ Token verified for user: your-email@example.com
   [AUTH] ✅ User authenticated: your-email@example.com (role: staff)
============================================================
============================================================
🔵 [DASHBOARD] GET /metrics endpoint called
   Request URL: /api/dashboard/metrics
   Request Method: GET
   User: { uid: '...', email: '...', role: 'staff' }
   [DASHBOARD] Checking database connection...
   [DASHBOARD] ✅ Database connected
   [DASHBOARD] ✅ Metrics calculated successfully
   [DASHBOARD] Response data: {...}
============================================================
```

#### ❌ Error Scenarios

### Error 1: 404 Not Found

**Browser Console:**
```
[API Error] GET /dashboard/metrics - Status: 404
```

**Server Console:**
```
404 - Route not found: GET /api/dashboard/metrics
Available routes: /api/auth, /api/invoices, /api/employees, /api/inventory, /api/expenses, /api/dashboard
```

**Fix:** Server needs restart to load the dashboard route.

### Error 2: 401 Unauthorized

**Browser Console:**
```
[API Error] GET /dashboard/metrics - Status: 401
Unauthorized: Please log in again
```

**Server Console:**
```
🔐 [AUTH] GET /api/dashboard/metrics
   [AUTH] Token present: No
   [AUTH] ❌ No token provided
```

**Fix:** User needs to log in again. Token expired or missing.

### Error 3: 500 Server Error

**Browser Console:**
```
[API Error] GET /dashboard/metrics - Status: 500
```

**Server Console:**
```
❌ [DASHBOARD] Error in metrics endpoint:
   Error message: ...
   Error stack: ...
```

**Fix:** Check the error message in server logs. Usually database connection issue.

### Error 4: Connection Refused

**Browser Console:**
```
Cannot connect to server. Is the backend running on port 5004?
```

**Fix:** Server is not running. Start it with `cd server && npm run dev`.

## 🧪 Manual Testing

### Test 1: Check if Route Exists

```powershell
curl http://localhost:5004/api/dashboard/metrics
```

**Expected:** `{"message":"Unauthorized: missing token"}` (401) - This means route exists!

### Test 2: Check with Token

1. Log in to your frontend
2. Open browser console (F12)
3. Run this:
```javascript
const user = firebase.auth().currentUser;
if (user) {
  const token = await user.getIdToken();
  console.log('Token:', token.substring(0, 50) + '...');
  
  fetch('http://localhost:5004/api/dashboard/metrics', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(r => r.json())
  .then(data => console.log('✅ Success:', data))
  .catch(err => console.error('❌ Error:', err));
}
```

## 📋 Debug Checklist

- [ ] Server is running on port 5004
- [ ] Frontend is running on port 3000
- [ ] User is logged in (check Firebase Auth)
- [ ] Token is being sent (check browser console)
- [ ] Route is registered (check server logs for "✓ Dashboard routes loaded")
- [ ] Database is connected (check server logs)
- [ ] No CORS errors (check browser console)

## 🔧 Quick Fixes

### If Route Not Found (404):
1. Stop server (Ctrl+C)
2. Restart: `cd server && npm run dev`
3. Look for: `✓ Dashboard routes loaded`

### If Unauthorized (401):
1. Log out and log back in
2. Check browser console for token errors
3. Verify Firebase is configured correctly

### If Server Error (500):
1. Check server logs for error details
2. Verify SQL Server is running
3. Check database connection in `.env` file

## 📊 Expected Response

When successful, the API returns:
```json
{
  "totals": {
    "totalSales": 0,
    "totalExpenses": 0,
    "profit": 0,
    "vatPayable": 0,
    "expiringDocs": 0
  },
  "charts": {
    "salesTrend": [],
    "expenseTrend": []
  }
}
```

## 🎯 Next Steps

1. **Open browser console** (F12)
2. **Navigate to Dashboard page**
3. **Watch both browser console and server terminal**
4. **Compare logs with this guide**
5. **Identify which step is failing**

The detailed logs will show exactly where the request is failing!

