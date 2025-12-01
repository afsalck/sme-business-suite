const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const User = require("../models/User");

dotenv.config({
  path: path.resolve(__dirname, "..", ".env")
});

// Get email from command line
const email = process.argv[2];
const uid = process.argv[3]; // Optional - if not provided, will search by email

if (!email) {
  console.log("❌ Please provide an email address");
  console.log("\nUsage:");
  console.log('  node create-user-manually.js "your-email@example.com" [uid]');
  console.log("\nExample:");
  console.log('  node create-user-manually.js "admin@biz.com"');
  console.log('  node create-user-manually.js "admin@biz.com" "MtPLq9vCiLeZ6LJuzn89w0mfVZy1"');
  process.exit(1);
}

async function createUser() {
  console.log("🔧 Creating User Manually\n");
  console.log(`   Email: ${email}`);
  if (uid) {
    console.log(`   UID: ${uid}`);
  }
  console.log();

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
      serverSelectionTimeoutMS: 20000, // Longer timeout
      socketTimeoutMS: 20000,
      connectTimeoutMS: 20000
    });
    console.log("✅ Connected to MongoDB\n");

    // Check if user already exists
    let existingUser;
    try {
      if (uid) {
        existingUser = await User.findOne({ uid }).maxTimeMS(5000).lean();
      } else {
        existingUser = await User.findOne({ email }).maxTimeMS(5000).lean();
      }
    } catch (checkError) {
      console.warn("⚠️  Could not check for existing user:", checkError.message);
    }

    if (existingUser) {
      console.log("ℹ️  User already exists:");
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   UID: ${existingUser.uid}`);
      console.log(`   Role: ${existingUser.role || 'staff'}`);
      console.log(`   Created: ${existingUser.createdAt ? new Date(existingUser.createdAt).toLocaleString() : 'N/A'}`);
      console.log("\n✅ User is already in the database!");
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create user with direct MongoDB insert (bypasses Mongoose validation delays)
    console.log("Creating user with direct MongoDB insert...");
    const userData = {
      uid: uid || `manual-${Date.now()}`, // Generate UID if not provided
      email: email,
      displayName: email.split('@')[0], // Use email prefix as name
      role: "staff",
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Try direct collection insert (faster)
    try {
      const insertResult = await User.collection.insertOne(userData);
      console.log(`✅ User created successfully!`);
      console.log(`   ID: ${insertResult.insertedId}`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   UID: ${userData.uid}`);
      console.log(`   Role: ${userData.role}`);
      
      // Fetch the created user to verify
      const createdUser = await User.findById(insertResult.insertedId).lean();
      if (createdUser) {
        console.log("\n✅ User verified in database!");
      }
    } catch (insertError) {
      console.error("❌ Direct insert failed:", insertError.message);
      console.log("\nTrying Mongoose create as fallback...");
      
      // Fallback to Mongoose create
      try {
        const newUser = await User.create(userData);
        console.log(`✅ User created with Mongoose!`);
        console.log(`   ID: ${newUser._id}`);
        console.log(`   Email: ${newUser.email}`);
      } catch (mongooseError) {
        console.error("❌ Mongoose create also failed:", mongooseError.message);
        throw mongooseError;
      }
    }

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.stack) {
      console.error("Stack:", error.stack.split('\n').slice(0, 5).join('\n'));
    }
    process.exit(1);
  }
}

createUser();

