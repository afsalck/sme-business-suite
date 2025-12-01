# How to Change User Role

## Overview
User roles are stored in **MongoDB**, not Firebase. Firebase is only used for authentication (login). The role determines what features you can access in the application.

## Current Setup
- **Database**: `bizease` (MongoDB)
- **Collection**: `users`
- **Roles**: `admin` or `staff`

## Method 1: Using the Script (Easiest)

### Step 1: Find Your Email
- The email address you use to log in to the application

### Step 2: Run the Script
```powershell
cd D:\Personal\Biz\server
node set-user-role.js "your-email@example.com" admin
```

**Example:**
```powershell
node set-user-role.js "tester@biz.com" admin
```

### Step 3: Log Out and Log Back In
- The role change takes effect after you log out and log back in

---

## Method 2: Using MongoDB Atlas (Web Interface)

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Navigate to your cluster → **Browse Collections**
3. Select database: `bizease`
4. Select collection: `users`
5. Find your user document (search by email)
6. Click **Edit Document**
7. Change the `role` field from `"staff"` to `"admin"`
8. Click **Update**
9. **Log out and log back in** to the application

---

## Method 3: Using MongoDB Compass (Desktop App)

1. Connect to your MongoDB cluster using the connection string
2. Navigate to database: `bizease` → collection: `users`
3. Find your user document
4. Edit the `role` field
5. Save the document
6. **Log out and log back in** to the application

---

## Method 4: Using MongoDB Shell (mongosh)

```javascript
use bizease
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

---

## Important Notes

1. **Firebase vs MongoDB**:
   - Firebase = Authentication (who you are)
   - MongoDB = Authorization (what you can do - your role)

2. **Role Values**:
   - `"admin"` - Full access to all features
   - `"staff"` - Limited access (but can still add employees)

3. **After Changing Role**:
   - You MUST log out and log back in
   - The role is cached in your session
   - Refreshing the page might not be enough

4. **Default Role**:
   - New users default to `"staff"`
   - Users are created automatically on first login

---

## Troubleshooting

### "User not found"
- Make sure you've logged in at least once
- Users are created automatically on first login
- Check the email spelling

### "Role not changing"
- Make sure you logged out and logged back in
- Clear browser cache if needed
- Check server logs for errors

### "Script not working"
- Make sure MongoDB is connected
- Check your `.env` file has `MONGO_URI`
- Try Method 2 (MongoDB Atlas) instead

---

## Quick Reference

**To make yourself admin:**
```powershell
cd D:\Personal\Biz\server
node set-user-role.js "your-email@example.com" admin
```

**To check your current role:**
- Look at the top bar in the app (role badge)
- Or run: `node check-user-role.js`

