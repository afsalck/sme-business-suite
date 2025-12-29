# ✅ Setup Checklist for New Computer

Use this checklist to ensure everything is set up correctly on a new computer.

---

## 📋 Pre-Setup Checklist

- [ ] Node.js installed (v16+) - `node --version`
- [ ] npm installed - `npm --version`
- [ ] SQL Server installed and running
- [ ] SQL Server Authentication enabled
- [ ] Git installed (optional)

---

## 📁 Step 1: Copy Project Files

- [ ] Project folder copied to new computer
- [ ] Location: `D:\Personal\Biz` (or chosen location)
- [ ] All files and folders present (server, client, models, routes, etc.)

---

## 📦 Step 2: Install Dependencies

- [ ] Opened PowerShell in project root
- [ ] Ran: `npm run install-all`
- [ ] Root dependencies installed successfully
- [ ] Server dependencies installed successfully
- [ ] Client dependencies installed successfully
- [ ] No errors during installation

---

## ⚙️ Step 3: Environment Configuration

### Root `.env` File (`D:\Personal\Biz\.env`)

- [ ] File created
- [ ] `DB_HOST=localhost` (or SQL Server IP)
- [ ] `DB_PORT=1433`
- [ ] `DB_NAME=bizease`
- [ ] `DB_USER=sa` (or your SQL username)
- [ ] `DB_PASSWORD=YourPassword` (actual password set)
- [ ] `DB_ENCRYPT=false`
- [ ] `DB_TRUST_CERT=true`
- [ ] `PORT=5004`
- [ ] `NODE_ENV=development`

### Client Firebase Config (`client/src/config/firebase.js`)

- [ ] Firebase config file exists
- [ ] `apiKey` set correctly
- [ ] `authDomain` set correctly
- [ ] `projectId` set correctly
- [ ] `storageBucket` set correctly
- [ ] `messagingSenderId` set correctly
- [ ] `appId` set correctly

### Server Firebase (`server/firebase-service-account.json`)

- [ ] File exists
- [ ] Contains valid Firebase service account JSON
- [ ] Project ID matches client config

---

## 🗄️ Step 4: SQL Server Setup

- [ ] SQL Server service is running
- [ ] SQL Server Authentication enabled (Mixed Mode)
- [ ] Database `bizease` exists (or will be created automatically)
- [ ] Can connect using SQL Server Management Studio
- [ ] Port 1433 is accessible

**Test Connection:**
```powershell
cd D:\Personal\Biz\server
node -e "require('./config/database').testConnection()"
```

---

## 🚀 Step 5: Start Application

### Option A: Single Command

- [ ] Ran: `npm start` from project root
- [ ] Server started on port 5004
- [ ] Client started on port 3000
- [ ] Browser opened automatically

### Option B: Two Terminals

**Terminal 1 - Server:**
- [ ] Navigated to `server` folder
- [ ] Ran: `npm run dev`
- [ ] See: `Server listening on port 5004`

**Terminal 2 - Client:**
- [ ] Navigated to `client` folder
- [ ] Ran: `npm start`
- [ ] Browser opened at `http://localhost:3000`

---

## ✅ Step 6: Verification Tests

### Basic Functionality

- [ ] Can access `http://localhost:3000`
- [ ] Login page loads
- [ ] Can log in with Firebase authentication
- [ ] Dashboard loads after login
- [ ] No console errors in browser
- [ ] No errors in server console

### Feature Tests

- [ ] Can view dashboard
- [ ] Can create an invoice
- [ ] Can view invoice list
- [ ] Can create a sale (inventory)
- [ ] Can create an expense
- [ ] Can view employees
- [ ] Can access payroll (if applicable)
- [ ] Can view reports

### Database Tests

- [ ] Tables created automatically
- [ ] Can insert data (create invoice/sale/expense)
- [ ] Can retrieve data (view lists)
- [ ] No database connection errors

---

## 🌐 Step 7: Network Access (Optional)

If accessing from another computer on network:

- [ ] Server IP address identified
- [ ] Client `.env` updated with server IP
- [ ] Firewall rule added for port 5004
- [ ] Can access from other computer: `http://SERVER_IP:3000`

---

## 🔧 Troubleshooting Checklist

If something doesn't work:

- [ ] Checked server console for errors
- [ ] Checked browser console for errors
- [ ] Verified `.env` file has correct values
- [ ] Verified SQL Server is running
- [ ] Verified Firebase config is correct
- [ ] Checked firewall settings
- [ ] Verified ports 3000 and 5004 are not in use
- [ ] Reinstalled dependencies if needed: `npm run install-all`

---

## 📝 Notes

**Date Setup:** _______________

**Computer Name/IP:** _______________

**SQL Server Version:** _______________

**Node.js Version:** _______________

**Issues Encountered:**
- 
- 
- 

**Solutions Applied:**
- 
- 
- 

---

## ✅ Final Sign-Off

- [ ] All checklist items completed
- [ ] Application running successfully
- [ ] All features tested and working
- [ ] Ready for use

**Completed by:** _______________

**Date:** _______________

---

**Reference Documents:**
- `QUICK_START_ANOTHER_COMPUTER.md` - Quick setup guide
- `SETUP_ON_NEW_COMPUTER.md` - Detailed setup guide
- `ENV_SQL_SERVER_SETUP.md` - SQL Server configuration
- `FIREBASE_SETUP_GUIDE.md` - Firebase setup
- `TROUBLESHOOTING.md` - General troubleshooting
