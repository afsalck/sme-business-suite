# 🔧 Troubleshooting Guide - Dashboard & CRUD Issues

## Common Issues and Solutions

### Issue 1: Dashboard Not Loading

**Symptoms:**
- Dashboard shows loading spinner forever
- Empty dashboard with no data
- Error message: "Unable to load dashboard"

**Diagnosis Steps:**

1. **Open Browser Console (F12)**
   - Go to Console tab
   - Look for red error messages
   - Check Network tab for failed requests

2. **Check for these errors:**

   **Error: "Unauthorized: Please log in again"**
   - Solution: Log out and log back in
   - Check if Firebase token is being sent

   **Error: "Cannot connect to server"**
   - Solution: Make sure backend is running on port 5004
   - Check: `http://localhost:5004/health` in browser

   **Error: "CORS policy"**
   - Solution: Add `CLIENT_URL=http://localhost:3000` to root `.env`

3. **Test API Connection:**
   ```powershell
   cd D:\Personal\Biz
   node test-api.js
   ```

### Issue 2: CRUD Operations Not Working

**Symptoms:**
- Can't create invoices/employees/expenses
- Forms submit but nothing happens
- Error messages in console

**Diagnosis Steps:**

1. **Check Browser Console (F12)**
   - Look for API errors
   - Check Network tab → see if requests are being sent

2. **Check Server Terminal**
   - Look for error messages
   - Check if requests are reaching the server

3. **Common Issues:**

   **"Forbidden" Error:**
   - Your user role might be "staff" but operation requires "admin"
   - Solution: Update your role in MongoDB:
     ```javascript
     db.users.updateOne(
       { email: "your-email@example.com" },
       { $set: { role: "admin" } }
     )
     ```

   **"Unauthorized" Error:**
   - Token expired or invalid
   - Solution: Log out and log back in

   **Network Error:**
   - Backend not running
   - Solution: Check server terminal, restart if needed

### Issue 3: Authentication Problems

**Symptoms:**
- Can't log in
- Logged out immediately after login
- Token errors

**Solutions:**

1. **Check Firebase Console:**
   - Go to Authentication → Sign-in method
   - Ensure "Email/Password" is enabled

2. **Check Browser Console:**
   - Look for Firebase errors
   - Check if Firebase config is loaded

3. **Clear Browser Cache:**
   - Press Ctrl+Shift+Delete
   - Clear cache and cookies
   - Try again

### Issue 4: Data Not Showing

**Symptoms:**
- Dashboard shows zeros
- Lists are empty
- No data in tables

**This is Normal!**
- The app is new, so there's no data yet
- Create some test data:
  - Add an invoice
  - Add an employee
  - Add an expense
  - Record a sale

---

## Quick Diagnostic Checklist

- [ ] Backend server is running (check terminal)
- [ ] Frontend client is running (check terminal)
- [ ] MongoDB is connected (check server terminal for "Connected to MongoDB")
- [ ] You are logged in (check if user appears in top right)
- [ ] Browser console has no errors (F12 → Console)
- [ ] Network requests are successful (F12 → Network → look for 200 status)

---

## Testing API Manually

### Test 1: Health Check
Open in browser: `http://localhost:5004/health`
Should show: `{"status":"ok","timestamp":"..."}`

### Test 2: Check if logged in
1. Open browser console (F12)
2. Type: `localStorage.getItem('firebase:authUser:...')`
3. Should show your user data

### Test 3: Test API with token
1. Get your Firebase token from browser console
2. Use Postman or curl to test:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5004/api/dashboard/metrics
   ```

---

## Still Not Working?

1. **Check Server Logs:**
   - Look at the server terminal window
   - Copy any error messages

2. **Check Browser Console:**
   - Press F12
   - Go to Console tab
   - Copy all error messages

3. **Verify Configuration:**
   ```powershell
   npm run verify
   ```

4. **Restart Everything:**
   - Stop both servers (Ctrl+C)
   - Close terminals
   - Start again with `.\start.ps1`

---

## Need More Help?

Check these files for more details:
- `ENV_SETUP.md` - Environment configuration
- `FIREBASE_SETUP_GUIDE.md` - Firebase setup
- `QUICK_START.md` - How to run the app

