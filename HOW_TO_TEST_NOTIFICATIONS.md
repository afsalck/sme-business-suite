# How to Test the Notification System

## Method 1: Using the API Endpoint (Easiest) ⭐

This is the easiest way to test notifications without running scripts.

### Steps:

1. **Make sure your server is running**
   ```bash
   cd server
   npm run dev
   ```

2. **Open your browser and log in as an admin user**

3. **Open Browser Console (F12)**

4. **Run this command:**
   ```javascript
   // Get your Firebase token
   const token = await firebase.auth().currentUser.getIdToken();
   
   // Trigger notification checks
   fetch('http://localhost:5004/api/notifications/trigger-checks', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json'
     }
   })
   .then(response => response.json())
   .then(data => {
     console.log('✅ Notification checks completed!');
     console.log('Results:', data);
   })
   .catch(error => {
     console.error('❌ Error:', error);
   });
   ```

5. **Check the results** - You should see:
   - How many notifications were created
   - Summary of passport, visa, contract, etc. notifications

6. **Check the notification bell** in the top navigation bar

---

## Method 2: Using PowerShell/Terminal

### Option A: Run from project root
```powershell
cd D:\Personal\Biz
node server/test-notifications-simple.js
```

### Option B: Run from server directory
```powershell
cd D:\Personal\Biz\server
node test-notifications-simple.js
```

### Option C: Run the full test script
```powershell
cd D:\Personal\Biz\server
node test-notifications-manual.js
```

---

## Method 3: Check Employee Expiries with SQL

Run this SQL query in SQL Server Management Studio:

```sql
-- Check employees with expiries in next 60 days
USE [Biz];

SELECT 
    id,
    fullName,
    passportExpiry,
    DATEDIFF(day, GETDATE(), passportExpiry) AS daysUntilPassportExpiry,
    visaExpiry,
    DATEDIFF(day, GETDATE(), visaExpiry) AS daysUntilVisaExpiry
FROM employees
WHERE (passportExpiry IS NOT NULL AND passportExpiry >= GETDATE() AND passportExpiry <= DATEADD(day, 60, GETDATE()))
    OR (visaExpiry IS NOT NULL AND visaExpiry >= GETDATE() AND visaExpiry <= DATEADD(day, 60, GETDATE()))
ORDER BY 
    CASE 
        WHEN passportExpiry IS NOT NULL AND visaExpiry IS NOT NULL 
        THEN CASE WHEN passportExpiry < visaExpiry THEN passportExpiry ELSE visaExpiry END
        WHEN passportExpiry IS NOT NULL THEN passportExpiry
        ELSE visaExpiry
    END ASC;
```

---

## Method 4: Check Notifications in Database

```sql
USE [Biz];

-- Check if notifications table exists
IF OBJECT_ID('dbo.notifications', 'U') IS NOT NULL
BEGIN
    SELECT COUNT(*) AS totalNotifications FROM notifications;
    SELECT TOP 10 * FROM notifications 
    WHERE type IN ('passport_expiry', 'visa_expiry')
    ORDER BY createdAt DESC;
END
ELSE
BEGIN
    PRINT 'Notifications table does NOT exist. Run server/create-notifications-table.sql';
END
```

---

## Quick Checklist

Before testing, make sure:

- [ ] **Notifications table exists** - Run `server/create-notifications-table.sql` if needed
- [ ] **At least one admin user exists** - Check: `SELECT * FROM users WHERE role = 'admin';`
- [ ] **Employees have expiry dates** - Check: `SELECT id, fullName, passportExpiry, visaExpiry FROM employees;`
- [ ] **Expiry dates are within 60 days** - The system only notifies for expiries 0-60 days away
- [ ] **Server is running** - The API endpoint needs the server to be running

---

## Expected Results

After running the test, you should see:

1. **In the API response:**
   ```json
   {
     "message": "Expiry checks completed",
     "summary": {
       "passport": 2,
       "visa": 1,
       "total": 3
     }
   }
   ```

2. **In the database:**
   - New rows in the `notifications` table
   - One notification per expiring document for each admin user

3. **In the frontend:**
   - Notification bell shows unread count
   - Clicking the bell shows the notifications
   - `/notifications` page shows all notifications

---

## Troubleshooting

### Script produces no output
- Make sure you're in the correct directory
- Check if Node.js is working: `node --version`
- Try the API method instead (Method 1)

### "Notifications table does not exist"
- Run: `server/create-notifications-table.sql` in SQL Server Management Studio

### "No admin users found"
- Update a user's role: `UPDATE users SET role = 'admin' WHERE email = 'your@email.com';`

### "No employees with expiries"
- Update an employee's expiry date to be within 60 days:
  ```sql
  UPDATE employees 
  SET passportExpiry = DATEADD(day, 30, GETDATE())
  WHERE id = 1;
  ```

### Notifications created but not showing in frontend
- Make sure you're logged in as an admin user
- Check browser console for errors (F12)
- Check server logs for errors
- Verify notifications exist: `SELECT * FROM notifications WHERE userId = 'YOUR_USER_UID';`

---

## Recommended: Use Method 1 (API)

The API method is the easiest and most reliable way to test. Just run the JavaScript code in your browser console while logged in as admin.

