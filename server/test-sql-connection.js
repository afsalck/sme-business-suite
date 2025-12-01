const { sequelize } = require('./config/database');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({
  path: path.resolve(__dirname, "..", ".env")
});

console.log('🔍 Testing SQL Server Connection...\n');
console.log('Configuration:');
console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
console.log(`   Port: ${process.env.DB_PORT || '1433'}`);
console.log(`   Database: ${process.env.DB_NAME || 'Biz'}`);
console.log(`   User: ${process.env.DB_USER || 'sa'}`);
console.log(`   Password: ${'*'.repeat((process.env.DB_PASSWORD || '').length)} (${(process.env.DB_PASSWORD || '').length} characters)`);
console.log(`   Encrypt: ${process.env.DB_ENCRYPT || 'false'}`);
console.log(`   Trust Cert: ${process.env.DB_TRUST_CERT || 'true'}\n`);

async function testConnection() {
  try {
    console.log('Attempting to connect...');
    await sequelize.authenticate();
    console.log('✅ Connection successful!');
    console.log('\n📝 Next steps:');
    console.log('   1. Create database if needed: CREATE DATABASE ' + (process.env.DB_NAME || 'Biz') + ';');
    console.log('   2. Run: node scripts/init-database.js');
    console.log('   3. Start server: npm run dev');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error(`   Error: ${error.message}`);
    
    if (error.original) {
      console.error(`   SQL Error Code: ${error.original.number || 'N/A'}`);
      console.error(`   SQL Error State: ${error.original.state || 'N/A'}`);
      console.error(`   SQL Server Error: ${error.original.message || 'N/A'}`);
    }
    
    console.error('\n💡 Troubleshooting:');
    
    if (error.message.includes('Login failed')) {
      console.error('   → Check if SQL Server Authentication is enabled');
      console.error('   → Verify username and password are correct');
      console.error('   → Check if "sa" account is enabled');
      console.error('   → Try connecting with SQL Server Management Studio first');
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      console.error('   → Check if SQL Server service is running');
      console.error('   → Verify host and port are correct');
      console.error('   → Check Windows Firewall settings');
    } else if (error.message.includes('Cannot find')) {
      console.error('   → SQL Server might not be installed');
      console.error('   → Check if SQL Server is running');
    }
    
    console.error('\n📖 See: SQL_SERVER_CONNECTION_TROUBLESHOOTING.md for detailed help');
    process.exit(1);
  }
}

testConnection();

