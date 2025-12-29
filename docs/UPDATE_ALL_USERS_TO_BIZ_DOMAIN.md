# Update All Existing Users to Biz Domain

## 🎯 Two Options

### **Option 1: Change User Emails to @biz.com**

If you want to change all existing user emails to have `@biz.com` domain:

```sql
-- Update all user emails to @biz.com (keeping username part)
UPDATE users 
SET email = SUBSTRING(email, 1, CHARINDEX('@', email) - 1) + '@biz.com'
WHERE email NOT LIKE '%@biz.com';
```

**Example:**
- `john@gmail.com` → `john@biz.com`
- `admin@customera.com` → `admin@biz.com`

**⚠️ Warning:** This changes the actual email addresses. Make sure this is what you want!

---

### **Option 2: Assign All Users to companyId = 2 (Biz Company)**

If you just want all existing users to have `companyId = 2` (which is what `biz.com` maps to):

```sql
-- Update all users to companyId = 2
UPDATE users 
SET companyId = 2
WHERE companyId != 2;
```

**This is safer** - it doesn't change email addresses, just assigns them to the biz company.

---

## 📋 Recommended: Option 2

I recommend **Option 2** because:
- ✅ Doesn't change email addresses
- ✅ Users keep their original emails
- ✅ Just assigns them to companyId = 2
- ✅ When they login, they'll be in the biz company

---

## 🔍 Verify Before/After

**Before:**
```sql
SELECT companyId, COUNT(*) as user_count
FROM users
GROUP BY companyId
ORDER BY companyId;
```

**After (Option 2):**
```sql
-- Should show all users with companyId = 2
SELECT companyId, COUNT(*) as user_count
FROM users
GROUP BY companyId;
-- Result: companyId = 2, user_count = (total users)
```

---

## ✅ Complete SQL Script

```sql
-- Step 1: Check current distribution
SELECT companyId, COUNT(*) as user_count
FROM users
GROUP BY companyId
ORDER BY companyId;

-- Step 2: Update all users to companyId = 2
UPDATE users 
SET companyId = 2
WHERE companyId != 2;

-- Step 3: Verify update
SELECT companyId, COUNT(*) as user_count
FROM users
GROUP BY companyId;

-- Step 4: Show updated users
SELECT id, email, companyId, role, createdAt
FROM users
ORDER BY createdAt DESC;
```

---

## 🎯 Which One Do You Need?

- **Option 1:** Change actual email addresses to @biz.com
- **Option 2:** Keep emails, just assign companyId = 2 ✅ (Recommended)

Let me know which one you prefer!

