# Notifications Module - Setup Guide

## Overview

The Notifications Module is a complete, production-ready system for tracking and alerting on compliance deadlines and renewals in the UAE business context.

## Features

- ✅ Automatic expiry detection (passport, visa, contracts, licenses, VAT, invoices)
- ✅ Daily cron job at 9 AM UAE time
- ✅ Email digest notifications
- ✅ Frontend notification bell with dropdown
- ✅ Full notifications page with filtering
- ✅ Duplicate prevention using unique notification keys
- ✅ Multi-tenant ready (per-user notifications)

## Database Setup

### 1. Run the SQL Migration

Execute the SQL script to create the notifications table:

```sql
-- Run this in SQL Server Management Studio or via command line
-- File: server/create-notifications-table.sql
```

Or manually run:
```bash
sqlcmd -S your-server -d Biz -i server/create-notifications-table.sql
```

### 2. Verify Table Creation

The table should have:
- `id` (PK, auto-increment)
- `userId` (Firebase UID)
- `type` (enum: passport_expiry, visa_expiry, contract_expiry, license_expiry, vat_due, invoice_due)
- `title`, `message`, `dueDate`, `link`
- `status` (unread/read)
- `notificationKey` (unique, prevents duplicates)
- `createdAt`, `updatedAt`

## Backend Configuration

### 1. Environment Variables

Ensure these are set in your `.env` file:

```env
# Email configuration (for daily digest)
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-password
MAIL_FROM=noreply@bizease.ae

# Optional: Trade license expiry date
LICENSE_EXPIRY=2025-12-31
```

### 2. Cron Job Schedule

The notification cron job runs daily at **9 AM UAE time** (5 AM UTC).

The cron job:
- Checks all expiry dates
- Creates notifications for admin users
- Sends daily digest email

### 3. Notification Types & Thresholds

| Type | Threshold | Description |
|------|-----------|-------------|
| Passport Expiry | 60 days | Employee passport expiring |
| Visa Expiry | 60 days | Employee visa expiring |
| Contract Expiry | 30 days | Employee contract ending |
| License Expiry | 30 days | Trade license renewal due |
| VAT Due | 7 days | VAT filing deadline approaching |
| Invoice Due | 7 days | Invoice payment due soon |

## API Endpoints

All endpoints require Firebase authentication.

### GET /api/notifications
Get all notifications for the logged-in user.

**Query Parameters:**
- `status` (optional): `unread` | `read` | `all`
- `type` (optional): Filter by notification type
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "notifications": [...],
  "total": 10,
  "limit": 50,
  "offset": 0
}
```

### GET /api/notifications/unread-count
Get count of unread notifications.

**Response:**
```json
{
  "count": 5
}
```

### PATCH /api/notifications/:id/read
Mark a single notification as read.

**Response:**
```json
{
  "id": 1,
  "status": "read",
  ...
}
```

### PATCH /api/notifications/read-all
Mark all notifications as read for the logged-in user.

**Response:**
```json
{
  "message": "All notifications marked as read",
  "updatedCount": 5
}
```

### POST /api/notifications/test (Admin Only)
Create a test notification.

**Body:**
```json
{
  "type": "invoice_due",
  "title": "Test Notification",
  "message": "This is a test",
  "dueDate": "2025-12-31",
  "link": "/dashboard"
}
```

## Frontend Components

### Notification Bell Component

Located in: `client/src/components/NotificationBell.js`

Features:
- Badge showing unread count
- Dropdown with latest 10 unread notifications
- Click to navigate to linked page
- Auto-refreshes every 30 seconds

### Notifications Page

Located in: `client/src/pages/NotificationsPage.js`

Route: `/notifications`

Features:
- Full list of notifications
- Filter by status (all/unread/read)
- Filter by type
- Mark individual as read
- Mark all as read
- Click to navigate to linked page

## Testing

### 1. Test Notification Creation

```bash
# As admin user, create a test notification
POST /api/notifications/test
{
  "type": "invoice_due",
  "title": "Test Invoice Due",
  "message": "Test invoice is due soon",
  "dueDate": "2025-12-31",
  "link": "/invoices/1"
}
```

### 2. Test Cron Job Manually

You can trigger the cron job manually by calling:

```javascript
const { runAllExpiryChecks } = require('./server/services/notificationService');
await runAllExpiryChecks();
```

### 3. Verify Email Digest

Ensure SMTP is configured and check admin email inboxes for daily digest.

## Troubleshooting

### Notifications Not Appearing

1. **Check cron job is running:**
   - Look for log: `✓ Notification cron job scheduled (daily at 9 AM UAE time)`
   - Check server logs for cron execution

2. **Verify database table exists:**
   ```sql
   SELECT * FROM notifications;
   ```

3. **Check notification key uniqueness:**
   - Duplicate keys are prevented automatically
   - Check if notification already exists for that entity/date

### Email Not Sending

1. **Verify SMTP configuration:**
   - Check `.env` file has SMTP settings
   - Test email service independently

2. **Check email service logs:**
   - Look for: `[Notification Email] Daily digest sent to X admin(s)`

### Frontend Not Loading

1. **Check API endpoint:**
   - Verify `/api/notifications` is accessible
   - Check browser console for errors

2. **Verify authentication:**
   - Ensure user is logged in
   - Check Firebase token is valid

## Customization

### Add New Notification Type

1. Update `models/Notification.js` enum:
   ```javascript
   type: {
     type: DataTypes.ENUM(
       'passport_expiry',
       'visa_expiry',
       // ... add your new type
       'your_new_type'
     )
   }
   ```

2. Add check function in `server/services/notificationService.js`

3. Update frontend icon mapping in `NotificationBell.js` and `NotificationsPage.js`

### Change Notification Thresholds

Edit the day ranges in `server/services/notificationService.js`:

```javascript
// Example: Change passport expiry from 60 to 90 days
if (daysUntilExpiry >= 89 && daysUntilExpiry <= 90) {
  // ...
}
```

### Customize Email Template

Edit `server/services/notificationEmailService.js` to customize the email HTML.

## Production Checklist

- [ ] Database table created
- [ ] SMTP configured and tested
- [ ] Cron job scheduled and running
- [ ] Frontend components integrated
- [ ] Test notifications created and verified
- [ ] Email digest tested
- [ ] All notification types tested

## Support

For issues or questions, check:
- Server logs for cron job execution
- Browser console for frontend errors
- Database for notification records
- Email service logs for digest delivery

