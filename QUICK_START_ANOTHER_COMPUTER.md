# 🚀 Quick Start: Running BizEase UAE on Another Computer

This is a **quick reference guide** for setting up the application on a new computer for testing.

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] **Node.js** (v16 or higher) - Download from https://nodejs.org/
- [ ] **SQL Server** (2019 or later) - Express edition is fine
- [ ] **Git** (optional) - For cloning repository
- [ ] **Firebase Account** - Access to `bizease-uae` project

**Verify installations:**
```powershell
node --version    # Should show v16.x or higher
npm --version     # Should show 8.x or higher
```

---

## 🎯 Quick Setup (5 Steps)

### Step 1: Copy Project Files

**Option A: USB/Network Drive**
- Copy entire `Biz` folder to new computer
- Place in: `D:\Personal\Biz` (or any location)

**Option B: Git Clone**
```powershell
git clone <repository-url>
cd Biz
```

---

### Step 2: Install Dependencies

Open PowerShell in project root:

```powershell
# Navigate to project
cd D:\Personal\Biz

# Install all dependencies (root, server, client)
npm run install-all
```

**This will:**
- Install root dependencies
- Install server dependencies  
- Install client dependencies

**Time:** ~5-10 minutes depending on internet speed

---

### Step 3: Configure Environment Variables

**Create `.env` file** in project root: `D:\Personal\Biz\.env`

```env
# Database Configuration (SQL Server)
DB_HOST=localhost
DB_PORT=1433
DB_NAME=bizease
DB_USER=sa
DB_PASSWORD=YourSQLServerPassword
DB_ENCRYPT=false
DB_TRUST_CERT=true

# Server Configuration
PORT=5004
NODE_ENV=development

# API URL (for client)
REACT_APP_API_BASE_URL=http://localhost:5004/api
```

**Important:** Replace `YourSQLServerPassword` with your actual SQL Server password!

---

### Step 4: Configure Firebase

**A. Server Firebase (Already configured if you copy the file)**
- Copy `server/firebase-service-account.json` from original computer
- Or download from Firebase Console → Project Settings → Service Accounts

**B. Client Firebase**
1. Go to: https://console.firebase.google.com
2. Select project: `bizease-uae`
3. Project Settings → Your apps → Web app
4. Copy config values

**Update:** `client/src/config/firebase.js`
```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "bizease-uae.firebaseapp.com",
  projectId: "bizease-uae",
  storageBucket: "bizease-uae.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

---

### Step 5: Set Up SQL Server Database

**A. Ensure SQL Server is Running**
1. Open **SQL Server Configuration Manager**
2. Verify **SQL Server (MSSQLSERVER)** service is running
3. Enable **SQL Server Authentication** (if not already enabled)

**B. Create Database (if needed)**
```sql
CREATE DATABASE bizease;
```

**C. Verify Connection**
The application will create tables automatically on first run.

---

## ▶️ Start the Application

### Option 1: Single Command (Recommended)

```powershell
# From project root
cd D:\Personal\Biz
npm start
```

This starts both server and client automatically.

**Wait for:**
- ✅ `Server listening on port 5004`
- ✅ Browser opens at `http://localhost:3000`

---

### Option 2: Two Separate Terminals

**Terminal 1 - Backend:**
```powershell
cd D:\Personal\Biz\server
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd D:\Personal\Biz\client
npm start
```

---

## 🌐 Access from Network (Optional)

If you want to access from another computer on the same network:

### 1. Find Server IP Address
```powershell
ipconfig
# Look for IPv4 Address (e.g., 192.168.1.100)
```

### 2. Update Client Configuration

**Option A: Environment Variable**
In `client/.env`:
```env
REACT_APP_API_BASE_URL=http://192.168.1.100:5004/api
```

**Option B: Direct Edit**
In `client/src/services/apiClient.js`:
```javascript
baseURL: 'http://192.168.1.100:5004/api'
```

### 3. Allow Firewall Access
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "BizEase Server" -Direction Inbound -LocalPort 5004 -Protocol TCP -Action Allow
```

### 4. Access from Other Computer
Open browser: `http://192.168.1.100:3000`

---

## ✅ Verification Checklist

After setup, verify:

- [ ] SQL Server is running
- [ ] Backend starts on port 5004 (check console)
- [ ] Frontend starts on port 3000 (browser opens)
- [ ] Can access `http://localhost:3000`
- [ ] Can log in with Firebase
- [ ] Dashboard loads
- [ ] Can create/view invoices

---

## 🔧 Common Issues & Quick Fixes

### ❌ "Cannot connect to SQL Server"
**Fix:**
1. Check SQL Server is running
2. Verify credentials in `.env`
3. Enable SQL Server Authentication
4. Check firewall allows port 1433

### ❌ "Port 5004 already in use"
**Fix:**
```powershell
# Find and kill process
netstat -ano | findstr :5004
taskkill /PID <PID> /F
```

Or change port in `.env`:
```env
PORT=5005
```

### ❌ "Module not found"
**Fix:**
```powershell
npm run install-all
```

### ❌ "Firebase authentication failed"
**Fix:**
1. Verify Firebase config in `client/src/config/firebase.js`
2. Check Firebase project is active
3. Verify API keys are correct

### ❌ "Database connection timeout"
**Fix:**
1. Check SQL Server is accessible
2. Verify `DB_HOST` in `.env` (use IP if remote)
3. Check SQL Server allows remote connections

---

## 📁 Important Files Reference

| File | Purpose |
|------|---------|
| `.env` (root) | Database & server configuration |
| `client/src/config/firebase.js` | Firebase client config |
| `server/config/database.js` | Database connection |
| `server/firebase-service-account.json` | Firebase admin credentials |
| `start.js` | Application startup script |

---

## 🎯 Quick Commands Reference

```powershell
# Install all dependencies
npm run install-all

# Start both server and client
npm start

# Start server only
cd server && npm run dev

# Start client only
cd client && npm start

# Verify setup
node verify-setup.js
```

---

## 📚 Additional Documentation

For detailed information, see:
- `SETUP_ON_NEW_COMPUTER.md` - Detailed setup guide
- `ENV_SQL_SERVER_SETUP.md` - SQL Server configuration
- `FIREBASE_SETUP_GUIDE.md` - Firebase setup
- `TROUBLESHOOTING.md` - General troubleshooting

---

## 🆘 Need Help?

1. Check console logs for error messages
2. Review troubleshooting section above
3. Check relevant documentation files
4. Verify all prerequisites are installed
5. Ensure environment variables are correct

---

**Last Updated:** 2025-01-05  
**Version:** 1.0
