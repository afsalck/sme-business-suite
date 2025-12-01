# How to Test API Endpoints

## The Issue
You're getting `{"message":"Unauthorized: missing token"}` because the API requires Firebase authentication.

## Solution: Include Authentication Token

### Option 1: Test from the Frontend (Easiest)

The frontend automatically includes the token. Just:
1. Start the frontend: `cd client && npm start`
2. Open browser: `http://localhost:3000`
3. Log in with Firebase
4. The API calls will work automatically

### Option 2: Test with Browser (After Login)

1. Open your app in browser: `http://localhost:3000`
2. Log in
3. Open browser console (F12)
4. Type:
```javascript
// Get the Firebase token
firebase.auth().currentUser.getIdToken().then(token => {
  console.log('Token:', token);
  
  // Test API call
  fetch('http://localhost:5004/api/dashboard/metrics', {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  })
  .then(r => r.json())
  .then(data => console.log('Response:', data));
});
```

### Option 3: Test with curl/Postman

1. **Get your Firebase token** (from browser console after login):
```javascript
firebase.auth().currentUser.getIdToken().then(token => console.log(token));
```

2. **Use the token in API calls**:
```powershell
# Replace YOUR_TOKEN with the actual token
curl http://localhost:5004/api/dashboard/metrics -H "Authorization: Bearer YOUR_TOKEN"
```

### Option 4: Test Public Endpoints (No Auth Required)

Some endpoints don't require authentication:

```powershell
# Health check (no auth needed)
curl http://localhost:5004/health

# Should return:
# {"status":"ok","timestamp":"...","database":{"type":"SQL Server",...}}
```

## API Endpoints That Require Authentication

All `/api/*` endpoints require authentication:
- `GET /api/dashboard/metrics` - Dashboard data
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee
- `GET /api/invoices` - List invoices
- `GET /api/expenses` - List expenses
- etc.

## Public Endpoints (No Auth)

- `GET /health` - Server health check

## Quick Test

### Test Health Endpoint (No Auth):
```powershell
curl http://localhost:5004/health
```

### Test Authenticated Endpoint:
1. Log in to your app in browser
2. Open browser console (F12)
3. Run:
```javascript
const token = await firebase.auth().currentUser.getIdToken();
fetch('http://localhost:5004/api/dashboard/metrics', {
  headers: { 'Authorization': 'Bearer ' + token }
}).then(r => r.json()).then(console.log);
```

## Why Authentication is Required

The API uses Firebase Authentication to:
- Verify user identity
- Check user roles (admin/staff)
- Track who created/modified records
- Secure your data

## Summary

- ✅ `/health` - Works without token
- ❌ `/api/*` - Requires Firebase token
- 💡 Best way: Test from the frontend after logging in

