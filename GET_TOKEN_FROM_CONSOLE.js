// Copy and paste this entire code into your browser console (F12 → Console tab)
// Make sure you're logged in to your application first!

// Method 1: Using Firebase auth directly
const auth = window.auth; // The auth object is exposed on window
if (auth && auth.currentUser) {
  auth.currentUser.getIdToken(true).then(token => {
    console.log('='.repeat(60));
    console.log('✅ FIREBASE TOKEN FOUND!');
    console.log('='.repeat(60));
    console.log('Token:', token);
    console.log('='.repeat(60));
    console.log('📋 Copy the token above (it\'s very long)');
    console.log('📋 Use it in Postman as: Bearer ' + token.substring(0, 50) + '...');
    console.log('='.repeat(60));
    
    // Also copy to clipboard if possible
    if (navigator.clipboard) {
      navigator.clipboard.writeText(token).then(() => {
        console.log('✅ Token copied to clipboard!');
      }).catch(() => {
        console.log('⚠️ Could not copy to clipboard, but token is shown above');
      });
    }
  }).catch(error => {
    console.error('❌ Error getting token:', error);
  });
} else {
  console.error('❌ No user logged in. Please login first!');
  console.log('Make sure you are logged in to the application.');
}

