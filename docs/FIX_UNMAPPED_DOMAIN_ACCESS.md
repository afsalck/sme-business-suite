# Fix: Unmapped Domain Users Seeing All Data

## 🔍 Problem

New user with email that doesn't have `biz.com` domain is still seeing all data.

**Why this happens:**
- Unmapped domains default to `companyId = 1`
- All your existing data is `companyId = 1`
- So unmapped domain users see everything!

---

## ✅ Solutions

### **Option 1: Block Unmapped Domains (Recommended)**

Only allow `@biz.com` users. Reject others:

```javascript
// In authMiddleware.js - reject unmapped domains
if (!mapping) {
  // Domain not found - reject login
  return res.status(403).json({ 
    message: "Access denied: Email domain not authorized" 
  });
}
```

### **Option 2: Assign Unmapped Domains to Different CompanyId**

Assign unmapped domains to `companyId = 999` (or 0) so they see nothing:

```javascript
// In companyDomainService.js
const companyId = mapping ? mapping.companyId : 999; // Different companyId
```

### **Option 3: Create Separate Company for Unmapped Domains**

Create `companyId = 2` for unmapped domains, keep `companyId = 1` for biz.com only.

---

## 🎯 Recommended: Option 1 (Block Unmapped Domains)

This is the safest - only `@biz.com` users can access.

Let me implement this for you!

