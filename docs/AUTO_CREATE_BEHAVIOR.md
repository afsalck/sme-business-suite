# Auto-Create Company Behavior

## 🔄 Current Behavior (Auto-Create Enabled)

When a new user logs in via Firebase with a new email domain:

### **Scenario 1: Domain is `biz.com`**
1. System checks: Is `biz.com` in database? → **Yes**
2. User gets: `companyId = 1` ✅
3. User sees: All data for companyId = 1

### **Scenario 2: Domain is NOT `biz.com` (e.g., `gmail.com`)**
1. System checks: Is `gmail.com` in database? → **No**
2. System checks: Is blocking enabled? → **No** (default)
3. System checks: Is auto-create enabled? → **Yes** (default)
4. System **auto-creates**:
   - New Company: `companyId = 4` (next available)
   - Company Name: `"gmail.com Company"`
   - Domain Mapping: `gmail.com` → `companyId = 4`
5. User gets: `companyId = 4`
6. User sees: **Nothing** (no data for companyId = 4) ✅

---

## ⚙️ Configuration Options

### **Option 1: Auto-Create Enabled (Current - Default)**
```javascript
AUTO_CREATE_COMPANY = true
BLOCK_UNMAPPED_DOMAINS = false
```

**Behavior:**
- ✅ New domains → Auto-create company
- ✅ User gets new companyId
- ✅ User sees nothing (isolated)
- ❌ Creates many companies automatically

### **Option 2: Block Unmapped Domains (Recommended for You)**
```javascript
AUTO_CREATE_COMPANY = false
BLOCK_UNMAPPED_DOMAINS = true
```

**Behavior:**
- ✅ Only `biz.com` users can login
- ❌ All other domains → **Rejected**
- ✅ No auto-creation
- ✅ Secure

### **Option 3: Default to companyId = 1 (Not Recommended)**
```javascript
AUTO_CREATE_COMPANY = false
BLOCK_UNMAPPED_DOMAINS = false
```

**Behavior:**
- ❌ New domains → `companyId = 1`
- ❌ Users see all data (security issue!)
- ❌ Not recommended

---

## 🎯 Recommended for You

Since you only want `biz.com` users:

**Enable Blocking:**
```javascript
// In server/services/companyDomainService.js
const BLOCK_UNMAPPED_DOMAINS = true; // Enable blocking
```

**Result:**
- ✅ Only `@biz.com` users can login
- ❌ All other domains → **Rejected**
- ✅ No auto-creation
- ✅ Secure

---

## 📋 Summary

**Current (Auto-Create Enabled):**
- New domain → Auto-creates company → User gets new companyId → User sees nothing ✅

**With Blocking Enabled:**
- New domain → **Rejected** → User cannot login ✅

**Which do you prefer?**

