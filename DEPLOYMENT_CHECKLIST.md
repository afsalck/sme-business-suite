# 🚀 Quick Deployment Checklist

Use this checklist to ensure you don't miss any steps during deployment.

---

## 📋 Pre-Deployment

- [ ] **Firebase Project** set up with Authentication enabled
- [ ] **Firebase Service Account Key** downloaded (JSON file)
- [ ] **SQL Server Database** accessible from internet (or deployment platform)
- [ ] **Domain name** purchased (optional)
- [ ] **GitHub repository** created and code pushed
- [ ] **Environment variables** documented

---

## 🔐 Environment Variables Setup

### Frontend (Client)
- [ ] `REACT_APP_FIREBASE_API_KEY`
- [ ] `REACT_APP_FIREBASE_AUTH_DOMAIN`
- [ ] `REACT_APP_FIREBASE_PROJECT_ID`
- [ ] `REACT_APP_FIREBASE_STORAGE_BUCKET`
- [ ] `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `REACT_APP_FIREBASE_APP_ID`
- [ ] `REACT_APP_API_BASE_URL` (backend URL)

### Backend (Server)
- [ ] `PORT` (usually auto-set by platform)
- [ ] `NODE_ENV=production`
- [ ] `DB_HOST`
- [ ] `DB_PORT=1433`
- [ ] `DB_NAME=bizease`
- [ ] `DB_USER`
- [ ] `DB_PASSWORD`
- [ ] `DB_ENCRYPT=true`
- [ ] `DB_TRUST_CERT=false`
- [ ] `CLIENT_URL` (frontend URL)
- [ ] `FIREBASE_SERVICE_ACCOUNT` (JSON string)

---

## 🌐 Deployment Steps

### Option 1: Vercel + Railway (Recommended)

#### Frontend (Vercel)
- [ ] Sign up/login to Vercel
- [ ] Import GitHub repository
- [ ] Set Root Directory: `client`
- [ ] Set Build Command: `npm run build`
- [ ] Set Output Directory: `build`
- [ ] Add all frontend environment variables
- [ ] Deploy and note URL

#### Backend (Railway)
- [ ] Sign up/login to Railway
- [ ] Create new project from GitHub
- [ ] Set Root Directory: `server`
- [ ] Set Start Command: `npm start`
- [ ] Add all backend environment variables
- [ ] Note backend URL
- [ ] Update frontend `REACT_APP_API_BASE_URL` in Vercel
- [ ] Redeploy frontend

---

## ✅ Post-Deployment Verification

- [ ] **Health Check**: Visit `https://your-backend-url/health`
  - Should return: `{"status":"ok","database":{"state":"connected"}}`

- [ ] **Frontend Loads**: Visit frontend URL
  - Should see login page

- [ ] **Authentication**: Try logging in
  - Should work and redirect to dashboard

- [ ] **API Calls**: Check browser DevTools → Network
  - API calls should go to backend URL
  - Responses should be successful

- [ ] **Database**: Check backend logs
  - Should see: `✅ SQL Server connection established successfully`

- [ ] **File Uploads**: Test uploading a file
  - Should save correctly

---

## 🔧 Common Issues to Check

- [ ] CORS errors? → Check `CLIENT_URL` in backend
- [ ] Database connection fails? → Check firewall and credentials
- [ ] Firebase errors? → Verify all Firebase env variables
- [ ] Blank page? → Check build logs and env variables
- [ ] 401 errors? → Verify Firebase service account JSON

---

## 📝 Notes

- Keep your `.env` files secure (never commit to Git)
- Update `CLIENT_URL` if you change frontend domain
- Monitor logs for errors
- Set up database backups
- Consider cloud storage for `uploads/` folder

---

**Ready to deploy?** Follow the detailed guide in `DEPLOYMENT_GUIDE.md` 🚀

