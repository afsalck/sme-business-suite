# 🖥️ Setup Guide: Running BizEase UAE on Another Computer

This guide will help you set up and run the BizEase UAE application on a new computer or system.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### 1. **Node.js** (Version 16 or higher)
   - Download from: https://nodejs.org/
   - Verify installation:
     ```powershell
     node --version
     npm --version
     ```

### 2. **SQL Server** (SQL Server 2019 or later)
   - SQL Server Express (free) is sufficient
   - Download from: https://www.microsoft.com/en-us/sql-server/sql-server-downloads
   - Make sure SQL Server Authentication is enabled (see `ENABLE_SQL_AUTH_GUIDE.md`)

### 3. **Git** (Optional, for cloning the repository)
   - Download from: https://git-scm.com/downloads

### 4. **Firebase Account**
   - You'll need access to the Firebase project: `bizease-uae`
   - See `FIREBASE_SETUP_GUIDE.md` for Firebase configuration

---

## 🚀 Step-by-Step Setup

### Step 1: Copy/Transfer the Project Files

**Option A: Using USB Drive or Network Share**
1. Copy the entire `Biz` folder to the new computer
2. Place it in a location like `D:\Personal\Biz` (or any path you prefer)

**Option B: Using Git (if repository is available)**
```powershell
git clone <repository-url>
cd Biz
```

**Option C: Using Cloud Storage (Google Drive, OneDrive, etc.)**
1. Upload the `Biz` folder to cloud storage
2. Download it on the new computer

---

### Step 2: Install Dependencies

Open PowerShell or Command Prompt in the project root directory:

```powershell
# Navigate to project root
cd D:\Personal\Biz

# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install

# Return to root
cd ..
```

**Or use the convenience script:**
```powershell
npm run install-all
```

---

### Step 3: Configure Environment Variables

1. **Create `.env` file** in the project root (`D:\Personal\Biz\.env`)

2. **Copy the template** (if `.env.template` exists) or create a new `.env` file with:

```env
# Database Configuration
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

# Firebase Configuration (get from Firebase Console)
FIREBASE_PROJECT_ID=bizease-uae
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# API Configuration
REACT_APP_API_BASE_URL=http://localhost:5004/api
```

**Important:**
- Replace `YourSQLServerPassword` with your actual SQL Server password
- Get Firebase credentials from Firebase Console (see `FIREBASE_SETUP_GUIDE.md`)
- If SQL Server is on a different machine, update `DB_HOST` to that machine's IP address

---

### Step 4: Configure Firebase (Client)

1. **Open Firebase Console**: https://console.firebase.google.com
2. **Select project**: `bizease-uae`
3. **Get Web App Config**:
   - Go to Project Settings → Your apps → Web app
   - Copy the Firebase configuration

4. **Update Client Firebase Config**:
   - Open: `client/src/config/firebase.js`
   - Replace the `firebaseConfig` object with your Firebase credentials

See `FIREBASE_SETUP_GUIDE.md` for detailed instructions.

---

### Step 5: Set Up SQL Server Database

1. **Ensure SQL Server is Running**:
   - Open SQL Server Configuration Manager
   - Verify SQL Server service is running
   - Enable SQL Server Authentication (see `ENABLE_SQL_AUTH_GUIDE.md`)

2. **Create Database** (if not exists):
   ```sql
   CREATE DATABASE bizease;
   ```

3. **Run Database Migrations** (if needed):
   - The application will create tables automatically on first run
   - Or run migration scripts if available

4. **Verify Connection**:
   ```powershell
   cd server
   node verify-sql-config.js
   ```

---

### Step 6: Start the Application

#### Option 1: Using the Start Script (Recommended)

```powershell
# From project root
cd D:\Personal\Biz
npm start
```

This will start both server and client automatically.

#### Option 2: Manual Start (Two Terminals)

**Terminal 1 - Backend Server:**
```powershell
cd D:\Personal\Biz\server
npm run dev
```

