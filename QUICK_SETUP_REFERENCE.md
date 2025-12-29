# ⚡ Quick Setup Reference Card

## 🚀 Fast Setup (5 Minutes)

### 1. Install Prerequisites
```powershell
# Check Node.js (need v16+)
node --version

# Check npm
npm --version
```

### 2. Copy Project
- Copy entire `Biz` folder to new computer
- Place in: `D:\Personal\Biz` (or any location)

### 3. Install Dependencies
```powershell
cd D:\Personal\Biz
npm run install-all
```

### 4. Create `.env` File
Create `D:\Personal\Biz\.env`:
```env
DB_HOST=localhost
DB_PORT=1433
DB_NAME=bizease
DB_USER=sa
DB_PASSWORD=YourPassword
DB_ENCRYPT=false
DB_TRUST_CERT=true
PORT=5004
NODE_ENV=development
REACT_APP_API_BASE_URL=http://localhost:5004/api
```

### 5. Configure Firebase
- Open: `client/src/config/firebase.js`
- Update with your Firebase credentials
- See: `FIREBASE_SETUP_GUIDE.md`

### 6. Start Application
```powershell
npm start
```

**That's it!** Open `http://localhost:3000`

---

## 🔧 Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| SQL Server connection failed | Check `.env` DB credentials |
| Port 5004 in use | Change `PORT=5005` in `.env` |
| Module not found | Run `npm run install-all` |
| Firebase auth failed | Update `client/src/config/firebase.js` |
| Can't access from network | Update `REACT_APP_API_BASE_URL` in `.env` |

---

## 📍 Important Paths

- **Root:** `D:\Personal\Biz`
- **Server:** `D:\Personal\Biz\server`
- **Client:** `D:\Personal\Biz\client`
- **Config:** `D:\Personal\Biz\.env`
- **Firebase Config:** `D:\Personal\Biz\client\src\config\firebase.js`

---

## 🎯 Ports

- **3000** - React Client (Frontend)
- **5004** - Express Server (Backend API)
- **1433** - SQL Server Database

---

## 📞 Need Help?

See: `SETUP_ON_NEW_COMPUTER.md` for detailed instructions
