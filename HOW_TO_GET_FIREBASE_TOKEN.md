# How to Get Firebase Token for Postman

## ⚡ QUICKEST METHOD: Browser Console (Recommended)

### Step-by-Step:

1. **Open your application in the browser** and **make sure you're logged in**

2. **Open Developer Tools**:
   - Press `F12` or
   - Right-click → "Inspect"

3. **Go to Console Tab**

4. **Paste this code and press Enter**:

```javascript
// Get Firebase token from current user
const auth = window.auth;
if (auth && auth.currentUser) {
  auth.currentUser.getIdToken(true).then(token => {
    console.log('✅ TOKEN:', token);
    console.log('📋 Copy the token above (it\'s very long)');
    // Try to copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(token).then(() => {
        console.log('✅ Token copied to clipboard!');
      });
    }
  });
} else {
  console.error('❌ Not logged in! Please login first.');
}
```

5. **The token will be printed in the console** - copy it!

6. **Use in Postman**: `Bearer YOUR_TOKEN_HERE`

---

## Method 1: From Browser Developer Tools (Alternative)

### Step-by-Step:

1. **Open your application in the browser** (e.g., `http://localhost:3000`)

2. **Login to your application** (make sure you're authenticated)

3. **Open Developer Tools**:
   - Press `F12` or
   - Right-click → "Inspect" or
   - `Ctrl + Shift + I` (Windows) / `Cmd + Option + I` (Mac)

4. **Go to Application Tab** (Chrome) or **Storage Tab** (Firefox):
   - In Chrome: Click "Application" in the top menu
   - In Firefox: Click "Storage" in the top menu

5. **Find Firebase Token**:
   - **Chrome**: 
     - Left sidebar → "Local Storage" → Click on your domain (e.g., `http://localhost:3000`)
     - Look for keys starting with `firebase:authUser:` or `firebase:token:`
     - Click on it to see the value
     - The token is usually in a JSON object under `stsTokenManager.accessToken`
   
   - **Firefox**:
     - Left sidebar → "Local Storage" → Your domain
     - Same process as Chrome

6. **Copy the Token**:
   - The token is a long string starting with something like: `eyJhbGciOiJSUzI1NiIsImtpZCI6...`
   - Copy the entire token (it's very long, usually 800-1000+ characters)

---

## Method 2: From Network Tab (Most Reliable)

### Step-by-Step:

1. **Open your application in the browser**

2. **Open Developer Tools** (`F12`)

3. **Go to Network Tab**

4. **Refresh the page** or make any API call (e.g., click on Dashboard)

5. **Find any API request** (look for requests to `/api/...`)

6. **Click on the request** → Go to "Headers" tab

7. **Look for "Request Headers"** section

8. **Find "Authorization" header**:
   ```
   Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6...
   ```

9. **Copy everything after "Bearer "** (the long token string)

---

## Method 3: From Browser Console (Quick Check)

### Step-by-Step:

1. **Open your application in the browser**

2. **Open Developer Tools** (`F12`)

3. **Go to Console Tab**

4. **Paste this code and press Enter**:

```javascript
// Get Firebase token from localStorage
const firebaseKeys = Object.keys(localStorage).filter(key => key.includes('firebase'));
console.log('Firebase keys:', firebaseKeys);

// Try to get the token
firebaseKeys.forEach(key => {
  const data = localStorage.getItem(key);
  try {
    const parsed = JSON.parse(data);
    if (parsed.stsTokenManager && parsed.stsTokenManager.accessToken) {
      console.log('Token found in:', key);
      console.log('Token:', parsed.stsTokenManager.accessToken);
    }
  } catch (e) {
    // Not JSON, skip
  }
});
```

5. **The token will be printed in the console** - copy it!

---

## Method 4: Using Application Code (If you have access)

If you can modify your frontend code temporarily, add this to see the token:

```javascript
// In your React app, add this temporarily
import { getAuth } from 'firebase/auth';

const auth = getAuth();
auth.currentUser?.getIdToken().then(token => {
  console.log('Firebase Token:', token);
  // Copy this token
});
```

---

## Using the Token in Postman

Once you have the token:

1. **Open Postman**

2. **Create a new request** or open existing one

3. **Go to "Headers" tab**

4. **Add a new header**:
   - **Key**: `Authorization`
   - **Value**: `Bearer YOUR_TOKEN_HERE`
   - (Replace `YOUR_TOKEN_HERE` with the actual token you copied)

5. **Or use Postman's Authorization tab**:
   - Click "Authorization" tab
   - Type: Select "Bearer Token"
   - Token: Paste your token (without "Bearer " prefix)

---

## Token Format

The token should look like this:
```
eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1Njc4OTAiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vcHJvamVjdC1pZCIsImF1ZCI6InByb2plY3QtaWQiLCJhdWQiOiJwcm9qZWN0LWlkIiwiaWF0IjoxNjE2MjM5MDIyLCJleHAiOjE2MTYyNDI2MjIsInVzZXJfaWQiOiJ1c2VyLWlkIiwicGhvbmVfbnVtYmVyIjoiKzk3MTUwMTIzNDU2NyIsImVtYWlsIjoiYWRtaW5AYml6LmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7InBob25lX251bWJlciI6WyIrOTcxNTAxMjM0NTY3Il0sImVtYWlsIjpbImFkbWluQGJpei5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJwYXNzd29yZCJ9LCJ1aWQiOiJ1c2VyLWlkIn0.signature_here
```

**Important**: 
- The token is very long (usually 800-2000+ characters)
- It contains 3 parts separated by dots (`.`)
- Copy the ENTIRE token, don't cut it short

---

## Token Expiration

⚠️ **Important**: Firebase tokens expire after 1 hour!

If you get `401 Unauthorized` errors:
1. The token has expired
2. Get a fresh token using the methods above
3. Update Postman with the new token

**Tip**: You can set up Postman to automatically refresh tokens, but for testing, just get a new one when needed.

---

## Quick Test

After adding the token to Postman, test it:

1. **Create a GET request**:
   ```
   GET http://localhost:5004/api/payroll/periods
   ```

2. **Add Authorization header**:
   ```
   Authorization: Bearer YOUR_TOKEN
   ```

3. **Send the request**

4. **Expected Result**:
   - ✅ **200 OK**: Token is valid!
   - ❌ **401 Unauthorized**: Token expired or invalid - get a new one
   - ❌ **403 Forbidden**: Token is valid but user doesn't have permission

---

## Troubleshooting

### "Token not found in localStorage"
- Make sure you're logged in to the application
- Try refreshing the page after login
- Check if you're looking at the correct domain in Application/Storage tab

### "Token expired"
- Firebase tokens expire after 1 hour
- Get a fresh token by refreshing the page or logging in again

### "401 Unauthorized in Postman"
- Check you copied the ENTIRE token (it's very long)
- Make sure there's a space after "Bearer": `Bearer TOKEN` not `BearerTOKEN`
- Verify the token hasn't expired
- Try getting a fresh token

### "Can't find Authorization header"
- Make sure you're looking at a request that goes to `/api/...`
- Try refreshing the page or navigating to trigger API calls
- Check the Network tab is recording requests (red record button should be on)

---

## Pro Tip: Save Token as Environment Variable

In Postman:

1. **Create/Edit Environment**:
   - Click the eye icon (top right)
   - Click "Add" or edit existing environment

2. **Add Variable**:
   - Variable: `firebase_token`
   - Initial Value: (paste your token)
   - Current Value: (paste your token)

3. **Use in Requests**:
   - In Authorization header, use: `Bearer {{firebase_token}}`
   - Postman will automatically replace `{{firebase_token}}` with your token

4. **Update When Expired**:
   - Just update the environment variable value
   - All requests using `{{firebase_token}}` will use the new token

---

## Example: Complete Postman Setup

1. **Create New Request**: "Get Payroll Periods"

2. **Method**: GET

3. **URL**: `http://localhost:5004/api/payroll/periods`

4. **Headers Tab**:
   ```
   Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6...
   ```

5. **Send** → Should return payroll periods or empty array `[]`

That's it! You're ready to test the API! 🚀

