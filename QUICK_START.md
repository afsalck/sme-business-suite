# 🚀 Quick Start Guide - BizEase UAE

## Running the Application

### Option 1: Two Terminal Windows (Recommended)

**Terminal 1 - Start Backend Server:**
```powershell
cd D:\Personal\Biz\server
npm run dev
```
Wait for: `Server listening on port 5004` and `Connected to MongoDB`

**Terminal 2 - Start Frontend Client:**
```powershell
cd D:\Personal\Biz\client
npm start
```
Wait for: Browser to open automatically at `http://localhost:3000`

---

### Option 2: Using npm scripts (if configured)

You can also create a root `package.json` with scripts to run both:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "server": "cd server && npm run dev",
    "client": "cd client && npm start"
  }
}
```

Then install concurrently: `npm install -g concurrently`
And run: `npm run dev`

---

## What to Expect

### Backend Server (Terminal 1)
```
Connected to MongoDB
Server listening on port 5004
```

### Frontend Client (Terminal 2)
```
Compiled successfully!
webpack compiled successfully
```
Browser opens at: `http://localhost:3000`

---

## First Time Setup

1. **Create a user account:**
   - Go to Firebase Console
   - Authentication > Users
   - Add user manually OR
   - Use the app's sign-up feature (if enabled)

2. **Set user role:**
   - First user is automatically "staff"
   - To make admin, update in MongoDB:
     ```javascript
     db.users.updateOne(
       { email: "your-email@example.com" },
       { $set: { role: "admin" } }
     )
     ```

---

## Troubleshooting

**Server won't start:**
- Check MongoDB is running (if local)
- Verify `.env` file has `MONGO_URI`
- Check port 5004 is not in use

**Client won't start:**
- Check port 3000 is not in use
- Verify `client/.env` has all Firebase variables
- Restart after adding `.env` variables

**Can't login:**
- Check Firebase Authentication is enabled
- Verify Email/Password sign-in method is enabled
- Check browser console for errors

**API errors:**
- Ensure server is running on port 5004
- Check `REACT_APP_API_BASE_URL` in `client/.env`
- Verify CORS settings in server

---

## Stopping the Application

- Press `Ctrl + C` in each terminal window
- Or close the terminal windows

---

## Development URLs

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5004/api
- **Health Check:** http://localhost:5004/health

