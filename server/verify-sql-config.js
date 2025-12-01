const dotenv = require('dotenv');
const path = require('path');

// Load .env file
dotenv.config({
  path: path.resolve(__dirname, "..", ".env")
});

console.log('🔍 Verifying SQL Server Configuration...\n');

// Check required variables
const requiredVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD'
];

const optionalVars = [
  'DB_ENCRYPT',
  'DB_TRUST_CERT'
];

let hasErrors = false;
let hasWarnings = false;

// Check required variables
console.log('📋 Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    console.log(`   ❌ ${varName}: MISSING`);
    hasErrors = true;
  } else {
    // Mask password for security
    if (varName === 'DB_PASSWORD') {
      console.log(`   ✅ ${varName}: ${'*'.repeat(Math.min(value.length, 10))} (${value.length} characters)`);
    } else {
      console.log(`   ✅ ${varName}: ${value}`);
    }
  }
});

console.log('\n📋 Optional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    console.log(`   ⚠️  ${varName}: Not set (using default)`);
    hasWarnings = true;
  } else {
    console.log(`   ✅ ${varName}: ${value}`);
  }
});

// Validate values
console.log('\n🔍 Validation:');

// Check DB_PORT is a number
const port = parseInt(process.env.DB_PORT);
if (isNaN(port) || port < 1 || port > 65535) {
  console.log(`   ❌ DB_PORT: Invalid port number (${process.env.DB_PORT})`);
  hasErrors = true;
} else {
  console.log(`   ✅ DB_PORT: Valid (${port})`);
}

// Check DB_ENCRYPT is boolean-like
const encrypt = process.env.DB_ENCRYPT;
if (encrypt && encrypt !== 'true' && encrypt !== 'false') {
  console.log(`   ⚠️  DB_ENCRYPT: Should be 'true' or 'false' (got: ${encrypt})`);
  hasWarnings = true;
} else {
  console.log(`   ✅ DB_ENCRYPT: ${encrypt || 'false (default)'}`);
}

// Check DB_TRUST_CERT is boolean-like
const trustCert = process.env.DB_TRUST_CERT;
if (trustCert && trustCert !== 'true' && trustCert !== 'false') {
  console.log(`   ⚠️  DB_TRUST_CERT: Should be 'true' or 'false' (got: ${trustCert})`);
  hasWarnings = true;
} else {
  console.log(`   ✅ DB_TRUST_CERT: ${trustCert || 'true (default)'}`);
}

// Check DB_NAME
const dbName = process.env.DB_NAME;
if (dbName && !/^[a-zA-Z0-9_]+$/.test(dbName)) {
  console.log(`   ⚠️  DB_NAME: Contains special characters (should be alphanumeric + underscore)`);
  hasWarnings = true;
} else {
  console.log(`   ✅ DB_NAME: Valid format`);
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Configuration has ERRORS. Please fix the issues above.');
  console.log('\n💡 Required format in .env file:');
  console.log('   DB_HOST=localhost');
  console.log('   DB_PORT=1433');
  console.log('   DB_NAME=bizease');
  console.log('   DB_USER=sa');
  console.log('   DB_PASSWORD=YourPassword');
  console.log('   DB_ENCRYPT=false');
  console.log('   DB_TRUST_CERT=true');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  Configuration has WARNINGS. Review the optional variables above.');
  console.log('\n✅ Configuration is usable, but consider fixing warnings.');
  process.exit(0);
} else {
  console.log('✅ Configuration looks good!');
  console.log('\n📝 Next steps:');
  console.log('   1. Make sure SQL Server is running');
  console.log('   2. Create the database: CREATE DATABASE ' + (dbName || 'bizease') + ';');
  console.log('   3. Run: node server/scripts/init-database.js');
  console.log('   4. Start server: npm run dev');
  process.exit(0);
}

