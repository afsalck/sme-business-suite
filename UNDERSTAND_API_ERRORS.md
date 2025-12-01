# 🔍 Understanding API Errors

## 📋 Error Log Format

When an API request fails, you'll see detailed logs in the browser console (F12) with this format:

```
============================================================
❌ [API ERROR] Request Failed
============================================================
📋 Request Details:
   Method: GET
   URL: /dashboard/metrics
   Base URL: http://localhost:5004/api
   Full URL: http://localhost:5004/api/dashboard/metrics

📥 Response Details:
   Status: 404
   Status Text: Not Found
   Response Data: {message: "API endpoint not found"}

🔍 Error Details:
   Error Code: ERR_BAD_REQUEST
   Error Message: Request failed with status code 404
   Error Name: AxiosError
```

## 🚨 Common Error Codes

### 401 - Unauthorized
**Meaning:** Missing or invalid authentication token

**What to do:**
1. Log out and log back in
2. Check if Firebase token is being generated
3. Verify Firebase configuration

**Logs show:**
```
🔐 [AUTH] Unauthorized - Token missing or invalid
   Fix: Log out and log back in
```

### 403 - Forbidden
**Meaning:** You don't have permission for this action

**What to do:**
1. Check your role (admin vs staff)
2. Contact admin to update your role
3. Some endpoints require admin role

**Logs show:**
```
🚫 [PERMISSION] Forbidden - You don't have permission
   Fix: Contact admin to update your role
```

### 404 - Not Found
**Meaning:** The API endpoint doesn't exist

**What to do:**
1. Check if server is running
2. Verify route is registered on server
3. Check server logs for "✓ Dashboard routes loaded"

**Logs show:**
```
🔍 [NOT FOUND] Endpoint not found
   Fix: Check if route exists on server
```

### 500 - Server Error
**Meaning:** Server encountered an error processing the request

**What to do:**
1. Check server terminal for error details
2. Verify database connection
3. Check server logs for stack trace

**Logs show:**
```
💥 [SERVER] Server error
   Fix: Check server logs for details
```

### ERR_NETWORK / ECONNREFUSED
**Meaning:** Cannot connect to the server

**What to do:**
1. Start the server: `cd server && npm run dev`
2. Verify server is running on port 5004
3. Check firewall settings

**Logs show:**
```
🌐 [NETWORK] Cannot connect to server
   Fix: Start the server
```

## 🔍 How to Debug

### Step 1: Check Browser Console (F12)
- Look for the detailed error log
- Note the status code and error message
- Check the full URL being requested

### Step 2: Check Server Terminal
- Look for authentication logs
- Check for route handler logs
- Look for error stack traces

### Step 3: Match Error to Solution
- Use the error code above to find the fix
- Follow the specific instructions for that error

## 📊 Error Flow

```
Frontend Request
    ↓
API Client Interceptor (adds token)
    ↓
Network Request
    ↓
Server Auth Middleware (verifies token)
    ↓
Route Handler (processes request)
    ↓
Response (success or error)
    ↓
API Client Interceptor (logs error if failed)
```

## ✅ Success Indicators

When everything works, you'll see:
- **Browser:** `✅ API request successful!`
- **Server:** `✅ Metrics calculated successfully`
- **Status:** `200 OK`

## 🎯 Quick Fixes

| Error | Quick Fix |
|-------|-----------|
| 401 | Log out and back in |
| 403 | Check your role |
| 404 | Restart server |
| 500 | Check server logs |
| ERR_NETWORK | Start server |

## 💡 Pro Tips

1. **Always check both browser console AND server terminal**
2. **Look for the detailed error logs** - they show exactly what's wrong
3. **Check the full URL** - make sure it's correct
4. **Verify server is running** - test `/health` endpoint
5. **Check authentication** - make sure you're logged in

