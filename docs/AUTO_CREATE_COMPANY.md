# Auto-Create Company for New Email Domains

## 🎯 How It Works

When a new user logs in with an email domain that doesn't exist in the database:

1. **System detects** new domain (e.g., `newcustomer.com`)
2. **Automatically creates** a new company
3. **Creates domain mapping** (`newcustomer.com` → new companyId)
4. **Assigns user** to the new company
5. **Caches** the mapping for performance

---

## ✅ Benefits

- ✅ **No manual intervention** - Companies created automatically
- ✅ **Consistent** - Same domain always gets same companyId
- ✅ **Trackable** - All companies visible in database
- ✅ **Scalable** - Handles unlimited new customers

---

## ⚙️ Configuration

### **Enable Auto-Create (Default)**

Auto-create is enabled by default. To disable it:

**Option 1: Environment Variable**
```bash
# In .env file or environment
AUTO_CREATE_COMPANY=false
```

**Option 2: Code Change**
```javascript
// In server/services/companyDomainService.js
const AUTO_CREATE_COMPANY = false; // Disable auto-create
```

When disabled, unknown domains get `companyId = 1` (default company).

---

## 📋 What Gets Created

When a new domain is detected:

1. **New Company Record:**
   - `companyId`: Next available number (auto-incremented)
   - `name`: `"{domain} Company"` (e.g., "newcustomer.com Company")
   - `shopName`: `"{domain} Shop"`
   - `email`: `"info@{domain}"`
   - Other fields: Can be updated later by admin

2. **Domain Mapping:**
   - `emailDomain`: The new domain
   - `companyId`: The newly created companyId
   - `isActive`: `true`

---

## 🔍 Example Flow

**User logs in:** `john@newcustomer.com`

1. System checks: Is `newcustomer.com` in database? → **No**
2. System creates:
   - Company: `companyId = 4`, `name = "newcustomer.com Company"`
   - Mapping: `newcustomer.com` → `companyId = 4`
3. User gets: `companyId = 4`
4. Next user with `@newcustomer.com` → Gets same `companyId = 4` ✅

---

## 🛠️ Admin Actions After Auto-Create

After a company is auto-created, admin should:

1. **Update company details:**
   ```sql
   UPDATE companies 
   SET name = 'New Customer LLC',
       shopName = 'New Customer Shop',
       address = '123 Main St, Dubai, UAE',
       phone = '+971-4-123-4567',
       trn = 'TRN123456789'
   WHERE companyId = 4;
   ```

2. **Verify domain mapping:**
   ```sql
   SELECT * FROM company_email_domains WHERE companyId = 4;
   ```

---

## ⚠️ Important Notes

1. **Company Name:** Auto-generated names can be updated later
2. **Company Settings:** Admin should update company details after creation
3. **Cache:** Mapping is cached for 5 minutes (auto-refreshes)
4. **Error Handling:** If creation fails, user gets `companyId = 1` (safe fallback)

---

## 🔄 Disable Auto-Create

If you prefer manual company creation:

1. Set `AUTO_CREATE_COMPANY=false` in environment
2. Unknown domains will get `companyId = 1`
3. Admin can manually create companies and add mappings

---

## ✅ Summary

- **Auto-create enabled:** New domains → Auto-create company → Assign companyId
- **Auto-create disabled:** New domains → Assign `companyId = 1` (default)

**Recommended:** Keep auto-create enabled for seamless onboarding! 🚀

