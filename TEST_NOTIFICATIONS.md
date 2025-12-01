# How to Check/Test the Notifications System

## Quick Checklist

### 1. Verify Database Table Exists

**Option A: Using SQL Server Management Studio**
```sql
-- Connect to your database
USE Biz;
GO

-- Check if table exists
SELECT * FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME = 'notifications';

-- View table structure
SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'notifications';

-- Check if there are any notifications
SELECT COUNT(*) as total_notifications FROM notifications;
```

**Option B: Using Command Line**
```bash
sqlcmd -S your-server-name -d Biz -Q "SELECT COUNT(*) FROM notifications;"
```

### 2. Check Server Logs

When you start the server, you should see:
```
✓ Notification routes loaded
✓ Notification cron job scheduled (daily at 9 AM UAE time)
```

**Check if cron is running:**
- Look for: `[Notification Cron] Running daily notification checks...`
- This appears at 9 AM UAE time (5 AM UTC)

### 3. Test API Endpoints

#### A. Check Unread Count (Quick Test)
```bash
# Using curl (replace with your token)
curl -X GET "http://localhost:5004/api/notifications/unread-count" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

**Expected Response:**
```json
{
  "count": 0
}
```

#### B. Create a Test Notification (Admin Only)
```bash
curl -X POST "http://localhost:5004/api/notifications/test" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "invoice_due",
    "title": "Test Notification",
    "message": "This is a test notification to verify the system works",
    "dueDate": "2025-12-31",
    "link": "/dashboard"
  }'
```

**Expected Response:**
```json
{
  "id": 1,
  "userId": "your-uid",
  "type": "invoice_due",
  "title": "Test Notification",
  "status": "unread",
  ...
}
```

#### C. Get All Notifications
```bash
curl -X GET "http://localhost:5004/api/notifications" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

#### D. Mark Notification as Read
```bash
curl -X PATCH "http://localhost:5004/api/notifications/1/read" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

### 4. Test Frontend

#### A. Check Notification Bell
1. Log in to the application
2. Look at the top-right corner of the header
3. You should see a bell icon 🔔
4. If you have unread notifications, you'll see a red badge with the count

#### B. Click the Bell
1. Click the notification bell
2. A dropdown should appear showing:
   - Latest 10 unread notifications
   - Notification icon, title, message, due date
   - "View All" button

#### C. Visit Notifications Page
1. Navigate to: `http://localhost:3000/notifications`
2. Or click "View All" in the dropdown
3. You should see:
   - Full list of notifications
   - Filters (Status, Type)
   - "Mark All Read" button
   - Table with all notification details

### 5. Test Cron Job Manually

Create a test script to run the cron job manually:

**File: `server/test-notifications.js`**
```javascript
const { runAllExpiryChecks } = require('./services/notificationService');
const { sequelize } = require('./config/database');

async function testNotifications() {
  try {
    console.log('Testing notification system...');
    await sequelize.authenticate();
    console.log('✓ Database connected');
    
    const results = await runAllExpiryChecks();
    console.log('✓ Expiry checks completed');
    console.log('Results:', JSON.stringify(results, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  }
}

testNotifications();
```

**Run it:**
```bash
cd server
node test-notifications.js
```

### 6. Check Email Service

**Verify SMTP Configuration:**
```bash
# Check your .env file has:
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASSWORD=your-password
MAIL_FROM=noreply@bizease.ae
```

**Test Email Sending:**
The email digest is sent automatically when the cron job runs. Check:
- Admin email inboxes
- Server logs for: `[Notification Email] Daily digest sent to X admin(s)`

### 7. Verify Notification Types Work

#### Test Passport Expiry
1. Create an employee with passport expiry 60 days from today
2. Wait for cron job to run (or run manually)
3. Check if notification was created

#### Test Invoice Due
1. Create an invoice with due date 7 days from today
2. Wait for cron job to run
3. Check notifications

### 8. Browser Developer Tools

**Check Network Tab:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Navigate to notifications page
4. Look for:
   - `GET /api/notifications` - Should return 200
   - `GET /api/notifications/unread-count` - Should return count

**Check Console:**
- Look for any JavaScript errors
- Check for API call logs

### 9. Database Queries for Verification

```sql
-- Check all notifications
SELECT * FROM notifications ORDER BY createdAt DESC;

-- Check unread notifications
SELECT * FROM notifications WHERE status = 'unread';

-- Check notifications by type
SELECT type, COUNT(*) as count 
FROM notifications 
GROUP BY type;

-- Check notifications by user
SELECT userId, COUNT(*) as count 
FROM notifications 
GROUP BY userId;

-- Check for duplicates (should be 0)
SELECT notificationKey, COUNT(*) as count 
FROM notifications 
GROUP BY notificationKey 
HAVING COUNT(*) > 1;
```

### 10. Common Issues & Solutions

**Issue: No notifications appearing**
- ✅ Check database table exists
- ✅ Verify user is admin (notifications go to admins)
- ✅ Check cron job is scheduled
- ✅ Verify expiry dates are set correctly

**Issue: Bell not showing**
- ✅ Check browser console for errors
- ✅ Verify API endpoint is accessible
- ✅ Check authentication token is valid

**Issue: Cron job not running**
- ✅ Check server logs for cron schedule message
- ✅ Verify server timezone
- ✅ Manually trigger cron job for testing

**Issue: Email not sending**
- ✅ Verify SMTP configuration
- ✅ Check email service logs
- ✅ Test email service independently

## Quick Test Script

Run this in your browser console (on the app page):

```javascript
// Test notification API
async function testNotifications() {
  try {
    // Get unread count
    const countRes = await fetch('/api/notifications/unread-count', {
      headers: {
        'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
      }
    });
    const count = await countRes.json();
    console.log('Unread count:', count);
    
    // Get all notifications
    const notifRes = await fetch('/api/notifications', {
      headers: {
        'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
      }
    });
    const notifications = await notifRes.json();
    console.log('Notifications:', notifications);
    
    return { count, notifications };
  } catch (error) {
    console.error('Error:', error);
  }
}

testNotifications();
```

## Expected Behavior

✅ **Notification Bell:**
- Shows badge with unread count
- Dropdown opens on click
- Shows latest 10 unread notifications
- Clicking notification navigates to link

✅ **Notifications Page:**
- Shows all notifications in table
- Filters work (status, type)
- Mark as read works
- Mark all read works

✅ **Cron Job:**
- Runs daily at 9 AM UAE time
- Creates notifications for expiring items
- Sends email digest to admins

✅ **API:**
- All endpoints return proper responses
- Authentication required
- Proper error handling

