// Quick check for required environment variables
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

console.log("Checking environment variables...\n");

// SQL Server configuration (required)
const required = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"];
const optional = ["PORT", "CLIENT_URL", "CLIENT_URLS", "SMTP_HOST", "DB_ENCRYPT", "DB_TRUST_CERT"];

let allGood = true;

console.log("Required variables (SQL Server):");
required.forEach((key) => {
  if (process.env[key]) {
    // Never show sensitive values - just confirm they're set
    if (key === "DB_PASSWORD") {
      console.log(`✓ ${key}: Set (${process.env[key].length} characters, hidden for security)`);
    } else {
      console.log(`✓ ${key}: ${process.env[key]}`);
    }
  } else {
    console.log(`✗ ${key}: MISSING (REQUIRED)`);
    allGood = false;
  }
});

console.log("\nOptional variables:");
const sensitiveKeys = ["DB_PASSWORD", "SMTP_PASSWORD", "FIREBASE_SERVICE_ACCOUNT"];
optional.forEach((key) => {
  if (process.env[key]) {
    // Mask sensitive values
    const value = sensitiveKeys.includes(key) 
      ? "***HIDDEN***" 
      : process.env[key];
    console.log(`✓ ${key}: ${value}`);
  } else {
    console.log(`○ ${key}: Not set (using default)`);
  }
});

console.log("\n" + "=".repeat(50));
if (allGood) {
  console.log("✅ All required environment variables are set!");
  console.log("\n📝 Next steps:");
  console.log("   1. Make sure SQL Server is running");
  console.log("   2. Create database: CREATE DATABASE " + (process.env.DB_NAME || "bizease") + ";");
  console.log("   3. Run: node server/scripts/init-database.js");
  console.log("   4. Start server: npm run dev");
  process.exit(0);
} else {
  console.log("❌ Some required environment variables are missing.");
  console.log("\n💡 Add the missing variables to your .env file:");
  console.log("   DB_HOST=localhost");
  console.log("   DB_PORT=1433");
  console.log("   DB_NAME=bizease");
  console.log("   DB_USER=sa");
  console.log("   DB_PASSWORD=YourPassword");
  process.exit(1);
}
