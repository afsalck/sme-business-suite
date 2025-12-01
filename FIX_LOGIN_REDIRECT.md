# Fix: Login Not Redirecting to Dashboard

## Problem
After successful login, the user was not being redirected to the dashboard page.

## Root Causes

1. **`/auth/me` endpoint was marked as public**: The API client was skipping token attachment for `/auth/me`, causing authentication failures
2. **`useEffect` dependency issue**: The main auth listener had `user` in its dependency array, causing it to re-run every time user state changed, potentially interfering with login flow
3. **Blocking API call**: The code was waiting for the `/auth/me` API call to complete before setting the user state, delaying the redirect

## Solution

### 1. Fixed API Client
- Removed `/auth/me` from the public endpoints list
- Now all endpoints (including `/auth/me`) get the authentication token attached

### 2. Separated Effects
- Split auto-refresh listeners into their own `useEffect` (depends on `user` and `refreshRole`)
- Made the main auth state listener run only once on mount (empty dependency array)
- This prevents the listener from being re-registered during login

### 3. Faster Redirect
- **Set user state immediately** after Firebase authentication succeeds (with default "staff" role)
- **Fetch actual role in background** (non-blocking) after redirect
- This ensures the redirect happens instantly without waiting for the API call

### 4. Better Error Handling
- Added 5-second timeout for token retrieval
- Graceful fallbacks if token or API calls fail
- User state is always set (with default role) so redirect can happen

## Files Changed

- `client/src/services/apiClient.js`:
  - Removed `/auth/me` from public endpoints list

- `client/src/context/AuthContext.js`:
  - Separated auto-refresh listeners into their own effect
  - Made main auth listener run only once on mount
  - Set user state immediately (don't wait for API)
  - Fetch role in background after user is set
  - Added timeout for token retrieval

## How It Works Now

1. User submits login form
2. `signInWithEmailAndPassword` succeeds
3. `onAuthStateChanged` fires immediately
4. **User state is set immediately** with default role → **Redirect happens instantly** ✅
5. Role is fetched from backend in background and updates when ready

## Testing

1. Try logging in with valid credentials
2. You should be redirected to `/dashboard` immediately after login
3. Check browser console for:
   - `✅ User role loaded: <role>` (after redirect)
   - Any error messages if API call fails

## Notes

- The redirect now happens **immediately** after Firebase authentication
- Role is updated in the background (you might see "STAFF" briefly, then it updates to your actual role)
- If the backend API is down, you'll still be redirected (with default "staff" role)
- The ProtectedRoute will handle any authentication errors if the token is invalid

