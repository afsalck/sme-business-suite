/**
 * Test script for VAT endpoints
 * Run: node server/test-vat-endpoints.js
 * 
 * This will test the VAT API endpoints to help debug issues.
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5004/api';
const TEST_TOKEN = process.env.TEST_TOKEN || ''; // You'll need to provide a valid Firebase token

async function testVatEndpoints() {
  console.log('=== Testing VAT Endpoints ===\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  const headers = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  };

  // Test 1: Get VAT Settings
  console.log('1. Testing GET /vat/settings');
  try {
    const response = await axios.get(`${BASE_URL}/vat/settings`, { headers });
    console.log('   ✅ Success:', response.status);
    console.log('   Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   ❌ Error:', error.response?.status, error.response?.data?.message || error.message);
  }
  console.log('');

  // Test 2: Update VAT Settings
  console.log('2. Testing PUT /vat/settings');
  try {
    const updateData = {
      companyId: 1,
      trn: '100000000000003',
      vatEnabled: true,
      filingFrequency: 'monthly',
      filingDay: 28
    };
    const response = await axios.put(`${BASE_URL}/vat/settings`, updateData, { headers });
    console.log('   ✅ Success:', response.status);
    console.log('   Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   ❌ Error:', error.response?.status, error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('   Full error:', JSON.stringify(error.response.data, null, 2));
    }
  }
  console.log('');

  // Test 3: Get VAT Summary
  console.log('3. Testing GET /vat/summary');
  try {
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    const to = new Date();
    const params = new URLSearchParams({
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0]
    });
    const response = await axios.get(`${BASE_URL}/vat/summary?${params}`, { headers });
    console.log('   ✅ Success:', response.status);
    console.log('   Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   ❌ Error:', error.response?.status, error.response?.data?.message || error.message);
  }
  console.log('');

  // Test 4: Export CSV
  console.log('4. Testing GET /vat/report (CSV)');
  try {
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    const to = new Date();
    const params = new URLSearchParams({
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
      format: 'csv'
    });
    const response = await axios.get(`${BASE_URL}/vat/report?${params}`, { 
      headers,
      responseType: 'text'
    });
    console.log('   ✅ Success:', response.status);
    console.log('   Content-Type:', response.headers['content-type']);
    console.log('   Content-Length:', response.headers['content-length']);
    console.log('   First 200 chars:', response.data.substring(0, 200));
  } catch (error) {
    console.log('   ❌ Error:', error.response?.status, error.response?.data?.message || error.message);
    if (error.response?.data && typeof error.response.data === 'string') {
      console.log('   Error body:', error.response.data.substring(0, 200));
    }
  }
  console.log('');

  // Test 5: Export PDF
  console.log('5. Testing GET /vat/report (PDF)');
  try {
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    const to = new Date();
    const params = new URLSearchParams({
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
      format: 'pdf'
    });
    const response = await axios.get(`${BASE_URL}/vat/report?${params}`, { 
      headers,
      responseType: 'arraybuffer'
    });
    console.log('   ✅ Success:', response.status);
    console.log('   Content-Type:', response.headers['content-type']);
    console.log('   Content-Length:', response.headers['content-length']);
    console.log('   PDF size:', response.data.length, 'bytes');
  } catch (error) {
    console.log('   ❌ Error:', error.response?.status, error.response?.data?.message || error.message);
  }
  console.log('');

  console.log('=== Testing Complete ===');
}

// Run tests
if (require.main === module) {
  if (!TEST_TOKEN) {
    console.error('⚠️  No TEST_TOKEN provided. Set it as environment variable:');
    console.error('   TEST_TOKEN=your_firebase_token node server/test-vat-endpoints.js');
    console.error('\n   Or get a token from browser console after logging in:');
    console.error('   firebase.auth().currentUser.getIdToken().then(console.log)');
    process.exit(1);
  }
  
  testVatEndpoints().catch(console.error);
}

module.exports = { testVatEndpoints };

