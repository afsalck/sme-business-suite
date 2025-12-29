# Why Notifications Not Showing for New Employee

## Common Reasons

### 1. **Cron Job Only Runs at 9 AM**
The notification system checks for expiries **once per day at 9 AM UAE time**. If you just created an employee, you need to either:
- Wait until 9 AM tomorrow, OR
- Manually trigger the checks (see below)

### 2. **Date Range Check**
The system checks for expiries **within 60 days** (0-60 days from today). If the expiry date is:
- ✅ **Today**: Should trigger (0 days)
- ✅ **Within 60 days**: Should trigger
- ❌ **More than 60 days away**: Won't trigger
- ❌ **Already expired (past date)**: Won't trigger

### 3. **No Admin Users**
Notifications are only sent to users with `role = 'admin'`. Check if you have admin users:
```sql
SELECT * FROM users WHERE role = 'admin';
```

### 4. **Duplicate Prevention**
If a notification already exists for this employee, it won't create a duplicate. Check existing notifications:
```sql
SELECT * FROM notifications 
WHERE type IN ('passport_expiry', 'visa_expiry')
ORDER BY createdAt DESC;
```

## Quick Fix: Manually Trigger Checks

### Option 1: Browser Console (Easiest)

1. Open your browser console (F12)
2. Run this code:

```javascript
window.auth.currentUser?.getIdToken(true).then(token => {
  fetch('http://localhost:5004/api/notifications/trigger-checks', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(r => r.json())
  .then(d => {
    console.log('✅ Results:', d);
    console.log('Passport notifications:', d.summary?.passport || 0);
    console.log('Visa notifications:', d.summary?.visa || 0);
  });
});
```

### Option 2: Check Employee Data First

Run this SQL to verify your employee has the correct expiry dates:

```sql
-- Check employees with expiries
SELECT 
    id,
    fullName,
    passportExpiry,
    DATEDIFF(day, GETDATE(), passportExpiry) AS daysUntilPassport,
    visaExpiry,
    DATEDIFF(day, GETDATE(), visaExpiry) AS daysUntilVisa
FROM employees
WHERE 
    (passportExpiry IS NOT NULL AND DATEDIFF(day, GETDATE(), passportExpiry) BETWEEN 0 AND 60)
    OR 
    (visaExpiry IS NOT NULL AND DATEDIFF(day, GETDATE(), visaExpiry) BETWEEN 0 AND 60);
```

## Verify Notification Logic

The notification checks:
1. **Passport expiry**: `passportExpiry >= today AND passportExpiry <= today + 60 days`
2. **Visa expiry**: `visaExpiry >= today AND visaExpiry <= today + 60 days`
3. **Days until expiry**: Must be between 0 and 60 days

## Troubleshooting Steps

1. **Check employee data:**
   ```sql
   SELECT id, fullName, passportExpiry, visaExpiry 
   FROM employees 
   WHERE id = YOUR_EMPLOYEE_ID;
   ```

2. **Check if notifications exist:**
   ```sql
   SELECT * FROM notifications 
   WHERE type IN ('passport_expiry', 'visa_expiry')
   ORDER BY createdAt DESC;
   ```

3. **Check admin users:**
   ```sql
   SELECT uid, email, role FROM users WHERE role = 'admin';
   ```

4. **Manually trigger checks** using the browser console code above

5. **Check server logs** for any errors when triggering checks

## Expected Behavior

- ✅ **Today's expiry**: Should create notification immediately when triggered
- ✅ **Within 60 days**: Should create notification
- ✅ **Multiple admins**: Each admin gets their own notification
- ✅ **Duplicate prevention**: Won't create duplicate notifications

## Still Not Working?

1. Check browser console for errors
2. Check server terminal for errors
3. Verify employee expiry dates are correct
4. Verify you have admin users
5. Try the manual trigger again

