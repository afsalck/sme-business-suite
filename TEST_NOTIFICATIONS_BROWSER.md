# Test Notifications in Browser Console

## Quick Test Code

Copy and paste this code into your browser console (F12 → Console tab) while logged in as admin:

```javascript
// Get Firebase auth (it's available as window.auth)
const auth = window.auth;

// Get current user and token
const currentUser = auth.currentUser;

if (!currentUser) {
  console.error('❌ Not logged in! Please log in first.');
} else {
  console.log('✅ Logged in as:', currentUser.email);
  
  // Get token
  currentUser.getIdToken(true).then(token => {
    console.log('✅ Token obtained');
    
    // Trigger notification checks
    fetch('http://localhost:5004/api/notifications/trigger-checks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => Promise.reject(err));
      }
      return response.json();
    })
    .then(data => {
      console.log('✅ Notification checks completed!');
      console.log('📊 Summary:', data.summary);
      console.log('📋 Details:', data);
      
      if (data.summary.total > 0) {
        console.log(`\n🎉 ${data.summary.total} notifications created!`);
        console.log('Check the notification bell icon in the top navigation.');
      } else {
        console.log('\nℹ️  No notifications created.');
        console.log('Possible reasons:');
        console.log('  - No employees with expiries in next 60 days');
        console.log('  - Notifications already exist (duplicates prevented)');
        console.log('  - No admin users found');
      }
    })
    .catch(error => {
      console.error('❌ Error:', error);
      if (error.message) {
        console.error('Message:', error.message);
      }
    });
  }).catch(err => {
    console.error('❌ Failed to get token:', err);
  });
}
```

## One-Liner Version

If you want a simpler version:

```javascript
window.auth.currentUser?.getIdToken(true).then(token => 
  fetch('http://localhost:5004/api/notifications/trigger-checks', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(r => r.json()).then(d => console.log('Results:', d))
);
```

## Check Your Notifications

After running the trigger, check notifications:

```javascript
// Get your notifications
window.auth.currentUser?.getIdToken(true).then(token => 
  fetch('http://localhost:5004/api/notifications', {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(r => r.json()).then(d => {
    console.log('📬 Your notifications:', d);
    console.log('Total:', d.total);
    console.log('Unread:', d.notifications.filter(n => n.status === 'unread').length);
  })
);
```

## Troubleshooting

### "window.auth is undefined"
- Make sure you're on a page that has loaded the Firebase config
- Try refreshing the page
- The auth is set in `client/src/config/firebase.js` line 20

### "Not logged in"
- Make sure you're logged in to the application
- Check: `window.auth.currentUser` should not be null

### "401 Unauthorized"
- Your token might be expired
- Try logging out and logging back in
- The code above uses `getIdToken(true)` to force refresh

### "403 Forbidden"
- You need to be logged in as an `admin` user
- Check your role: The API endpoint requires admin role

