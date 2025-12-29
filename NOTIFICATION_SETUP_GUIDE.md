# Notification System Setup Guide

## ✅ Automatic Mode (Works in Development & Production)

The notification system **automatically runs** when your server is running, even in development!

### How It Works:

1. **Start your server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Look for this message:**
   ```
   ✓ Notification cron job scheduled (daily at 9 AM UAE time)
   ```

3. **The cron job runs automatically:**
   - **Every day at 9 AM UAE time** (5 AM UTC)
   - **Works in development** (as long as server is running)
   - **Works in production** (server runs 24/7)

### Important Notes:

- ⏰ **The cron job only runs once per day** at 9 AM
- 🔄 **You need to keep the server running** for it to work
- 📧 **Email digest is sent** to all admin users
- 🔔 **Notifications appear in the app** within 30 seconds (frontend polls every 30s)

---

## 🧪 Testing Mode (For Development)

If you want to test the automatic cron job more frequently during development:

### Option 1: Enable Test Mode

Add this to your `.env` file:

```env
NOTIFICATION_CRON_TEST=true
```

**What this does:**
- ✅ Runs cron job **every 5 minutes** instead of once per day
- ✅ Perfect for testing without waiting until 9 AM
- ⚠️ **Disables email sending** (to avoid spam during testing)
- ⚠️ **Only works in development mode**

**To disable test mode:**
```env
NOTIFICATION_CRON_TEST=false
```

### Option 2: Manual Trigger (Recommended for Testing)

Use the browser console to trigger immediately:

```javascript
// Open browser console (F12) and run:
window.auth.currentUser?.getIdToken(true).then(token => {
  fetch('http://localhost:5004/api/notifications/trigger-checks', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(r => r.json())
  .then(d => {
    console.log('✅ Created:', d.summary);
    console.log('Total:', d.summary.total);
  });
});
```

**This is the easiest way to test immediately!**

---

## 📊 Comparison: Automatic vs Manual

| Feature | Automatic Mode | Manual Trigger |
|---------|---------------|----------------|
| **When it runs** | Daily at 9 AM | Anytime you trigger it |
| **Requires** | Server running | Browser console or API |
| **Best for** | Production use | Testing & development |
| **Email sent** | Yes (daily digest) | No |
| **Works in dev** | ✅ Yes | ✅ Yes |

---

## 🚀 Production Setup

For production, you just need:

1. **Keep server running 24/7:**
   - Use PM2, Docker, or a cloud service
   - Ensure server doesn't crash

2. **Verify cron job is scheduled:**
   - Check server logs for: `✓ Notification cron job scheduled`
   - Monitor logs at 9 AM to see it running

3. **Set timezone correctly:**
   - Server should use UTC timezone
   - Cron job automatically converts to UAE time (UTC+4)

4. **Configure email:**
   - Set up email service in `.env`
   - Admin users will receive daily digest emails

---

## 🔍 Troubleshooting

### Cron job not running?

1. **Check server is running:**
   ```bash
   # Look for this in server console:
   ✓ Notification cron job scheduled (daily at 9 AM UAE time)
   ```

2. **Check server logs at 9 AM:**
   ```
   [Notification Cron] Running daily notification checks at 9 AM UAE time...
   [Notification Cron] ✓ Daily notification checks completed
   ```

3. **Verify server timezone:**
   ```bash
   # In server console:
   node -e "console.log(new Date())"
   ```

4. **Check for errors:**
   ```
   [Notification Cron] Error running notification checks: ...
   ```

### Notifications not appearing?

1. **Check if notifications were created:**
   ```sql
   SELECT COUNT(*) FROM notifications;
   ```

2. **Check user role:**
   - Must be `admin` to receive notifications
   - Check: `SELECT * FROM users WHERE role = 'admin';`

3. **Check expiry dates:**
   - Employees must have expiries within 60 days
   - Check: `SELECT * FROM employees WHERE passportExpiry <= DATEADD(day, 60, GETDATE());`

4. **Use manual trigger** to test immediately

---

## 📝 Summary

- ✅ **Automatic mode works in development** - just keep server running
- ⏰ **Runs once per day at 9 AM** - use manual trigger for immediate testing
- 🧪 **Test mode available** - set `NOTIFICATION_CRON_TEST=true` for 5-minute intervals
- 🔔 **Frontend polls every 30 seconds** - notifications appear automatically
- 📧 **Email digest sent daily** - to all admin users

**For immediate testing, use the manual trigger (browser console method).**

