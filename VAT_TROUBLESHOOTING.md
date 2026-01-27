# VAT Module Troubleshooting Guide

## Issue: Cannot Save VAT Settings

### Symptoms
- Settings form shows "Failed to save VAT settings" error
- Settings don't persist after clicking "Save Settings"

### Debugging Steps

1. **Check Browser Console**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Try saving settings again
   - Look for error messages (red text)
   - Check Network tab for the API request to `/api/vat/settings`

2. **Check Server Logs**
   - Look at your server terminal/console
   - You should see logs like:
     ```
     [VAT] Updating settings: { ... }
     [VAT] Settings saved: { ... }
     ```
   - If you see errors, note the error message

3. **Verify Database Table Exists**
   ```sql
   USE [Biz];
   SELECT * FROM company_vat_settings;
   ```
   - If this fails, the table doesn't exist - run the migration script

4. **Check User Role**
   - Only `admin` or `accountant` roles can save VAT settings
   - Verify your user role in the database:
   ```sql
   SELECT uid, email, role FROM users WHERE email = 'your-email@example.com';
   ```

5. **Test API Directly**
   - Use browser DevTools Console:
   ```javascript
   // Get your Firebase token
   const token = await firebase.auth().currentUser.getIdToken();
   
   // Test the API
   fetch('http://localhost:5004/api/vat/settings', {
     method: 'PUT',
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       companyId: 1,
       trn: '100000000000003',
       vatEnabled: true,
       filingFrequency: 'monthly',
       filingDay: 28
     })
   })
   .then(r => r.json())
   .then(console.log)
   .catch(console.error);
   ```

### Common Fixes

**Fix 1: Table doesn't exist**
```sql
-- Run the migration script
-- File: server/create-vat-module.sql
```

**Fix 2: User role is incorrect**
```sql
-- Update user role to admin
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

**Fix 3: Missing default row**
```sql
-- Insert default settings if missing
INSERT INTO company_vat_settings (companyId, trn, vatEnabled, filingFrequency, filingDay)
VALUES (1, NULL, 0, 'monthly', 28);
```

---

## Issue: VAT Report Not Exporting

### Symptoms
- Clicking "Export CSV" or "Export PDF" does nothing
- Download starts but file is empty or corrupted
- Error message appears

### Debugging Steps

1. **Check Browser Console**
   - Open DevTools (F12) → Console
   - Try exporting again
   - Look for errors

2. **Check Network Tab**
   - Open DevTools → Network tab
   - Click export button
   - Find the request to `/api/vat/report`
   - Check:
     - Status code (should be 200)
     - Response headers (should have `Content-Type: text/csv` or `application/pdf`)
     - Response size (should be > 0)

3. **Check Server Logs**
   - Look for:
     ```
     [VAT] Exporting report: { format: 'csv', from: '...', to: '...' }
     [VAT] CSV export error: ...
     ```

4. **Verify Invoices Have VAT Data**
   ```sql
   -- Check if invoices have VAT columns populated
   SELECT TOP 5 
     invoiceNumber, 
     vatAmount, 
     taxableSubtotal, 
     totalWithVAT 
   FROM invoices 
   WHERE issueDate >= DATEADD(month, -1, GETDATE());
   ```

5. **Test Export with No Data**
   - Try exporting with a date range that has no invoices
   - Should still work (empty CSV/PDF)

### Common Fixes

**Fix 1: No invoices in date range**
- Select a date range that includes invoices
- Or create test invoices with VAT data

**Fix 2: Missing jspdf dependency**
```bash
cd server
npm install jspdf jspdf-autotable
```

**Fix 3: Headers already sent error**
- This happens if an error occurs after response headers are sent
- Check server logs for the actual error
- The export function should handle this, but check for errors before `res.write()`

**Fix 4: Transaction error**
- Check if SQL Server connection is stable
- Verify database permissions

---

## Quick Diagnostic Commands

### Check if VAT routes are registered
```bash
# In server terminal, you should see:
# ✓ VAT routes loaded
```

### Check if tables exist
```sql
USE [Biz];
SELECT 
  'company_vat_settings' AS TableName,
  CASE WHEN OBJECT_ID('dbo.company_vat_settings', 'U') IS NOT NULL THEN '✓ Exists' ELSE '✗ Missing' END AS Status
UNION ALL
SELECT 
  'vat_adjustments',
  CASE WHEN OBJECT_ID('dbo.vat_adjustments', 'U') IS NOT NULL THEN '✓ Exists' ELSE '✗ Missing' END;
```

### Check VAT columns in invoices
```sql
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'invoices'
  AND COLUMN_NAME IN ('vatType', 'vatAmount', 'supplierTRN', 'customerTRN')
ORDER BY COLUMN_NAME;
```

### Test VAT settings API
```bash
# Using curl (replace TOKEN with your Firebase token)
curl -X GET http://localhost:5004/api/vat/settings \
  -H "Authorization: Bearer TOKEN"

curl -X PUT http://localhost:5004/api/vat/settings \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"companyId":1,"trn":"100000000000003","vatEnabled":true,"filingFrequency":"monthly","filingDay":28}'
```

---

## Still Having Issues?

1. **Check Server Logs** - Look for detailed error messages
2. **Check Browser Console** - Look for network errors or API errors
3. **Verify Authentication** - Make sure you're logged in and token is valid
4. **Verify Role** - Must be `admin` or `accountant`
5. **Restart Server** - Sometimes a restart fixes route registration issues

### Enable Debug Logging

Add to your `.env` file:
```
NODE_ENV=development
```

This will show more detailed error messages in API responses.

---

## Expected Behavior

### Saving VAT Settings
1. Fill in TRN, enable VAT, set filing frequency/day
2. Click "Save Settings"
3. Should see green success message: "VAT settings saved successfully!"
4. Settings should persist (refresh page, settings should still be there)

### Exporting Reports
1. Select date range
2. Click "Export CSV" or "Export PDF"
3. Browser should download file immediately
4. File should open correctly (CSV in Excel, PDF in PDF viewer)
5. File should contain invoice data (if invoices exist in date range)

---

**Last Updated**: 2024-01-28

