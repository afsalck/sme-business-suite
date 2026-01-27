# Node.js Version Upgrade Required

## Problem
The server is failing with error: `Please install tedious package manually`

## Root Cause
Your current Node.js version is **v14.17.3**, which doesn't support the `node:os` module syntax required by `tedious@14.7.0` and its dependencies (specifically `@azure/identity`).

The `node:` protocol prefix for core modules was introduced in **Node.js 14.18.0**.

## Solution

### Option 1: Upgrade Node.js (Recommended)
1. Download and install Node.js LTS version (18.x or 20.x) from https://nodejs.org/
2. Restart your terminal/command prompt
3. Verify the version: `node --version`
4. Run `cd server && npm install` to reinstall dependencies
5. Start your server: `npm run dev`

### Option 2: Use nvm (Node Version Manager) - Recommended for Development
If you use Windows:
1. Install nvm-windows from: https://github.com/coreybutler/nvm-windows
2. Install Node.js 18 LTS: `nvm install 18`
3. Use it: `nvm use 18`
4. Verify: `node --version`
5. Run `cd server && npm install`
6. Start server: `npm run dev`

### Minimum Required Version
- **Minimum**: Node.js 14.18.0
- **Recommended**: Node.js 18.x LTS or 20.x LTS

## Why This Happened
The `tedious` package (SQL Server driver) version 14.7.0 and above includes dependencies that use modern Node.js features, specifically the `node:os` module syntax which requires Node.js 14.18.0 or higher.

## Alternative Workaround (Not Recommended)
If you cannot upgrade Node.js, you would need to use a very old version of `tedious` (pre-12.x), but this is **not recommended** as it may have security vulnerabilities and compatibility issues with Sequelize 6.37.7.
