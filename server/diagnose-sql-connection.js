const dotenv = require('dotenv');
const path = require('path');
const { Sequelize } = require('sequelize');

dotenv.config({
  path: path.resolve(__dirname, "..", ".env")
});

console.log('🔍 Comprehensive SQL Server Connection Diagnostics\n');
console.log('='.repeat(60));

// Step 1: Check environment variables
console.log('\n📋 Step 1: Environment Variables');
const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
let envOk = true;
required.forEach(key => {
  const value = process.env[key];
  if (!value) {
    console.log(`   ❌ ${key}: MISSING`);
    envOk = false;
  } else {
    if (key === 'DB_PASSWORD') {
      console.log(`   ✅ ${key}: Set (${value.length} chars)`);
    } else {
      console.log(`   ✅ ${key}: ${value}`);
    }
  }
});

if (!envOk) {
  console.log('\n❌ Missing required environment variables!');
  process.exit(1);
}

// Step 2: Test basic connectivity
console.log('\n📋 Step 2: Testing Connection String');
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  database: process.env.DB_NAME || 'Biz',
  username: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  dialect: 'mssql',
  dialectOptions: {
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_CERT === 'true' || true,
      enableArithAbort: true,
      requestTimeout: 10000,
      connectionTimeout: 10000
    }
  },
  logging: false
};

console.log(`   Host: ${config.host}`);
console.log(`   Port: ${config.port}`);
console.log(`   Database: ${config.database}`);
console.log(`   Username: ${config.username}`);
console.log(`   Encrypt: ${config.dialectOptions.options.encrypt}`);
console.log(`   Trust Cert: ${config.dialectOptions.options.trustServerCertificate}`);

// Step 3: Try connection
console.log('\n📋 Step 3: Attempting Connection...');
const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  dialectOptions: config.dialectOptions,
  pool: {
    max: 1,
    min: 0,
    acquire: 10000,
    idle: 10000
  },
  retry: {
    max: 1
  }
});

sequelize.authenticate()
  .then(() => {
    console.log('   ✅ Connection successful!');
    console.log('\n🎉 SQL Server is connected and working!');
    console.log('\n📝 Next steps:');
    console.log('   1. Create database if needed: CREATE DATABASE ' + config.database + ';');
    console.log('   2. Run: node scripts/init-database.js');
    console.log('   3. Start server: npm run dev');
    return sequelize.close();
  })
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.log('   ❌ Connection failed!');
    console.log('\n📋 Error Details:');
    console.log(`   Message: ${error.message}`);
    
    if (error.original) {
      console.log(`   SQL Error Number: ${error.original.number || 'N/A'}`);
      console.log(`   SQL Error State: ${error.original.state || 'N/A'}`);
      console.log(`   SQL Error Message: ${error.original.message || 'N/A'}`);
      console.log(`   SQL Error Code: ${error.original.code || 'N/A'}`);
    }
    
    // Detailed troubleshooting based on error
    console.log('\n🔧 Troubleshooting Guide:');
    
    if (error.message.includes('Login failed')) {
      console.log('\n   ❌ LOGIN FAILED - Authentication Issue');
      console.log('   Possible causes:');
      console.log('   1. SQL Server Authentication mode is NOT enabled');
      console.log('      → Fix: SSMS → Server Properties → Security → Enable "Mixed Mode"');
      console.log('   2. Wrong username or password');
      console.log('      → Fix: Verify credentials in .env file');
      console.log('   3. "sa" account is disabled');
      console.log('      → Fix: SSMS → Security → Logins → sa → Enable');
      console.log('   4. "sa" account is locked');
      console.log('      → Fix: SSMS → Security → Logins → sa → Unlock');
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      console.log('\n   ❌ CONNECTION REFUSED - Network Issue');
      console.log('   Possible causes:');
      console.log('   1. SQL Server service is not running');
      console.log('      → Fix: services.msc → Start "SQL Server (MSSQLSERVER)"');
      console.log('   2. Wrong host or port');
      console.log('      → Fix: Verify DB_HOST and DB_PORT in .env');
      console.log('   3. SQL Server not listening on TCP/IP');
      console.log('      → Fix: SQL Server Configuration Manager → Enable TCP/IP');
      console.log('   4. Firewall blocking port 1433');
      console.log('      → Fix: Windows Firewall → Allow port 1433');
    } else if (error.message.includes('Cannot find')) {
      console.log('\n   ❌ SERVER NOT FOUND');
      console.log('   Possible causes:');
      console.log('   1. SQL Server not installed');
      console.log('   2. Wrong server name/instance');
      console.log('      → Try: localhost, (local), .\\SQLEXPRESS, or .\\MSSQLSERVER');
    } else {
      console.log('\n   ❌ UNKNOWN ERROR');
      console.log('   Check the error details above');
    }
    
    console.log('\n💡 Quick Test:');
    console.log('   Try connecting with SQL Server Management Studio:');
    console.log(`   - Server: ${config.host}`);
    console.log(`   - Authentication: SQL Server Authentication`);
    console.log(`   - Login: ${config.username}`);
    console.log(`   - Password: (your password)`);
    console.log('   If this works in SSMS, it should work here too.');
    
    sequelize.close().catch(() => {});
    process.exit(1);
  });

