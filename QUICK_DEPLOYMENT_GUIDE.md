# 🚀 Quick Deployment Guide - BizEase UAE

A simple, step-by-step guide to deploy your application to production.

---

## 📋 Quick Overview

**Recommended Setup:** Vercel (Frontend) + Railway (Backend) + Azure SQL (Database)

**Cost:** $5-15/month (or FREE for first month)

**Time:** 30-60 minutes

---

## ✅ Pre-Deployment Checklist

Before you start, make sure you have:

- [ ] **GitHub account** and code pushed to repository
- [ ] **Firebase project** created with Authentication enabled
- [ ] **Firebase Service Account Key** downloaded (JSON file)
- [ ] **SQL Server database** ready (Azure SQL, AWS RDS, or your own)
- [ ] **Database connection details** (host, port, username, password)

---

## 🚀 Step-by-Step Deployment

### **Step 1: Deploy Frontend to Vercel (5 minutes)**

1. **Go to [Vercel.com](https://vercel.com)** and sign up/login

2. **Click "New Project"** → Import your GitHub repository

3. **Configure Project:**
   - **Framework Preset:** Create React App
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
   - **Install Command:** `npm install`

4. **Add Environment Variables** (Project Settings → Environment Variables):
   ```
   REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
   REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef
   REACT_APP_API_BASE_URL=https://your-backend-url.com/api
   ```
   (You'll update `REACT_APP_API_BASE_URL` after deploying backend)

5. **Click "Deploy"** and wait for build to complete

6. **Note your frontend URL:** `https://your-app.vercel.app`

---

### **Step 2: Deploy Backend to Railway (10 minutes)**

1. **Go to [Railway.app](https://railway.app)** and sign up/login

2. **Click "New Project"** → "Deploy from GitHub repo"

3. **Select your repository**

4. **Configure Service:**
   - Railway auto-detects Node.js
   - **Root Directory:** `server`
   - **Start Command:** `npm start` (or check your `package.json`)

5. **Add Environment Variables** (Variables tab):
   ```
   NODE_ENV=production
   PORT=5004
   
   # Database
   DB_HOST=your-sql-server-host
   DB_PORT=1433
   DB_NAME=bizease
   DB_USER=your-db-username
   DB_PASSWORD=your-strong-password
   DB_ENCRYPT=true
   DB_TRUST_CERT=false
   
   # CORS
   CLIENT_URL=https://your-app.vercel.app
   
   # Firebase Service Account (paste entire JSON as one line)
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
   ```

6. **Get your backend URL:** Railway provides `https://your-app.up.railway.app`

7. **Update Frontend:** Go back to Vercel and update `REACT_APP_API_BASE_URL` to your Railway URL

---

### **Step 3: Set Up Database (If Not Already Done)**

#### **Option A: Azure SQL Database (Recommended - $5/month)**

1. **Go to [Azure Portal](https://portal.azure.com)**
2. **Create SQL Database:**
   - Click "Create a resource" → "SQL Database"
   - **Server:** Create new server
   - **Database name:** `bizease-prod`
   - **Pricing tier:** Basic ($5/month)
   - **Authentication:** SQL authentication
   - Create admin username and password

3. **Configure Firewall:**
   - Go to your SQL server → "Networking"
   - Enable "Allow Azure services"
   - Add Railway IPs (or allow all temporarily for testing)

4. **Get Connection Details:**
   - Server: `your-server.database.windows.net`
   - Database: `bizease-prod`
   - Username: `admin@your-server`
   - Password: (your password)

5. **Update Railway Environment Variables** with these details

#### **Option B: Use Existing Database**

If you already have a SQL Server database:
- Update Railway environment variables with your existing database details
- Make sure firewall allows connections from Railway

---

### **Step 4: Run Database Migration (If Needed)**

If you added the `enabledModules` column feature:

1. **SSH into your database** or use Azure Portal query editor
2. **Run the migration:**
   ```sql
   -- Check if column exists
   SELECT COLUMN_NAME 
   FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_NAME = 'companies' AND COLUMN_NAME = 'enabledModules';
   
   -- If not exists, add it
   ALTER TABLE companies 
   ADD enabledModules NTEXT NULL;
   ```

Or run the migration script:
```bash
cd server
node ../scripts/add-enabled-modules-column.js
```

---

### **Step 5: Configure Firebase Service Account**

1. **Go to [Firebase Console](https://console.firebase.google.com)**
2. **Project Settings** → **Service Accounts**
3. **Generate New Private Key** → Download JSON file
4. **Copy entire JSON content** and paste as `FIREBASE_SERVICE_ACCOUNT` in Railway
   - Remove all line breaks
   - It should be one long string: `{"type":"service_account",...}`

---

### **Step 6: Test Deployment**

1. **Visit your frontend URL:** `https://your-app.vercel.app`
   - Should see login page ✅

2. **Check backend health:** `https://your-backend.up.railway.app/health`
   - Should return: `{"status":"ok","database":{"state":"connected"}}` ✅

3. **Test login:**
   - Try logging in with Firebase
   - Should redirect to dashboard ✅

4. **Check browser console:**
   - No CORS errors ✅
   - API calls successful ✅

---

## 🔧 Common Issues & Solutions

### **Issue: Backend won't start**
- ✅ Check environment variables are all set
- ✅ Verify Node.js version (should be 18+)
- ✅ Check Railway logs for specific errors

### **Issue: Database connection fails**
- ✅ Verify firewall allows Railway IPs
- ✅ Check database credentials
- ✅ For Azure SQL: Enable "Allow Azure services"

### **Issue: CORS errors**
- ✅ Verify `CLIENT_URL` in Railway matches your Vercel URL exactly
- ✅ Check that frontend `REACT_APP_API_BASE_URL` is correct

### **Issue: 401/403 errors**
- ✅ Verify Firebase Service Account JSON is correct
- ✅ Check that Firebase Authentication is enabled
- ✅ Verify user has proper role in database

### **Issue: Frontend shows blank page**
- ✅ Check Vercel build logs for errors
- ✅ Verify all `REACT_APP_*` environment variables are set
- ✅ Check browser console for errors

---

## 📝 Environment Variables Reference

### **Frontend (Vercel)**
```env
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
REACT_APP_FIREBASE_PROJECT_ID=...
REACT_APP_FIREBASE_STORAGE_BUCKET=...
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...
REACT_APP_API_BASE_URL=https://your-backend.up.railway.app/api
```

### **Backend (Railway)**
```env
NODE_ENV=production
PORT=5004
DB_HOST=your-db-host
DB_PORT=1433
DB_NAME=bizease
DB_USER=your-username
DB_PASSWORD=your-password
DB_ENCRYPT=true
DB_TRUST_CERT=false
CLIENT_URL=https://your-app.vercel.app
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

---

## 💰 Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| **Vercel (Frontend)** | FREE | Hobby plan - 100GB bandwidth/month |
| **Railway (Backend)** | $5/month | Starter plan - $5 credit included |
| **Azure SQL Database** | $5/month | Basic tier - 2GB storage |
| **Firebase** | FREE | Spark plan - 50K users/month |
| **Domain** | $1/month | Optional - ~$12/year for .com |
| **TOTAL** | **$5-6/month** | ✅ |

**First month can be FREE** if you use Railway free trial!

---

## ✅ Post-Deployment Checklist

- [ ] Frontend loads at Vercel URL
- [ ] Backend health check returns OK
- [ ] Can log in with Firebase
- [ ] Dashboard loads with data
- [ ] API calls work (check Network tab)
- [ ] Database connection successful (check logs)
- [ ] No CORS errors
- [ ] File uploads work (if applicable)

---

## 🎯 Next Steps

1. **Set up custom domain** (optional)
   - Add domain in Vercel settings
   - Update `CLIENT_URL` in Railway
   - Update `REACT_APP_API_BASE_URL` in Vercel

2. **Set up monitoring**
   - Use Railway's built-in monitoring
   - Set up UptimeRobot (FREE) for uptime monitoring

3. **Configure backups**
   - Azure SQL has automatic backups
   - Consider manual backups for important data

4. **Optimize performance**
   - Enable caching
   - Optimize images
   - Monitor usage

---

## 📚 Additional Resources

- **Detailed Guide:** See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Free Deployment:** See [DEPLOY_FOR_FREE.md](./DEPLOY_FOR_FREE.md)
- **Cost Breakdown:** See [DEPLOYMENT_COSTS.md](./DEPLOYMENT_COSTS.md)
- **Azure Specific:** See [AZURE_HOSTING_COSTS.md](./AZURE_HOSTING_COSTS.md)

---

## 🆘 Need Help?

1. **Check deployment platform logs:**
   - Vercel: Project → Deployments → View logs
   - Railway: Service → Deployments → View logs

2. **Check browser console:**
   - Open DevTools (F12) → Console tab
   - Look for errors

3. **Check Network tab:**
   - DevTools → Network tab
   - See which API calls are failing

4. **Verify environment variables:**
   - Make sure all variables are set correctly
   - Check for typos
   - Ensure no extra spaces

---

## 🎉 You're Done!

Your application should now be live and accessible to users!

**Your URLs:**
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.up.railway.app`

**Remember to:**
- Monitor usage and costs
- Set up backups
- Keep dependencies updated
- Monitor for errors

Good luck with your deployment! 🚀
