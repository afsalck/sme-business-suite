const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const Employee = require("../models/Employee");

dotenv.config({
  path: path.resolve(__dirname, "..", ".env")
});

async function testEmployees() {
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is not configured in the environment.");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });
    console.log("✓ Connected to MongoDB\n");

    // Count employees
    const count = await Employee.countDocuments();
    console.log(`Total employees in database: ${count}\n`);

    if (count === 0) {
      console.log("ℹ️  No employees found in the database.");
      console.log("   This is why the page shows 'No employees found'.\n");
      console.log("   To add an employee:");
      console.log("   1. Log in as admin");
      console.log("   2. Go to the Employees page");
      console.log("   3. Fill out the form and click Save\n");
    } else {
      // Fetch all employees
      console.log("Fetching employees...");
      const employees = await Employee.find().sort({ createdAt: -1 }).lean();
      console.log(`✓ Found ${employees.length} employees:\n`);
      
      employees.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.name} - ${emp.position} (Salary: AED ${emp.salary})`);
        console.log(`   Visa Expiry: ${emp.visaExpiry ? new Date(emp.visaExpiry).toLocaleDateString() : 'N/A'}`);
        console.log(`   Passport Expiry: ${emp.passportExpiry ? new Date(emp.passportExpiry).toLocaleDateString() : 'N/A'}`);
        console.log(`   Created: ${emp.createdAt ? new Date(emp.createdAt).toLocaleString() : 'N/A'}\n`);
      });

      // Test the API query
      console.log("\nTesting API query (with timeout)...");
      const startTime = Date.now();
      try {
        const testPromise = Employee.find().sort({ createdAt: -1 }).maxTimeMS(3000).lean();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Operation timeout")), 3000)
        );
        const result = await Promise.race([testPromise, timeoutPromise]);
        const duration = Date.now() - startTime;
        console.log(`✓ Query completed in ${duration}ms`);
        console.log(`✓ Returned ${result.length} employees`);
      } catch (queryError) {
        const duration = Date.now() - startTime;
        console.error(`✗ Query failed after ${duration}ms: ${queryError.message}`);
      }
    }

    await mongoose.disconnect();
    console.log("\n✓ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

testEmployees();