Wait for: `Server listening on port 5004`

**Terminal 2 - Frontend Client:**
```powershell
cd D:\Personal\Biz\client
npm start
```

Wait for browser to open at `http://localhost:3000`

---

## 🌐 Accessing from Another Computer on Network

If you want to access the application from another computer on the same network:

### 1. **Update Server Configuration**

In `server/index.js`, ensure the server listens on all interfaces:
```javascript
app.listen(5004, '0.0.0.0', () => {
  console.log('Server listening on port 5004');
});
```

### 2. **Update Client Configuration**

In `client/src/services/apiClient.js`, update the base URL:
```javascript
const apiClient = axios.create({
  baseURL: 'http://YOUR_SERVER_IP:5004/api'  // Replace with server's IP
});
```

Or set environment variable:
```env
REACT_APP_API_BASE_URL=http://YOUR_SERVER_IP:5004/api
```

### 3. **Firewall Configuration**

Allow port 5004 through Windows Firewall:
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "BizEase Server" -Direction Inbound -LocalPort 5004 -Protocol TCP -Action Allow
```

### 4. **Access from Other Computer**

Open browser on the other computer and navigate to:
```
http://YOUR_SERVER_IP:3000
```

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to SQL Server"

**Solutions:**
1. Verify SQL Server is running
2. Check SQL Server Authentication is enabled
3. Verify credentials in `.env` file
4. Check firewall allows SQL Server port (1433)
5. See `SQL_SERVER_CONNECTION_TROUBLESHOOTING.md`

### Issue: "Port 5004 already in use"

**Solution:**
```powershell
# Find process using port 5004
netstat -ano | findstr :5004

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

Or change the port in `.env`:
```env
PORT=5005
```

### Issue: "Firebase authentication failed"

**Solutions:**
1. Verify Firebase config in `client/src/config/firebase.js`
2. Check Firebase project is active
3. Verify API keys are correct
4. See `FIREBASE_SETUP_GUIDE.md`

### Issue: "Module not found" errors

**Solution:**
```powershell
# Reinstall all dependencies
cd D:\Personal\Biz
npm run install-all
```

### Issue: "Database connection timeout"

**Solutions:**
1. Check SQL Server is accessible from the new computer
2. Verify network connectivity
3. Check SQL Server allows remote connections
4. Update `DB_HOST` in `.env` if SQL Server is on different machine

---

## 📝 Quick Reference

### Important Files:
- `.env` - Environment variables (database, Firebase, etc.)
- `server/config/database.js` - Database connection config
- `client/src/config/firebase.js` - Firebase client config
- `server/index.js` - Server entry point
- `client/src/index.js` - Client entry point

### Important Ports:
- **3000** - React development server (client)
- **5004** - Express API server (backend)
- **1433** - SQL Server default port

### Common Commands:
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

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] SQL Server connection successful
- [ ] Backend server starts on port 5004
- [ ] Frontend client starts on port 3000
- [ ] Can access `http://localhost:3000` in browser
- [ ] Can log in with Firebase authentication
- [ ] Database tables are created
- [ ] Can create/view invoices
- [ ] Can access dashboard

---

## 📚 Additional Resources

- `FIREBASE_SETUP_GUIDE.md` - Firebase configuration
- `ENABLE_SQL_AUTH_GUIDE.md` - SQL Server authentication setup
- `SQL_SERVER_CONNECTION_TROUBLESHOOTING.md` - Database connection issues
- `QUICK_START.md` - Quick start guide
- `TROUBLESHOOTING.md` - General troubleshooting

---

## 🆘 Need Help?

If you encounter issues:

1. Check the console logs for error messages
2. Review the troubleshooting section above
3. Check the relevant documentation files
4. Verify all prerequisites are installed
5. Ensure all environment variables are set correctly

---

**Last Updated:** 2025-01-05
**Version:** 1.0
