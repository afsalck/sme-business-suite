const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const User = require("../models/User");

dotenv.config({
  path: path.resolve(__dirname, "..", ".env")
});

// Get email from command line argument
const email = process.argv[2];
const newRole = process.argv[3] || "admin";

if (!email) {
  console.log("❌ Please provide an email address");
  console.log("\nUsage:");
  console.log('  node set-user-role.js "your-email@example.com" [admin|staff]');
  console.log("\nExample:");
  console.log('  node set-user-role.js "tester@biz.com" admin');
  process.exit(1);
}

if (!["admin", "staff"].includes(newRole)) {
  console.log("❌ Invalid role. Must be 'admin' or 'staff'");
  process.exit(1);
}

async function setUserRole() {
  console.log(`🔧 Setting user role\n`);
  console.log(`   Email: ${email}`);
  console.log(`   New Role: ${newRole}\n`);

  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is not configured");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB...");
    mongoose.set('strictQuery', false);
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000
    });
    console.log("✅ Connected to MongoDB\n");

    // Find user by email
    let user;
    try {
      const userPromise = User.findOne({ email }).maxTimeMS(5000);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Query timeout")), 5000)
      );
      user = await Promise.race([userPromise, timeoutPromise]);
    } catch (queryError) {
      console.error("❌ Query failed:", queryError.message);
      console.log("\n💡 The user might not exist yet. Users are created automatically when they first log in.");
      console.log("   Please log in to the application first, then run this script again.");
      process.exit(1);
    }

    if (!user) {
      console.log(`❌ User with email "${email}" not found in database.`);
      console.log("\n💡 Users are created automatically when they first log in.");
      console.log("   Please:");
      console.log("   1. Log in to the application");
      console.log("   2. Then run this script again\n");
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email}`);
    console.log(`   Current role: ${user.role || 'staff (default)'}`);
    console.log(`   UID: ${user.uid}\n`);

    if (user.role === newRole) {
      console.log(`ℹ️  User already has role "${newRole}". No change needed.`);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Update role
    try {
      const updatePromise = User.findOneAndUpdate(
        { email },
        { role: newRole },
        { new: true }
      ).maxTimeMS(5000);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Update timeout")), 5000)
      );
      const updatedUser = await Promise.race([updatePromise, timeoutPromise]);

      console.log(`✅ Role updated successfully!`);
      console.log(`   New role: ${updatedUser.role}`);
      console.log(`\n💡 Important: You need to log out and log back in for the change to take effect.`);
    } catch (updateError) {
      console.error("❌ Failed to update role:", updateError.message);
      process.exit(1);
    }

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

setUserRole();

