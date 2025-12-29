# Block Unmapped Email Domains

## 🎯 Problem

Users with unmapped email domains (not `@biz.com`) are still seeing all data because:
- Unmapped domains default to `companyId = 1`
- All existing data is `companyId = 1`
- So they see everything!

---

## ✅ Solution: Block Unmapped Domains

Now the system will **reject** users with unmapped email domains.

---

## ⚙️ Configuration

### **Enable Blocking (Recommended)**

Set environment variable:

```bash
# In .env file or environment
BLOCK_UNMAPPED_DOMAINS=true
```

Or update code:

```javascript
// In server/services/companyDomainService.js
const BLOCK_UNMAPPED_DOMAINS = true; // Enable blocking
```

### **Disable Blocking (Allow All Domains)**

```bash
BLOCK_UNMAPPED_DOMAINS=false
# or remove the variable
```

---

## 🔄 How It Works

**When enabled:**
1. User logs in with `user@gmail.com` (not in database)
2. System checks: Is `gmail.com` mapped? → **No**
3. System **rejects** login with error: "Access denied: Your email domain is not authorized"
4. User cannot access the system

**When disabled:**
1. User logs in with `user@gmail.com` (not in database)
2. System checks: Is `gmail.com` mapped? → **No**
3. System assigns `companyId = 1` (default)
4. User sees all data (current behavior)

---

## 📋 Current Setup

- ✅ `biz.com` → `companyId = 1` (allowed)
- ❌ All other domains → **Blocked** (if `BLOCK_UNMAPPED_DOMAINS=true`)

---

## 🚀 Enable Now

**Option 1: Environment Variable (Recommended)**

Create/update `.env` file:
```bash
BLOCK_UNMAPPED_DOMAINS=true
```

**Option 2: Code Change**

Edit `server/services/companyDomainService.js`:
```javascript
const BLOCK_UNMAPPED_DOMAINS = true; // Enable blocking
```

Then **restart your server**.

---

## ✅ After Enabling

- ✅ Only `@biz.com` users can login
- ❌ All other domains are rejected
- ✅ Unauthorized users see error message
- ✅ System is secure

---

## 🔍 Test

1. Enable blocking
2. Restart server
3. Try to login with `test@gmail.com` → Should be rejected
4. Try to login with `test@biz.com` → Should work ✅

---

## 📝 Error Message

When blocked, users see:
```
Access denied: Your email domain is not authorized. Please contact administrator.
```

---

**Enable blocking to secure your system!** 🔒

