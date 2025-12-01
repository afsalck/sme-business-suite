# API Endpoints Guide

## Important Notes

1. **`/api` by itself is NOT an endpoint** - it's just the base path
2. **All `/api/*` endpoints require Firebase authentication**
3. **Use the frontend to test** - it automatically includes the token

## Available Endpoints

### Public Endpoints (No Auth Required)

- `GET /health` - Server health check
  ```powershell
  curl http://localhost:5004/health
  ```

### Protected Endpoints (Require Firebase Token)

All these require authentication:

#### Authentication
- `GET /api/auth/me` - Get current user info
- `GET /api/auth/users` - List all users (admin only)
- `PATCH /api/auth/users/:uid/role` - Update user role (admin only)

#### Dashboard
- `GET /api/dashboard/metrics` - Get dashboard statistics

#### Employees
- `GET /api/employees` - List all employees
- `POST /api/employees` - Create new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

#### Invoices
- `GET /api/invoices` - List all invoices
- `GET /api/invoices/:id` - Get invoice by ID
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

#### Expenses
- `GET /api/expenses` - List all expenses
- `POST /api/expenses` - Create new expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

#### Inventory
- `GET /api/inventory` - List all inventory items
- `POST /api/inventory` - Create inventory item
- `PUT /api/inventory/:id` - Update inventory item
- `DELETE /api/inventory/:id` - Delete inventory item
- `GET /api/inventory/sales` - List sales
- `POST /api/inventory/sales` - Record a sale

## How to Test

### Method 1: Use the Frontend (Recommended)

1. Start frontend:
   ```powershell
   cd D:\Personal\Biz\client
   npm start
   ```

2. Open browser: `http://localhost:3000`
3. Log in with Firebase
4. Navigate to pages - API calls happen automatically

### Method 2: Test Health Endpoint (No Auth)

```powershell
curl http://localhost:5004/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "...",
  "database": {
    "type": "SQL Server",
    "state": "error",
    "ping": "..."
  }
}
```

### Method 3: Test with Token (Advanced)

1. Log in to your app in browser
2. Open browser console (F12)
3. Get token:
   ```javascript
   firebase.auth().currentUser.getIdToken().then(token => {
     console.log('Token:', token);
     
     // Test API
     fetch('http://localhost:5004/api/dashboard/metrics', {
       headers: { 'Authorization': 'Bearer ' + token }
     })
     .then(r => r.json())
     .then(data => console.log('Dashboard:', data));
   });
   ```

## Common Mistakes

### ❌ Wrong: Accessing `/api` directly
```
GET /api
→ Returns: {"message":"Unauthorized: missing token"}
```

### ✅ Correct: Access specific endpoints
```
GET /api/dashboard/metrics
GET /api/employees
GET /api/invoices
```

### ❌ Wrong: Missing authentication token
```
curl http://localhost:5004/api/employees
→ Returns: {"message":"Unauthorized: missing token"}
```

### ✅ Correct: Include token
```
curl http://localhost:5004/api/employees \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

## Testing from Browser Console

After logging in to your app:

```javascript
// Get current user token
const user = firebase.auth().currentUser;
if (user) {
  const token = await user.getIdToken();
  
  // Test dashboard
  fetch('http://localhost:5004/api/dashboard/metrics', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(r => r.json())
  .then(data => console.log('Dashboard:', data));
  
  // Test employees
  fetch('http://localhost:5004/api/employees', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(r => r.json())
  .then(data => console.log('Employees:', data));
}
```

## Summary

- ✅ `/health` - Works without token
- ❌ `/api` - Not an endpoint, use specific endpoints
- ❌ `/api/*` - Requires Firebase token
- 💡 **Best way:** Use the frontend after logging in

The frontend automatically handles authentication for you!

