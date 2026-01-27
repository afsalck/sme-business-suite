# Troubleshooting "Unauthorized: invalid token" Error

## Quick Fixes

### 1. Check Server Console Logs

**Most Important**: Look at your server console (where you ran `npm run dev`). You should see detailed logs like:

```
🔐 [AUTH] GET /api/payroll/periods
   [AUTH] Token present: Yes (length: 800)
   [AUTH] Verifying Firebase token...
   [AUTH] ❌ Error: [error details here]
```

**The server logs will tell you exactly what's wrong!**

---

### 2. Use the Correct Token

You have two tokens in your response:
- `id_token` ← **Use this one** (for Firebase Auth)
- `access_token` ← Don't use this (for Google APIs)

**Make sure you're using the `id_token` value!**

---

### 3. Check Token Format in Postman

In Postman, make sure:

**Authorization Tab:**
- Type: **Bearer Token**
- Token: Paste ONLY the token (without "Bearer " prefix)
- Postman will automatically add "Bearer " for you

**OR Headers Tab:**
- Key: `Authorization`
- Value: `Bearer YOUR_TOKEN_HERE` (with space after Bearer)

---

### 4. Token May Have Expired

Your token expires in 1 hour (`expires_in: 3600`). If it's been more than 1 hour, get a fresh token.

**To get a fresh token:**
1. Refresh your browser (stay logged in)
2. Open Console (F12)
3. Run: `window.auth.currentUser.getIdToken(true).then(t => console.log(t))`
4. Copy the new token

---

### 5. Common Mistakes

❌ **Wrong**: `BearerBearer TOKEN` (no space)
✅ **Correct**: `Bearer TOKEN` (space after Bearer)

❌ **Wrong**: Using `access_token` instead of `id_token`
✅ **Correct**: Use `id_token`

❌ **Wrong**: Token has extra spaces or line breaks
✅ **Correct**: Token is one continuous string

❌ **Wrong**: Token is cut off (not complete)
✅ **Correct**: Full token (800-2000+ characters)

---

## Step-by-Step Debugging

### Step 1: Check Server Logs

Look at your server terminal. You should see:
```
🔐 [AUTH] GET /api/payroll/periods
   [AUTH] Token present: Yes (length: XXX)
```

**What to check:**
- Is token length reasonable? (should be 800-2000+)
- What error message appears after "Verifying Firebase token..."?

### Step 2: Verify Token in Browser Console

Open browser console and run:

```javascript
// Get fresh token
const auth = window.auth;
if (auth && auth.currentUser) {
  auth.currentUser.getIdToken(true).then(token => {
    console.log('Token length:', token.length);
    console.log('Token (first 50 chars):', token.substring(0, 50));
    console.log('Full token:', token);
  });
} else {
  console.error('Not logged in!');
}
```

### Step 3: Test with cURL (Alternative)

If Postman isn't working, try cURL:

```bash
# Replace YOUR_ID_TOKEN with the id_token value
curl -X GET "http://localhost:5004/api/payroll/periods" \
  -H "Authorization: Bearer YOUR_ID_TOKEN"
```

### Step 4: Check Token Expiration

Your token shows:
- `expires_in: 3600` (1 hour)
- `iat: 1764755006` (issued at timestamp)

To check if expired:
```javascript
// In browser console
const iat = 1764755006; // Your issued at time
const expiresAt = (iat + 3600) * 1000; // Convert to milliseconds
const now = Date.now();
const isExpired = now > expiresAt;
console.log('Token expired?', isExpired);
console.log('Expires at:', new Date(expiresAt));
console.log('Current time:', new Date(now));
```

---

## Most Likely Issues

### Issue 1: Using access_token instead of id_token
**Fix**: Use the `id_token` value, not `access_token`

### Issue 2: Token Expired
**Fix**: Get a fresh token (refresh browser, get new token from console)

### Issue 3: Wrong Format in Postman
**Fix**: 
- Use "Bearer Token" type in Authorization tab
- OR use Header: `Authorization: Bearer TOKEN` (with space)

### Issue 4: Token Truncated
**Fix**: Make sure you copied the ENTIRE token (it's very long)

---

## Quick Test

Try this exact setup in Postman:

1. **Method**: GET
2. **URL**: `http://localhost:5004/api/payroll/periods`
3. **Authorization Tab**:
   - Type: `Bearer Token`
   - Token: `eyJhbGciOiJSUzI1NiIsImtpZCI6IjdjNzQ5NTFmNjBhMDE0NzE3ZjFlMzA4ZDZiMjgwZjQ4ZjFlODhmZGEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vYml6ZWFzZS11YWUiLCJhdWQiOiJiaXplYXNlLXVhZSIsImF1dGhfdGltZSI6MTc2NDc1NDk4OSwidXNlcl9pZCI6Ik10UExxOXZDaUxlWjZMSnV6bjg5dzBtZlZaeTEiLCJzdWIiOiJNdFBMcTl2Q2lMZVo2TEp1em44OXcwbWZWWnkxIiwiaWF0IjoxNzY0NzU1MDA2LCJleHAiOjE3NjQ3NTg2MDYsImVtYWlsIjoiYWRtaW5AYml6LmNvbSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJlbWFpbCI6WyJhZG1pbkBiaXouY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoicGFzc3dvcmQifX0.bKnaYOfhudYRGJos5yb9cTvSAZXQxBLFDsbpEN_iD2hps0rSstyykkfOQChtoymoP1iM_v2DgGcf_qNcz0HDVkpZyqszMUeJQdgD4d-hjFXU2YlnDT7PY4PR1ZDiXoEttkdJ_hs3plCwAQNWrcmfvrNkEPhB6gvAUpx7-i2-ycXSkYrNYwfA0aXW6I2H800whrl2t8rHyrybPDjipts2X_7kAsG-3b0fuZe9GRqIyztmmPv3wNecRxpKhF_RFbDXHrvilM15JhXZs3iepVTSCMlSeHPA4om5q2MMhtXxnYyIRzWcazpAWFIIJeku8ZSbu6VDBnxfAkQgLCBKlLzTQQ`
4. **Send**

---

## Check Server Logs

**The most important step**: Check your server console. It will show you:
- If the token was received
- Token length
- The exact error from Firebase

Share the server log output and I can help you fix it!

