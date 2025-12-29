# Testing the Notification System

This guide explains how to test and verify that the notification system is working correctly for employee expiry alerts.

## Important: Notification Timing

**The notification system triggers when:**
- Passport/Visa expiry is **within 60 days** (0-60 days from today)
- The cron job runs **daily at 9 AM UAE time** (5 AM UTC)

**If you have employees with expiries that are:**
- **More than 60 days away**: No notification yet (will notify when it gets to 60 days)
- **Less than 60 days away**: Should have received a notification
- **Already expired**: Will not notify (only notifies for future expiries)

## Step 1: Check if Notifications Table Exists

The notifications table must exist for the system to work. Check your server logs - if you see errors like "Invalid object name 'notifications'", you need to create the table.

**Run this SQL script:**
```sql
-- File: server/create-notifications-table.sql
```

Or check manually:
```sql
USE [Biz];
SELECT * FROM sys.tables WHERE name = 'notifications';
```

## Step 2: Check Employee Expiry Dates

**Option A: Using SQL (Recommended)**

Run the SQL script to see which employees have expiries:
```sql
-- File: server/check-employee-expiries.sql
```

This will show:
- Employees with passport expiries in the next 60 days
- Employees with visa expiries in the next 60 days
- Days until expiry for each employee

**Option B: Using the Test Script**

Run the Node.js test script:
```bash
cd server
node test-notifications-manual.js
```

This will:
- Check if the notifications table exists
- List all employees with expiries
- Show admin users who will receive notifications
- Run the expiry checks and show results
- Display created notifications

## Step 3: Manually Trigger Notifications

**Option A: Using the API (Easiest)**

1. Log in to the frontend as an admin user
2. Open browser console (F12)
3. Run this command:
```javascript
const token = await firebase.auth().currentUser.getIdToken();
fetch('http://localhost:5004/api/notifications/trigger-checks', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('Results:', data));
```

**Option B: Using the Test Script**

```bash
cd server
node test-notifications-manual.js
```

**Option C: Wait for the Cron Job**

The cron job runs automatically at 9 AM UAE time (5 AM UTC) every day.

## Step 4: Verify Notifications Were Created

**Check in the Database:**
```sql
USE [Biz];
SELECT * FROM notifications 
WHERE type IN ('passport_expiry', 'visa_expiry')
ORDER BY createdAt DESC;
```

**Check in the Frontend:**
1. Look for the notification bell icon in the top navigation
2. Click it to see unread notifications
3. Go to `/notifications` page to see all notifications

## Step 5: Troubleshooting

### Issue: No notifications created

**Possible causes:**

1. **Notifications table doesn't exist**
   - Solution: Run `server/create-notifications-table.sql`

2. **No admin users found**
   - Solution: Ensure at least one user has `role = 'admin'` in the `users` table
   - Check: `SELECT * FROM users WHERE role = 'admin';`

3. **Employee expiry dates are more than 60 days away**
   - Solution: Update an employee's expiry to be within 60 days for testing
   - Example: `UPDATE employees SET passportExpiry = DATEADD(day, 30, GETDATE()) WHERE id = 1;`

4. **Employee expiry dates are NULL**
   - Solution: Ensure employees have `passportExpiry` or `visaExpiry` set
   - Check: `SELECT id, fullName, passportExpiry, visaExpiry FROM employees;`

5. **Cron job not running**
   - Check server logs for: `✓ Notification cron job scheduled (daily at 9 AM UAE time)`
   - The cron job only runs at 9 AM UAE time, not immediately

### Issue: Notifications created but not showing in frontend

1. **Check user ID matches**
   - Notifications are created for admin users
   - The logged-in user must be an admin
   - Check: `SELECT uid, email, role FROM users WHERE role = 'admin';`

2. **Check notification status**
   - Notifications should have `status = 'unread'`
   - Check: `SELECT * FROM notifications WHERE userId = 'YOUR_USER_UID' AND status = 'unread';`

3. **Check browser console**
   - Open F12 → Console tab
   - Look for errors when loading notifications
   - Check Network tab for `/api/notifications` requests

## Testing with Sample Data

To test the system, you can update an employee's expiry date:

```sql
-- Set an employee's passport to expire in 30 days
UPDATE employees 
SET passportExpiry = DATEADD(day, 30, GETDATE())
WHERE id = 1; -- Replace 1 with actual employee ID

-- Then manually trigger checks (see Step 3)
```

## Expected Behavior

1. **Daily at 9 AM UAE time**: Cron job runs automatically
2. **Checks all employees**: Finds those with expiries in next 60 days
3. **Creates notifications**: One notification per expiring document for each admin user
4. **Prevents duplicates**: Uses `notificationKey` to avoid creating the same notification twice
5. **Shows in UI**: Notifications appear in the bell icon and `/notifications` page

## Manual Testing Checklist

- [ ] Notifications table exists
- [ ] At least one admin user exists
- [ ] At least one employee has expiry date within 60 days
- [ ] Manually triggered expiry checks (or waited for cron)
- [ ] Notifications appear in database
- [ ] Notifications appear in frontend (bell icon)
- [ ] Notifications can be marked as read

## Need Help?

If notifications still don't work after following these steps:

1. Check server logs for errors
2. Run the test script: `node server/test-notifications-manual.js`
3. Check the database directly using the SQL queries above
4. Verify employee expiry dates are correct
5. Ensure you're logged in as an admin user
