# How the Notification System Works in Real-Time

## Overview

The notification system automatically checks for expiring documents and creates notifications that appear in real-time in your browser.

## 🔄 Real-Time Flow

### 1. **Automatic Daily Checks (Backend)**

Every day at **9 AM UAE time**, a cron job runs automatically:

```javascript
// server/services/notificationCron.js
// Runs: Daily at 9 AM UAE time (5 AM UTC)
cron.schedule('0 5 * * *', async () => {
  // 1. Check all expiries
  const results = await runAllExpiryChecks();
  
  // 2. Send email digest to admins
  await sendDailyNotificationDigest(results);
  
  // 3. Check VAT filing reminders
  await checkVatFilingReminder();
});
```

**What it checks:**
- ✅ Passport expiries (within 60 days)
- ✅ Visa expiries (within 60 days)
- ✅ Contract expiries (within 30 days)
- ✅ Trade license expiry
- ✅ VAT filing deadlines (7 days before)
- ✅ Invoice due dates (7 days before)

### 2. **Notification Creation**

When an expiry is detected:

1. **System finds employees/contracts/invoices** with upcoming expiries
2. **Creates notifications for all admin users** (not just one admin)
3. **Prevents duplicates** using a unique `notificationKey`
4. **Stores in database** (`notifications` table)

### 3. **Real-Time Frontend Updates**

The notification bell in the top navigation bar:

```javascript
// client/src/components/NotificationBell.js

// Automatically refreshes every 30 seconds
useEffect(() => {
  fetchNotifications();
  
  // Poll every 30 seconds for new notifications
  const interval = setInterval(fetchNotifications, 30000);
  return () => clearInterval(interval);
}, []);
```

**What happens:**
- 🔄 **Fetches notifications every 30 seconds** automatically
- 🔔 **Shows unread count badge** on the bell icon
- 📋 **Displays latest 10 unread notifications** in dropdown
- ✅ **Marks as read** when you click on a notification

## 📊 Notification Types

| Type | Icon | Trigger | Example |
|------|------|---------|---------|
| Passport Expiry | 🛂 | 60 days before | "Passport for John Doe will expire on 15 Mar 2024" |
| Visa Expiry | ✈️ | 60 days before | "Visa for John Doe expires on 20 Mar 2024" |
| Contract Expiry | 📄 | 30 days before | "Contract for John Doe ends on 25 Mar 2024" |
| License Expiry | 📜 | 30 days before | "Trade license expires on 10 Apr 2024" |
| VAT Due | 💰 | 7 days before | "VAT return must be filed before 28 Mar 2024" |
| Invoice Due | 🧾 | 7 days before | "Invoice INV-001 is due on 15 Mar 2024" |

## 🎯 User Experience

### When You Open the App:

1. **Notification bell appears** in top navigation (right side)
2. **Red badge shows unread count** (e.g., "3" or "9+")
3. **Click bell** → See latest 10 unread notifications
4. **Click notification** → Mark as read + navigate to relevant page
5. **Click "View All"** → Go to full notifications page (`/notifications`)

### Real-Time Updates:

- ✅ **Auto-refreshes every 30 seconds** (you don't need to refresh the page)
- ✅ **Badge count updates automatically** when new notifications arrive
- ✅ **Notifications appear in dropdown** within 30 seconds of creation
- ✅ **Clicking marks as read** and updates count immediately

## 🔧 Manual Testing

### Option 1: Browser Console (Recommended)

```javascript
// Trigger checks immediately (admin only)
window.auth.currentUser?.getIdToken(true).then(token => {
  fetch('http://localhost:5004/api/notifications/trigger-checks', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(r => r.json())
  .then(d => console.log('✅ Created:', d.summary));
});
```

### Option 2: API Endpoint

```bash
# POST /api/notifications/trigger-checks
# Requires: Admin role
# Response: { summary: { total: 5, passport: 2, visa: 3 } }
```

## 📧 Email Digest

Every day at 9 AM, all admin users receive an email with:
- Summary of all notifications created
- Breakdown by type (passport, visa, contract, etc.)
- Links to view details in the app

## 🔒 Security & Permissions

- ✅ **Only admin users** receive notifications
- ✅ **Notifications are user-specific** (each admin sees their own)
- ✅ **Protected by Firebase authentication**
- ✅ **API endpoints require admin role**

## 📝 Database Structure

```sql
notifications
├── id (INT, Primary Key)
├── userId (NVARCHAR) - Firebase UID of admin user
├── type (NVARCHAR) - passport_expiry, visa_expiry, etc.
├── title (NVARCHAR) - "Passport Expiring Soon"
├── message (NVARCHAR(MAX)) - Full message
├── dueDate (DATETIME) - When the item expires
├── link (NVARCHAR) - "/hr/employees/123"
├── status (NVARCHAR) - "unread" or "read"
├── notificationKey (NVARCHAR, UNIQUE) - Prevents duplicates
├── createdAt (DATETIME)
└── updatedAt (DATETIME)
```

## 🚀 Performance

- **Efficient queries**: Uses indexed columns (`userId`, `status`, `type`)
- **Prevents duplicates**: Unique `notificationKey` constraint
- **Batch creation**: Creates notifications for all admins in one operation
- **Polling interval**: 30 seconds (balance between real-time and server load)

## 🐛 Troubleshooting

### Notifications not appearing?

1. **Check cron job is running**: Look for `[Notification Cron]` in server logs
2. **Check database**: Run `SELECT COUNT(*) FROM notifications`
3. **Check user role**: Must be `admin` to receive notifications
4. **Check expiry dates**: Employees must have expiries within 60 days
5. **Manual trigger**: Use browser console code above to test

### Badge not updating?

1. **Wait 30 seconds** (polling interval)
2. **Refresh page** to force immediate update
3. **Check browser console** for API errors
4. **Verify API endpoint**: `/api/notifications/unread-count` returns 200

### Duplicate notifications?

- The system prevents duplicates using `notificationKey`
- If you see duplicates, check the `notificationKey` format
- Each notification type + user + entity + date = unique key

## 📚 Related Files

- **Backend**: `server/services/notificationService.js` - Core logic
- **Cron**: `server/services/notificationCron.js` - Scheduled tasks
- **Email**: `server/services/notificationEmailService.js` - Email digest
- **Frontend**: `client/src/components/NotificationBell.js` - UI component
- **API**: `routes/notificationRoutes.js` - API endpoints
- **Model**: `models/Notification.js` - Database model

---

**Summary**: The system automatically checks for expiries daily at 9 AM, creates notifications for all admins, and the frontend polls every 30 seconds to show them in real-time! 🎉

