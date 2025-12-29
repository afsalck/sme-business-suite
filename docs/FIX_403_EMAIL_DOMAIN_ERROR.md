# Fix: 403 Email Domain Not Authorized Error

## Problem

Getting this error when trying to login:
```
{
  "status": 403,
  "message": "Access denied: Your email domain is not authorized. Please contact administrator.",
  "code": "ERR_BAD_REQUEST"
}
```

## Cause

The system blocks email domains that aren't mapped to a company in the `company_email_domains` table. This is a security feature for multi-tenancy.

## Solution

### Option 1: Add Your Email Domain to Database (Recommended for Regular Users)

Add your email domain to the database:

```sql
-- Check existing mappings
SELECT * FROM company_email_domains;

-- Add your domain (replace 'yourdomain.com' with your actual domain)
INSERT INTO company_email_domains (companyId, emailDomain, isActive, createdAt, updatedAt)
VALUES (1, 'yourdomain.com', 1, GETDATE(), GETDATE());
```

### Option 2: Configure as Developer (For Developers)

If you're a developer, you can bypass domain restrictions. Edit `server/middleware/authMiddleware.js` and add your email to the developer list:

```javascript
// In isDeveloperEmail() function, add your email:
const developerEmails = [
  'developer@bizease.ae',
  'admin@bizease.ae',
  'your-email@example.com'  // ← Add your email here
];
```

Or use environment variable:
```bash
# In .env file
DEVELOPER_EMAILS=your-email@example.com,another@example.com
```

### Option 3: Disable Domain Blocking (Not Recommended)

Edit `server/services/companyDomainService.js`:
```javascript
// Change this:
const BLOCK_UNMAPPED_DOMAINS = true;

// To this:
const BLOCK_UNMAPPED_DOMAINS = false;
```

⚠️ **Warning:** This allows any email domain to access the system.

## Current Developer Configuration

Developers are identified by:
- Email ending with `@bizease.ae`
- Email ending with `@developer.com`
- Email matching `developer@bizease.ae` or `admin@bizease.ae`
- Emails in `DEVELOPER_EMAILS` environment variable

## Quick Fix

**For immediate access, add your email to the developer list:**

1. Open `server/middleware/authMiddleware.js`
2. Find the `isDeveloperEmail()` function (around line 9)
3. Add your email to the `developerEmails` array
4. Restart your server

## Verify Fix

After making changes:
1. Restart your server
2. Try logging in again
3. Check server logs for: `[Auth] ✅ Developer access granted` or `[Auth] ✅ User created`

## For Production

For production, you should:
1. Add all authorized email domains to `company_email_domains` table
2. Keep developer bypass only for actual developers
3. Monitor logs for unauthorized access attempts

