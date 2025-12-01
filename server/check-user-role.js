const { sequelize } = require('./config/database');
const User = require('../models/User');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({
  path: path.resolve(__dirname, "..", ".env")
});

async function checkUserRole() {
  console.log("🔍 Checking User Roles\n");
  
  // Check SQL Server configuration
  if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER) {
    console.error("❌ SQL Server configuration is missing");
    console.error("   Required: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD");
    console.error("   Please check your .env file");
    process.exit(1);
  }

  try {
    console.log("Connecting to SQL Server...");
    await sequelize.authenticate();
    console.log("✅ Connected to SQL Server\n");

    // Get all users
    let users;
    try {
      users = await User.findAll({
        order: [['createdAt', 'DESC']],
        raw: false
      });
    } catch (queryError) {
      console.error("❌ Query failed:", queryError.message);
      console.log("\n💡 Alternative ways to check your role:");
      console.log("   1. Check the browser console (F12) and type: localStorage");
      console.log("   2. Look at the top bar in the app - your role badge should be visible");
      console.log("   3. Check the Employees page - there's a debug box showing your role");
      await sequelize.close();
      process.exit(1);
    }
    
    if (users.length === 0) {
      console.log("ℹ️  No users found in database.");
      console.log("   Users are created automatically when they first log in.\n");
      console.log("   To check your role:");
      console.log("   1. Log in to the application");
      console.log("   2. Check the browser console (F12)");
      console.log("   3. Look for your user object with role property\n");
    } else {
      console.log(`📋 Found ${users.length} user(s) in database:\n`);
      
      users.forEach((user, index) => {
        const userData = user.get ? user.get({ plain: true }) : user;
        console.log(`${index + 1}. ${userData.email || 'No email'}`);
        console.log(`   UID: ${userData.uid}`);
        console.log(`   Name: ${userData.displayName || 'N/A'}`);
        console.log(`   Role: ${userData.role || 'staff (default)'}`);
        console.log(`   Created: ${userData.createdAt ? new Date(userData.createdAt).toLocaleString() : 'N/A'}`);
        console.log(`   Last Login: ${userData.lastLoginAt ? new Date(userData.lastLoginAt).toLocaleString() : 'Never'}`);
        console.log();
      });

      // Show role summary
      const userList = users.map(u => u.get ? u.get({ plain: true }) : u);
      const admins = userList.filter(u => u.role === 'admin');
      const staff = userList.filter(u => u.role === 'staff' || !u.role);
      
      console.log("📊 Role Summary:");
      console.log(`   Admins: ${admins.length}`);
      console.log(`   Staff: ${staff.length}\n`);

      if (admins.length === 0) {
        console.log("💡 No admin users found!");
        console.log("   To make a user admin, you can:");
        console.log("   1. Update directly in SQL Server:");
        console.log(`      UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com'`);
        console.log("   2. Or use the API (if you have admin access):");
        console.log(`      PATCH /api/auth/users/:uid/role with { "role": "admin" }`);
        console.log("   3. Or use: node set-user-role.js <uid> admin\n");
      }
    }

    await sequelize.close();
    console.log("✅ Disconnected from SQL Server");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.original) {
      console.error("   SQL Error:", error.original.message);
    }
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
}

checkUserRole();
