# Dynamic Email Domain Mapping - No Code Changes Needed!

## 🎯 Problem

Currently, adding a new customer requires:
1. Updating `scripts/assign-companyid-to-existing-data.js`
2. Updating `server/middleware/authMiddleware.js`
3. Restarting the server
4. Running the assignment script

**This is not ideal for production!**

---

## ✅ Solution: Store Mappings in Database

Store email domain mappings in the database so you can add new customers through the admin UI without code changes!

---

## 📋 Implementation Options

### **Option 1: Use Company Table (Recommended)**

Add an `emailDomain` field to the `Company` table:

```sql
ALTER TABLE companies ADD emailDomain VARCHAR(255) NULL;
```

**How it works:**
- Each company has an `emailDomain` field
- When a user logs in, check their email domain against `companies.emailDomain`
- Assign the matching company's `companyId`

**Pros:**
- ✅ Simple - uses existing Company table
- ✅ One domain per company
- ✅ Easy to manage via admin UI

**Cons:**
- ❌ Only one domain per company

---

### **Option 2: Separate Mapping Table (Best for Multiple Domains)**

Create a `company_email_domains` table:

```sql
CREATE TABLE company_email_domains (
  id INT PRIMARY KEY IDENTITY(1,1),
  companyId INT NOT NULL,
  emailDomain VARCHAR(255) NOT NULL,
  isActive BIT NOT NULL DEFAULT 1,
  createdAt DATETIME DEFAULT GETDATE(),
  updatedAt DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (companyId) REFERENCES companies(companyId)
);

CREATE INDEX IX_CompanyEmailDomains_Domain ON company_email_domains(emailDomain);
CREATE INDEX IX_CompanyEmailDomains_CompanyId ON company_email_domains(companyId);
```

**How it works:**
- Multiple email domains can map to one company
- Example: `customera.com` and `customera-ae.com` → both map to Company 1
- Easy to add/remove domains via admin UI

**Pros:**
- ✅ Multiple domains per company
- ✅ Can enable/disable domains
- ✅ More flexible

**Cons:**
- ❌ Requires new table

---

## 🚀 Recommended: Option 2 (Mapping Table)

This is the best solution for production. Let me implement it for you!

