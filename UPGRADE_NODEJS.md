# Upgrade Node.js to 20 LTS

## Current Issue

You're running **Node.js 14.17.3**, but SQL Server packages require **Node.js 18+**.

The error `SyntaxError: Unexpected token '??='` occurs because Node.js 14 doesn't support this modern JavaScript syntax.

## Solution: Upgrade to Node.js 20 LTS

### Option 1: Download and Install (Recommended)

1. **Download Node.js 20 LTS:**
   - Go to: https://nodejs.org/
   - Download the **Windows Installer (.msi)** for **LTS version** (currently 20.x)
   - Choose the 64-bit version

2. **Run the installer:**
   - Double-click the downloaded `.msi` file
   - Follow the installation wizard
   - **Important:** Check "Automatically install necessary tools" if prompted
   - The installer will automatically update your PATH

3. **Verify installation:**
   ```powershell
   node --version
   # Should show: v20.x.x
   
   npm --version
   # Should show: 10.x.x or higher
   ```

4. **Restart your terminal/PowerShell** after installation

### Option 2: Using NVM (Node Version Manager)

If you want to manage multiple Node.js versions:

1. **Download NVM for Windows:**
   - Go to: https://github.com/coreybutler/nvm-windows/releases
   - Download `nvm-setup.exe`
   - Install it

2. **Install Node.js 20:**
   ```powershell
   nvm install 20
   nvm use 20
   ```

3. **Verify:**
   ```powershell
   node --version
   ```

## After Upgrading

1. **Reinstall dependencies** (important!):
   ```powershell
   cd D:\Personal\Biz\server
   npm install
   ```

2. **Verify SQL Server packages:**
   ```powershell
   npm list sequelize mssql tedious
   ```

3. **Test the server:**
   ```powershell
   npm run dev
   ```

## Why This Is Needed

- **Node.js 14**: Released in 2020, doesn't support modern JavaScript features
- **Node.js 18+**: Required by `tedious` (SQL Server driver)
- **Node.js 20 LTS**: Current LTS version, recommended for production

## Troubleshooting

### "node is not recognized"
- Restart your terminal/PowerShell
- Check if Node.js is in your PATH: `where node`
- Reinstall Node.js and ensure "Add to PATH" is checked

### "npm install fails"
- Delete `node_modules` folder: `Remove-Item -Recurse -Force node_modules`
- Delete `package-lock.json`: `Remove-Item package-lock.json`
- Run `npm install` again

### Still getting errors
- Make sure you restarted your terminal after installing Node.js
- Verify version: `node --version` should show v20.x.x
- Try clearing npm cache: `npm cache clean --force`

