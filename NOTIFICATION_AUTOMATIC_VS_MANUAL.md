# Notification System: Automatic vs Manual

## ✅ **Automatic Mode (Production & Development)**

The cron job **DOES work automatically** in development! Here's how:

### How It Works:

1. **When you start your server:**
   ```bash
   cd server
   npm run dev
   ```

2. **The cron job is automatically scheduled:**
   ```javascript
   // server/index.js (line 257-258)
   const { scheduleNotificationCron } = require("./services/notificationCron");
   scheduleNotificationCron();
   ```

3. **You should see this message in console:**
   ```
   ✓ Notification cron job scheduled (daily at 9 AM UAE time)
   ```

4. **The cron job runs automatically:**
   - **Every day at 9 AM UAE time** (5 AM UTC)
   - **Even in development mode**
   - **As long as your server is running**

### Verify It's Working:

Check your server console when you start it. You should see:
```
✓ Notification cron job scheduled (daily at 9 AM UAE time)
```

If you don't see this message, the cron job might not be starting.

---

## 🔧 **Manual Testing (For Immediate Testing)**

Since the cron job only runs once per day at 9 AM, you can manually trigger it anytime for testing:

### Method 1: Browser Console (Easiest)

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
    console.log('Total notifications:', d.summary.total);
  });
});
```

### Method 2: API Call (Using Postman/curl)

```bash
# Get your Firebase token first, then:
curl -X POST http://localhost:5004/api/notifications/trigger-checks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🕐 **When Does Automatic Mode Run?**

| Time | What Happens |
|------|--------------|
| **9:00 AM UAE** | Cron job runs automatically |
| **9:00 AM UAE** | Checks all expiries |
| **9:00 AM UAE** | Creates notifications |
| **9:00 AM UAE** | Sends email digest |

**Note:** The cron job runs based on **server time**, not your local time. Make sure your server's timezone is correct.

---

## 🧪 **Testing the Automatic Mode**

### Option 1: Wait for 9 AM

Just wait until 9 AM UAE time and check your notifications.

### Option 2: Change Cron Schedule (For Testing)

Temporarily change the cron schedule to run more frequently:

```javascript
// server/services/notificationCron.js
// Change from:
cron.schedule('0 5 * * *', async () => {  // Daily at 5 AM UTC

// To (runs every minute for testing):
cron.schedule('* * * * *', async () => {  // Every minute
```

**⚠️ Remember to change it back after testing!**

### Option 3: Use Manual Trigger

Use the browser console method above to trigger immediately.

---

## 🔍 **Troubleshooting: Why Isn't It Automatic?**

### Check 1: Is the server running?

```bash
# Make sure your server is running:
cd server
npm run dev
```

### Check 2: Is the cron job scheduled?

Look for this message in server console:
```
✓ Notification cron job scheduled (daily at 9 AM UAE time)
```

If you don't see it, check `server/index.js` line 257-258.

### Check 3: Is the server time correct?

The cron job uses server time. Check:
```bash
# In your server console, check the time:
node -e "console.log(new Date())"
```

### Check 4: Are there any errors?

Check server logs for:
```
[Notification Cron] Error running notification checks
```

---

## 📊 **Summary**

| Mode | When It Runs | How to Use |
|------|--------------|------------|
| **Automatic** | Daily at 9 AM UAE | Just keep server running |
| **Manual** | Anytime | Use browser console or API |

**Both work in development!** The automatic mode just requires waiting until 9 AM, while manual mode lets you test immediately.

---

## 🚀 **For Production**

In production, the automatic mode will work the same way:
- Server runs 24/7
- Cron job runs daily at 9 AM
- No manual intervention needed

Just make sure:
- ✅ Server is always running
- ✅ Server timezone is correct (UTC)
- ✅ Database connection is stable

