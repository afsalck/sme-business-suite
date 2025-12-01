# Step-by-Step Node.js Upgrade Guide

## Current Situation
- **Your Node.js**: v14.17.3 (too old)
- **Required**: Node.js 18+ (20 LTS recommended)
- **Problem**: SQL Server packages won't work with Node.js 14

## Method 1: Standard Installer (Easiest)

### Step 1: Download
1. Open your web browser
2. Go to: **https://nodejs.org/**
3. You'll see two green buttons:
   - **LTS** (left) - This is what you want! ✅
   - **Current** (right) - Don't use this
4. Click the **LTS** button
5. It will download `node-v20.x.x-x64.msi` (about 30MB)

### Step 2: Install
1. Go to your **Downloads** folder
2. Find the file: `node-v20.x.x-x64.msi`
3. **Right-click** on it
4. Select **"Run as administrator"** (important!)
5. Click **"Yes"** if Windows asks for permission
6. In the installer:
   - Click **"Next"**
   - Accept the license agreement, click **"Next"**
   - Keep the default installation path, click **"Next"**
   - **IMPORTANT**: Make sure "Automatically install the necessary tools" is checked
   - Click **"Next"**
   - Click **"Install"**
   - Wait for it to finish (takes 1-2 minutes)
   - Click **"Finish"**

### Step 3: Restart PowerShell
1. **Close this PowerShell window completely**
2. Open a **NEW** PowerShell window
3. This is critical - the PATH won't update in existing windows

### Step 4: Verify
Type this in the NEW PowerShell:
```powershell
node --version
```

**Expected output**: `v20.x.x` (NOT v14.17.3)

If you still see `v14.17.3`, try:
```powershell
refreshenv
node --version
```

## Method 2: Using NVM (If Method 1 doesn't work)

### Step 1: Install NVM for Windows
1. Go to: **https://github.com/coreybutler/nvm-windows/releases**
2. Download: **nvm-setup.exe** (latest version)
3. Run the installer
4. Follow the installation wizard

### Step 2: Install Node.js 20
Open PowerShell (as Administrator) and run:
```powershell
nvm install 20
nvm use 20
```

### Step 3: Verify
```powershell
node --version
# Should show: v20.x.x
```

## Method 3: Manual Uninstall + Reinstall

If the above methods don't work:

### Step 1: Uninstall Old Node.js
1. Open **Settings** → **Apps** → **Apps & features**
2. Search for "Node.js"
3. Click on it → **Uninstall**
4. Restart your computer

### Step 2: Install New Node.js
1. Go to: **https://nodejs.org/**
2. Download the LTS version
3. Install as Administrator
4. Restart computer

### Step 3: Verify
```powershell
node --version
```

## Troubleshooting

### "node is not recognized" after installation
1. Close ALL PowerShell/Command Prompt windows
2. Open a NEW PowerShell window
3. Try: `node --version`
4. If still not working:
   ```powershell
   $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
   node --version
   ```

### Still seeing old version
1. Check if you have multiple Node.js installations:
   ```powershell
   where.exe node
   ```
2. If multiple paths show up, uninstall all Node.js versions
3. Reinstall fresh

### Installation fails
- Make sure you're running as Administrator
- Disable antivirus temporarily
- Check Windows Update is current

## After Successful Upgrade

Once `node --version` shows `v20.x.x`:

1. **Navigate to server directory:**
   ```powershell
   cd D:\Personal\Biz\server
   ```

2. **Reinstall packages:**
   ```powershell
   npm install
   ```

3. **Start the server:**
   ```powershell
   npm run dev
   ```

4. **You should see:**
   ```
   ✅ Connected to SQL Server successfully
   ✅ Server listening on port 5004
   ```

## Need Help?

If you're stuck at any step:
1. Tell me which step you're on
2. Share any error messages you see
3. I'll help you troubleshoot

## Why This Is Necessary

- **Node.js 14**: Released 2020, doesn't support modern JavaScript
- **Node.js 20**: Current LTS, supports all modern features
- **SQL Server packages**: Require Node.js 18+ to work

**The upgrade is mandatory - there's no workaround!** 🚀

