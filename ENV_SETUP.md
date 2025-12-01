# Environment Configuration Guide

## 📍 File Locations

### Server Configuration
**Location:** `D:\Personal\Biz\.env` (root directory, same level as `server` and `client` folders)

### Client Configuration  
**Location:** `D:\Personal\Biz\client\.env`

---

## 🔧 Server .env File (Root Directory)

Create or edit: `D:\Personal\Biz\.env`

```env
# ============================================
# REQUIRED - MongoDB Connection
# ============================================
# Local MongoDB:
MONGO_URI=mongodb://localhost:27017/bizease-uae

# OR MongoDB Atlas (Cloud):
# MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/bizease-uae?retryWrites=true&w=majority

# ============================================
# Server Settings (Optional - has defaults)
# ============================================
PORT=5004
CLIENT_URL=http://localhost:3000

# If you have multiple client URLs, use CLIENT_URLS instead:
# CLIENT_URLS=http://localhost:3000,http://localhost:3001

# ============================================
# Firebase Admin (Optional - auto-loads from file)
# ============================================
# The server will automatically load from: server/firebase-service-account.json
# Only set this if you want a different location:
# FIREBASE_SERVICE_ACCOUNT_PATH=./server/firebase-service-account.json

# ============================================
# Email Configuration (Optional - for alerts)
# ============================================
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password
# SMTP_SECURE=false
# MAIL_FROM=noreply@bizease-uae.com

# ============================================
# Alert Recipients (Optional)
# ============================================
# ALERT_RECIPIENTS=admin@example.com,owner@example.com
```

---

## 🎨 Client .env File

Create or edit: `D:\Personal\Biz\client\.env`

```env
# ============================================
# API Configuration
# ============================================
REACT_APP_API_BASE_URL=http://localhost:5004/api

# ============================================
# Firebase Configuration (REQUIRED)
# ============================================
# Get these from Firebase Console > Project Settings > General
REACT_APP_FIREBASE_API_KEY=your-api-key-here
REACT_APP_FIREBASE_AUTH_DOMAIN=bizease-uae.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=bizease-uae
REACT_APP_FIREBASE_STORAGE_BUCKET=bizease-uae.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

---

## 📝 Step-by-Step Setup

### Step 1: MongoDB Setup

**Option A: Local MongoDB**
1. Install MongoDB locally or use Docker
2. Start MongoDB service
3. Use: `MONGO_URI=mongodb://localhost:27017/bizease-uae`

**Option B: MongoDB Atlas (Cloud - Recommended)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Create a database user
4. Get connection string
5. Use: `MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/bizease-uae?retryWrites=true&w=majority`
   - Replace `username`, `password`, and `cluster0.xxxxx` with your actual values

### Step 2: Firebase Configuration

**For Client (.env in client folder):**
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: `bizease-uae`
3. Click the gear icon ⚙️ > Project Settings
4. Scroll to "Your apps" section
5. If no web app exists, click "Add app" > Web (</>)
6. Copy the config values:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
7. Paste them into `client/.env` with `REACT_APP_` prefix

**For Server:**
- Already configured! The `server/firebase-service-account.json` file is already set up.

### Step 3: Verify Configuration

Run this command to check if everything is set:
```powershell
cd D:\Personal\Biz\server
node check-env.js
```

---

## ✅ Minimum Required Configuration

**To start the server, you ONLY need:**
- `MONGO_URI` in root `.env` file

**To use the client, you need:**
- All `REACT_APP_FIREBASE_*` variables in `client/.env`

Everything else is optional and has defaults!

---

## 🚀 Quick Start Commands

After setting up `.env` files:

```powershell
# Terminal 1 - Start Server
cd D:\Personal\Biz\server
npm run dev

# Terminal 2 - Start Client
cd D:\Personal\Biz\client
npm start
```

---

## ❓ Troubleshooting

**Server won't start:**
- Check: `MONGO_URI` is set in root `.env`
- Check: MongoDB is running (if local)
- Check: Connection string is correct (no extra spaces)

**Client shows Firebase errors:**
- Check: All `REACT_APP_FIREBASE_*` variables are set in `client/.env`
- Check: Firebase project matches the one in `firebase-service-account.json`

**Can't connect to API:**
- Check: `REACT_APP_API_BASE_URL` matches server `PORT`
- Check: Server is running on the correct port

