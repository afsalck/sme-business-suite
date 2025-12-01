// Simple test script to check if dashboard API is accessible
const http = require('http');

function makeRequest(path, callback) {
  const options = {
    hostname: 'localhost',
    port: 5004,
    path: path,
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      callback(null, res.statusCode, data);
    });
  });

  req.on('error', (error) => {
    callback(error, null, null);
  });

  req.end();
}

console.log('Testing Dashboard API...\n');

// Test 1: Health check
makeRequest('/health', (err, status, data) => {
  if (err) {
    console.log('❌ Health check failed:', err.message);
    return;
  }
  console.log(`✅ Health check: ${status} - ${data}`);
  
  // Test 2: Dashboard endpoint (should return 401 without auth)
  makeRequest('/api/dashboard/metrics', (err, status, data) => {
    if (err) {
      console.log('❌ Request failed:', err.message);
      return;
    }
    
    if (status === 401) {
      console.log('✅ Dashboard endpoint found (requires auth - expected)');
    } else if (status === 404) {
      console.log('❌ Dashboard endpoint NOT FOUND (404)');
      console.log('   Check server terminal for route registration');
    } else {
      console.log(`⚠️  Unexpected status: ${status}`);
    }
    
    console.log('\n📋 Check your SERVER TERMINAL for detailed logs:');
    console.log('   - Look for "[Auth] GET /api/dashboard/metrics"');
    console.log('   - Look for "Dashboard metrics endpoint called"');
    console.log('   - Or "404 - Route not found"');
  });
});

