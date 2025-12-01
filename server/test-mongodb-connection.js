const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({
  path: path.resolve(__dirname, "..", ".env")
});

async function testConnection() {
  console.log("🔍 MongoDB Connection Diagnostic\n");
  
  // Check if MONGO_URI exists
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is not set in .env file");
    console.error("   Location: D:\\Personal\\Biz\\.env");
    console.error("\n   Please add:");
    console.error("   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname");
    process.exit(1);
  }

  console.log("✓ MONGO_URI found in environment");
  console.log(`   URI preview: ${process.env.MONGO_URI.substring(0, 30)}...\n`);

  console.log("🔌 Attempting to connect to MongoDB...\n");

  try {
    mongoose.set('bufferCommands', false);
    
    // Set up event listeners
    mongoose.connection.on('connecting', () => {
      console.log("🔄 Connecting...");
    });
    
    mongoose.connection.on('connected', () => {
      console.log("✅ Connected!");
    });
    
    mongoose.connection.on('error', (err) => {
      console.error("❌ Connection error:", err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn("⚠️  Disconnected");
    });

    const startTime = Date.now();
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 15000,
      connectTimeoutMS: 15000
    });

    const duration = Date.now() - startTime;
    
    console.log(`\n✅ Successfully connected to MongoDB!`);
    console.log(`   Connection time: ${duration}ms`);
    console.log(`   Database: ${mongoose.connection.db.databaseName}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Port: ${mongoose.connection.port}`);
    console.log(`   ReadyState: ${mongoose.connection.readyState} (1 = connected)\n`);

    // Test a simple query
    console.log("🧪 Testing database query...");
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`✓ Found ${collections.length} collections in database`);
    
    if (collections.length > 0) {
      console.log("   Collections:");
      collections.forEach(col => {
        console.log(`     - ${col.name}`);
      });
    }

    await mongoose.disconnect();
    console.log("\n✅ Disconnected successfully");
    process.exit(0);
    
  } catch (error) {
    console.error("\n❌ Connection failed!\n");
    console.error(`Error: ${error.message}\n`);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error("🔍 Troubleshooting:");
      console.error("   1. Check your MongoDB Atlas IP whitelist");
      console.error("      → Go to MongoDB Atlas → Network Access");
      console.error("      → Add your current IP address (or 0.0.0.0/0 for all IPs)");
      console.error("\n   2. Verify your connection string is correct");
      console.error("      → Check username, password, and cluster name");
      console.error("\n   3. Check if your MongoDB cluster is running");
      console.error("      → Go to MongoDB Atlas → Clusters");
    } else if (error.name === 'MongoAuthenticationError') {
      console.error("🔍 Troubleshooting:");
      console.error("   1. Check your username and password in MONGO_URI");
      console.error("   2. Make sure special characters are URL-encoded");
      console.error("   3. Verify the user exists in MongoDB Atlas");
    } else if (error.name === 'MongoNetworkError') {
      console.error("🔍 Troubleshooting:");
      console.error("   1. Check your internet connection");
      console.error("   2. Verify firewall settings");
      console.error("   3. Check if MongoDB Atlas is accessible");
    }
    
    process.exit(1);
  }
}

testConnection();

