const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const User = require("../models/User");

dotenv.config({
  path: path.resolve(__dirname, "..", ".env")
});

async function verifyUserCreation() {
  console.log("🔍 Verifying User Auto-Creation\n");
  
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

    // Check if users collection exists
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const usersCollectionExists = collections.some(col => col.name === 'users');
    
    console.log(`📦 Database: ${db.databaseName}`);
    console.log(`📚 Collections: ${collections.length}`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    console.log();

    if (!usersCollectionExists) {
      console.log("ℹ️  'users' collection doesn't exist yet.");
      console.log("   It will be created automatically when the first user logs in.\n");
    } else {
      // Count users
      try {
        const countPromise = User.countDocuments().maxTimeMS(5000);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Query timeout")), 5000)
        );
        const count = await Promise.race([countPromise, timeoutPromise]);
        
        console.log(`👥 Total users in database: ${count}\n`);
        
        if (count === 0) {
          console.log("ℹ️  No users found. This means:");
          console.log("   1. No one has logged in yet, OR");
          console.log("   2. User creation is failing (check server logs)\n");
          console.log("💡 To test user creation:");
          console.log("   1. Make sure your server is running");
          console.log("   2. Log in to the application");
          console.log("   3. Check server logs for '[Auth] Token verified' messages");
          console.log("   4. Run this script again to see if user was created\n");
        } else {
          // Show all users
          try {
            const usersPromise = User.find().maxTimeMS(5000).lean();
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Query timeout")), 5000)
            );
            const users = await Promise.race([usersPromise, timeoutPromise]);
            
            console.log("📋 Users in database:\n");
            users.forEach((user, index) => {
              console.log(`${index + 1}. ${user.email || 'No email'}`);
              console.log(`   UID: ${user.uid}`);
              console.log(`   Role: ${user.role || 'staff (default)'}`);
              console.log(`   Created: ${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}`);
              console.log();
            });
          } catch (queryError) {
            console.error("❌ Failed to fetch users:", queryError.message);
          }
        }
      } catch (countError) {
        console.error("❌ Failed to count users:", countError.message);
        console.log("\n💡 This might indicate:");
        console.log("   - MongoDB connection issues");
        console.log("   - Collection exists but has connection problems");
        console.log("   - Check your server logs when users try to log in\n");
      }
    }

    // Explain auto-creation process
    console.log("📖 How User Auto-Creation Works:\n");
    console.log("1. User logs in via Firebase (email/password or Google)");
    console.log("2. Server receives Firebase authentication token");
    console.log("3. Server checks MongoDB for user with matching UID");
    console.log("4. If user NOT found → Creates new user with:");
    console.log("   - uid: From Firebase");
    console.log("   - email: From Firebase");
    console.log("   - displayName: From Firebase");
    console.log("   - role: 'staff' (default)");
    console.log("   - lastLoginAt: Current timestamp");
    console.log("5. If user found → Updates lastLoginAt\n");

    console.log("⚠️  Common Issues:\n");
    console.log("   - MongoDB connection problems → User creation fails silently");
    console.log("   - Timeout errors → User creation might be skipped");
    console.log("   - Check server logs for '[Auth]' messages\n");

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

verifyUserCreation();

