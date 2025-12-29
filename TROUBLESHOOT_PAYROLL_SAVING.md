# Troubleshooting Payroll Saving Issues

## Quick Checks

### 1. **Check if Database Tables Exist**

The payroll module requires database tables to be created first. Run this SQL script:

```sql
-- File: server/create-payroll-module.sql
```

**To check if tables exist:**
```sql
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME IN ('payroll_periods', 'payroll_records', 'employee_salary_structure')
```

If tables don't exist, run the migration script.

---

### 2. **Check Server Console Logs**

When you try to save a payroll period, check your server console (where `npm run dev` is running). You should see:

**Success:**
```
[Payroll Controller] Received request to create period: {...}
[Payroll] Creating payroll period: {...}
[Payroll] ✓ Payroll period created successfully: 1
[Payroll Controller] ✓ Period created successfully, returning response
```

**Error:**
```
[Payroll Controller] ✗ Create period error: ...
[Payroll] Error details: {...}
```

---

### 3. **Check Browser Console**

Open browser Developer Tools (F12) → Console tab. You should see:

**Success:**
```
[Payroll Periods] Submitting form: {...}
[Payroll Periods] Response received: {...}
```

**Error:**
```
[Payroll Periods] Failed to create period: ...
[Payroll Periods] Error response: {...}
```

---

### 4. **Common Errors and Fixes**

#### Error: "Table 'payroll_periods' doesn't exist"
**Fix:** Run the database migration:
```sql
-- Execute: server/create-payroll-module.sql
```

#### Error: "Invalid column name 'periodName'"
**Fix:** Table structure mismatch. Check if the table was created correctly.

#### Error: "Cannot read property 'create' of undefined"
**Fix:** Model not loaded. Check if `models/payrollAssociations.js` is being required.

#### Error: "Database connection unavailable"
**Fix:** 
- Check SQL Server is running
- Check database connection string in `.env`
- Check server logs for connection errors

#### Error: "Validation error" or "Constraint violation"
**Fix:** 
- Check all required fields are filled
- Check date formats (should be YYYY-MM-DD)
- Check ENUM values match (periodType: monthly/bi-weekly/weekly)

---

### 5. **Test API Directly**

Use Postman or curl to test the API:

```bash
POST http://localhost:5004/api/payroll/periods
Headers:
  Authorization: Bearer YOUR_TOKEN
  Content-Type: application/json

Body:
{
  "periodName": "December 2025",
  "periodType": "monthly",
  "startDate": "2025-12-01",
  "endDate": "2025-12-31",
  "payDate": "2026-01-05"
}
```

Check the response and server logs.

---

### 6. **Verify Model Loading**

Check if models are loaded correctly. In server console, you should see:
```
✓ Payroll routes loaded
```

If you see an error loading routes, check:
- `models/PayrollPeriod.js` exists
- `models/payrollAssociations.js` exists
- Models are required in `routes/payrollRoutes.js`

---

### 7. **Check Database Permissions**

Ensure the database user has INSERT permissions:
```sql
-- Check current user
SELECT SYSTEM_USER;

-- Grant permissions if needed
GRANT INSERT, UPDATE, SELECT ON payroll_periods TO [your_user];
```

---

## Step-by-Step Debugging

1. **Check Server is Running**
   - Server should be on port 5004
   - Check: `http://localhost:5004/health`

2. **Check Database Connection**
   - Server logs should show database connection
   - Check `.env` file for database credentials

3. **Check Tables Exist**
   - Run SQL query to check tables
   - If missing, run migration script

4. **Try Creating Period**
   - Fill in all required fields
   - Click "Create Period"
   - Watch server console for errors
   - Watch browser console for errors

5. **Check Response**
   - Network tab in browser DevTools
   - Look for POST request to `/api/payroll/periods`
   - Check response status and body

---

## Quick Test Script

Run this in browser console after opening the Payroll Periods page:

```javascript
// Test API directly
fetch('http://localhost:5004/api/payroll/periods', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    periodName: 'Test Period',
    periodType: 'monthly',
    startDate: '2025-12-01',
    endDate: '2025-12-31',
    payDate: '2026-01-05'
  })
})
.then(r => r.json())
.then(d => console.log('Response:', d))
.catch(e => console.error('Error:', e));
```

---

## Still Not Working?

1. **Share the exact error message** from:
   - Server console
   - Browser console
   - Network tab response

2. **Check if other modules work** (invoices, employees, etc.)
   - If other modules work, issue is specific to payroll
   - If nothing works, issue is with database connection

3. **Verify database migration was run** and tables exist

4. **Check server logs** for any startup errors related to payroll models

---

## Expected Behavior

When saving a payroll period:
1. ✅ Form submits
2. ✅ API request sent to `/api/payroll/periods`
3. ✅ Server receives request (check server logs)
4. ✅ Database insert happens (check server logs)
5. ✅ Response returned with created period
6. ✅ Period appears in the list
7. ✅ Form resets

If any step fails, check the logs at that step!

