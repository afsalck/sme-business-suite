// Test MongoDB connection and performance
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

async function testMongoDB() {
  console.log("🔍 Testing MongoDB Connection...\n");
  console.log("MongoDB URI:", process.env.MONGO_URI ? "✓ Set" : "✗ Not set");
  
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI not found in .env file");
    process.exit(1);
  }

  try {
    console.log("\n1. Attempting to connect...");
    const startConnect = Date.now();
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 15000,
      connectTimeoutMS: 15000
    });
    
    const connectTime = Date.now() - startConnect;
    console.log(`✓ Connected in ${connectTime}ms`);
    console.log(`  Connection state: ${mongoose.connection.readyState} (1 = connected)`);

    console.log("\n2. Testing ping...");
    const startPing = Date.now();
    await mongoose.connection.db.admin().ping();
    const pingTime = Date.now() - startPing;
    console.log(`✓ Ping successful in ${pingTime}ms`);

    console.log("\n3. Testing simple query...");
    const startQuery = Date.now();
    const result = await mongoose.connection.db.admin().listDatabases();
    const queryTime = Date.now() - startQuery;
    console.log(`✓ Query successful in ${queryTime}ms`);
    console.log(`  Databases found: ${result.databases.length}`);

    console.log("\n4. Testing model query (with timeout)...");
    const User = require("../models/User");
    const startModelQuery = Date.now();
    try {
      const users = await Promise.race([
        User.find().maxTimeMS(5000).limit(1),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 5000)
        )
      ]);
      const modelQueryTime = Date.now() - startModelQuery;
      console.log(`✓ Model query successful in ${modelQueryTime}ms`);
      console.log(`  Users found: ${users.length}`);
    } catch (error) {
      const modelQueryTime = Date.now() - startModelQuery;
      console.log(`✗ Model query failed after ${modelQueryTime}ms`);
      console.log(`  Error: ${error.message}`);
    }

    console.log("\n📊 Performance Summary:");
    console.log(`  Connection: ${connectTime}ms`);
    console.log(`  Ping: ${pingTime}ms`);
    console.log(`  Query: ${queryTime}ms`);
    
    if (connectTime > 5000 || pingTime > 5000 || queryTime > 5000) {
      console.log("\n⚠️  WARNING: MongoDB is very slow!");
      console.log("   Consider:");
      console.log("   - Checking your internet connection");
      console.log("   - Using a MongoDB region closer to you");
      console.log("   - Using local MongoDB for development");
    } else {
      console.log("\n✓ MongoDB performance looks good!");
    }

    await mongoose.disconnect();
    console.log("\n✓ Disconnected");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ MongoDB test failed:");
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code || "N/A"}`);
    
    if (error.message.includes("timeout")) {
      console.error("\n⚠️  Connection timeout - MongoDB might be:");
      console.error("   - Unreachable (check firewall/network)");
      console.error("   - Too slow (check MongoDB Atlas region)");
      console.error("   - Incorrect connection string");
    }
    
    process.exit(1);
  }
}

testMongoDB();

