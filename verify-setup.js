// Comprehensive setup verification
const path = require("path");
const fs = require("fs");

console.log("🔍 Verifying BizEase UAE Setup...\n");

let issues = [];
let warnings = [];

// Check server .env
const serverEnvPath = path.resolve(__dirname, ".env");
if (fs.existsSync(serverEnvPath)) {
  console.log("✓ Server .env file found");
  
  // Read .env file manually
  const envContent = fs.readFileSync(serverEnvPath, "utf8");
  
  // Check SQL Server configuration (required)
  const sqlServerVars = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"];
  sqlServerVars.forEach((varName) => {
    if (envContent.includes(varName + "=")) {
      console.log(`✓ ${varName} is set`);
    } else {
      issues.push(`${varName} is missing in root .env file (SQL Server configuration)`);
    }
  });
  
  // Check PORT
  if (envContent.includes("PORT=")) {
    console.log("✓ PORT is set");
  } else {
    warnings.push("PORT not set (will use default: 5004)");
  }
  
  // MONGO_URI is optional now (legacy, can be removed)
  if (envContent.includes("MONGO_URI=")) {
    warnings.push("MONGO_URI is set but not required (migrated to SQL Server)");
  }
} else {
  issues.push("Server .env file not found at: " + serverEnvPath);
}

// Check client .env
const clientEnvPath = path.resolve(__dirname, "client", ".env");
if (fs.existsSync(clientEnvPath)) {
  console.log("✓ Client .env file found");
  
  // Read client env manually since it's React-specific
  const clientEnvContent = fs.readFileSync(clientEnvPath, "utf8");
  const requiredClientVars = [
    "REACT_APP_FIREBASE_API_KEY",
    "REACT_APP_FIREBASE_AUTH_DOMAIN",
    "REACT_APP_FIREBASE_PROJECT_ID",
    "REACT_APP_FIREBASE_STORAGE_BUCKET",
    "REACT_APP_FIREBASE_MESSAGING_SENDER_ID",
    "REACT_APP_FIREBASE_APP_ID"
  ];
  
  requiredClientVars.forEach((varName) => {
    if (clientEnvContent.includes(varName + "=")) {
      console.log(`✓ ${varName} is set`);
    } else {
      issues.push(`Missing ${varName} in client/.env`);
    }
  });
  
  if (!clientEnvContent.includes("REACT_APP_API_BASE_URL")) {
    warnings.push("REACT_APP_API_BASE_URL not set (will use default: http://localhost:5004/api)");
  } else {
    console.log("✓ REACT_APP_API_BASE_URL is set");
  }
} else {
  issues.push("Client .env file not found at: " + clientEnvPath);
}

// Check Firebase service account
const firebaseServiceAccountPath = path.resolve(__dirname, "server", "firebase-service-account.json");
if (fs.existsSync(firebaseServiceAccountPath)) {
  console.log("✓ Firebase service account file found");
  try {
    const serviceAccount = require(firebaseServiceAccountPath);
    if (serviceAccount.project_id === "bizease-uae") {
      console.log("✓ Firebase project ID matches");
    } else {
      warnings.push(`Firebase project ID mismatch: expected 'bizease-uae', got '${serviceAccount.project_id}'`);
    }
  } catch (e) {
    issues.push("Firebase service account file is invalid: " + e.message);
  }
} else {
  warnings.push("Firebase service account file not found (server will try to use env vars)");
}

// Check critical files
const criticalFiles = [
  { path: "server/index.js", name: "Server entry point" },
  { path: "client/src/index.js", name: "Client entry point" },
  { path: "server/config/firebaseAdmin.js", name: "Firebase Admin config" },
  { path: "server/config/database.js", name: "SQL Server database config" },
  { path: "client/src/config/firebase.js", name: "Firebase client config" },
  { path: "models/Invoice.js", name: "Invoice model" },
  { path: "models/Employee.js", name: "Employee model" },
  { path: "routes/invoiceRoutes.js", name: "Invoice routes" },
  { path: "routes/employeeRoutes.js", name: "Employee routes" }
];

criticalFiles.forEach(({ path: filePath, name }) => {
  const fullPath = path.resolve(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    console.log(`✓ ${name} exists`);
  } else {
    issues.push(`${name} missing: ${filePath}`);
  }
});

// Summary
console.log("\n" + "=".repeat(60));
if (issues.length === 0 && warnings.length === 0) {
  console.log("✅ All checks passed! Setup looks good.");
  console.log("\n📝 Next steps:");
  console.log("   1. Make sure SQL Server is running");
  console.log("   2. Enable SQL Server Authentication (if not done)");
  console.log("   3. Create database: CREATE DATABASE " + (process.env.DB_NAME || "Biz") + ";");
  console.log("   4. Run: node server/scripts/init-database.js");
  console.log("   5. Start server: cd server && npm run dev");
} else {
  if (issues.length > 0) {
    console.log("\n❌ Issues found:");
    issues.forEach((issue) => console.log("   • " + issue));
  }
  if (warnings.length > 0) {
    console.log("\n⚠️  Warnings:");
    warnings.forEach((warning) => console.log("   • " + warning));
  }
  console.log("\n💡 Fix the issues above and run this script again.");
  process.exit(issues.length > 0 ? 1 : 0);
}
