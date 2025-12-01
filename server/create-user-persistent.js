const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const User = require("../models/User");

dotenv.config({
  path: path.resolve(__dirname, "..", ".env")
});

const email = process.argv[2] || "admin@biz.com";
const uid = process.argv[3] || "MtPLq9vCiLeZ6LJuzn89w0mfVZy1";

console.log("🔧 Persistent User Creation Script");
console.log(`   Email: ${email}`);
console.log(`   UID: ${uid}\n`);

if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is not configured");
  process.exit(1);
}

async function createUserWithRetries() {
  let attempt = 0;
  const MAX_ATTEMPTS = 10;
  
  while (attempt < MAX_ATTEMPTS) {
    attempt++;
    console.log(`\n🔄 Attempt ${attempt}/${MAX_ATTEMPTS}...`);
    
    try {
      // Connect with longer timeouts
      console.log("Connecting to MongoDB...");
      mongoose.set('strictQuery', false);
      
      // Disconnect if already connected
      if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 30000, // 30 seconds
        socketTimeoutMS: 30000,
        connectTimeoutMS: 30000
      });
      console.log("✅ Connected to MongoDB");
      
      // Wait a moment for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if user exists
      try {
        const existing = await User.findOne({ $or: [{ uid }, { email }] })
          .maxTimeMS(10000)
          .lean();
        
        if (existing) {
          console.log("\n✅ User already exists!");
          console.log(`   Email: ${existing.email}`);
          console.log(`   UID: ${existing.uid}`);
          console.log(`   Role: ${existing.role || 'staff'}`);
          await mongoose.disconnect();
          process.exit(0);
        }
      } catch (checkError) {
        console.log("   (Could not check for existing user, proceeding...)");
      }
      
      // Create user with very simple data
      console.log("Creating user...");
      const userData = {
        uid: uid,
        email: email,
        displayName: email.split('@')[0],
        role: "staff",
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Try direct MongoDB insert with very long timeout
      console.log("Attempting direct MongoDB insert...");
      const insertPromise = User.collection.insertOne(userData);
      const insertTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Insert timeout")), 30000) // 30 seconds
      );
      
      const result = await Promise.race([insertPromise, insertTimeout]);
      
      console.log(`\n✅ SUCCESS! User created!`);
      console.log(`   ID: ${result.insertedId}`);
      console.log(`   Email: ${email}`);
      console.log(`   UID: ${uid}`);
      
      // Verify it was created
      await new Promise(resolve => setTimeout(resolve, 2000));
      const verify = await User.findById(result.insertedId).maxTimeMS(10000).lean();
      if (verify) {
        console.log(`\n✅ Verified: User exists in database`);
      }
      
      await mongoose.disconnect();
      process.exit(0);
      
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < MAX_ATTEMPTS) {
        const waitTime = attempt * 5000; // Wait longer between retries
        console.log(`   Waiting ${waitTime/1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Disconnect before retry
        try {
          if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
          }
        } catch (disconnectError) {
          // Ignore
        }
      } else {
        console.error("\n❌ All attempts failed. User was not created.");
        console.error("\n💡 Suggestions:");
        console.error("   1. Check MongoDB Atlas cluster status");
        console.error("   2. Verify your IP is whitelisted");
        console.error("   3. Try creating the user manually in MongoDB Atlas");
        console.error("   4. Check network connectivity");
        process.exit(1);
      }
    }
  }
}

createUserWithRetries();

