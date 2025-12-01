const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const Employee = require("../models/Employee");

dotenv.config({
  path: path.resolve(__dirname, "..", ".env")
});

async function testEmployeeCollection() {
  console.log("🔍 Testing Employee Collection\n");
  
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is not configured");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000
    });
    console.log("✅ Connected to MongoDB\n");

    // Check what collection name Mongoose uses
    const collectionName = Employee.collection.name;
    console.log(`📋 Mongoose model "Employee" uses collection: "${collectionName}"\n`);

    // List all collections in the database
    const db = mongoose.connection.db;
    const dbName = db.databaseName;
    console.log(`📦 Connected to database: "${dbName}"\n`);
    
    const collections = await db.listCollections().toArray();
    console.log(`📚 Collections in database "${dbName}":`);
    if (collections.length === 0) {
      console.log("   (No collections found - database is empty)");
    } else {
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
    }
    console.log();

    // Check if the employees collection exists (case-insensitive)
    const employeesCollectionExists = collections.some(col => 
      col.name.toLowerCase() === 'employees' || col.name.toLowerCase() === 'employee'
    );
    
    if (!employeesCollectionExists) {
      console.warn("⚠️  No 'employees' collection found in database '" + dbName + "'!");
      console.log("\n💡 To create the collection:");
      console.log("   1. The collection will be created automatically when you add the first employee");
      console.log("   2. OR you can create it manually in MongoDB Atlas/Compass");
      console.log("   3. Make sure you're connected to the correct database\n");
      console.log("   Current database from MONGO_URI:", process.env.MONGO_URI.split('/').pop()?.split('?')[0] || 'unknown');
      console.log("   Connected database:", dbName);
      if (process.env.MONGO_URI.split('/').pop()?.split('?')[0] !== dbName) {
        console.warn("\n   ⚠️  Database name mismatch! Check your MONGO_URI.\n");
      }
    } else {
      const foundCollection = collections.find(col => 
        col.name.toLowerCase() === 'employees' || col.name.toLowerCase() === 'employee'
      );
      console.log(`✅ Found collection: "${foundCollection.name}"\n`);
    }

    // Count documents in the collection
    try {
      const count = await Employee.countDocuments();
      console.log(`📊 Total employees in collection: ${count}\n`);
      
      if (count === 0) {
        console.log("ℹ️  Collection is empty. You can add employees through the web interface.\n");
        
        // Optionally create a test employee
        console.log("Would you like to create a test employee? (This is just for testing)");
        console.log("To add employees, use the web interface at: http://localhost:3000/employees\n");
      } else {
        // Show sample employees
        const employees = await Employee.find().limit(5).lean();
        console.log("Sample employees:");
        employees.forEach((emp, index) => {
          console.log(`\n${index + 1}. ${emp.name || 'N/A'}`);
          console.log(`   Position: ${emp.position || 'N/A'}`);
          console.log(`   Salary: AED ${emp.salary || 'N/A'}`);
          console.log(`   ID: ${emp._id}`);
        });
      }
    } catch (countError) {
      console.error("❌ Error counting documents:", countError.message);
      console.log("   This might mean the collection doesn't exist yet or there's a schema mismatch.\n");
    }

    // Test a simple query
    console.log("\n🧪 Testing a simple query...");
    try {
      const testQuery = Employee.find().limit(1).maxTimeMS(5000);
      const result = await testQuery.lean();
      console.log("✅ Query successful!");
      console.log(`   Returned ${result.length} document(s)\n`);
    } catch (queryError) {
      console.error("❌ Query failed:", queryError.message);
      console.error("   Error details:", queryError);
    }

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("   Stack:", error.stack);
    process.exit(1);
  }
}

testEmployeeCollection();

