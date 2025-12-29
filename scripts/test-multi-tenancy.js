/**
 * Multi-Tenancy Testing Script
 * 
 * This script helps verify that multi-tenancy is working correctly.
 * 
 * Usage:
 *   1. Make sure your server is running
 *   2. Create test users in Firebase with different email domains
 *   3. Get their Firebase tokens (from browser DevTools after login)
 *   4. Update TOKEN_1 and TOKEN_2 below
 *   5. Run: node scripts/test-multi-tenancy.js
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// ⚠️ UPDATE THESE WITH ACTUAL FIREBASE TOKENS
// Get tokens by:
// 1. Login to your app
// 2. Open DevTools → Application → Local Storage
// 3. Find Firebase token or check Network tab → Headers → Authorization
const TOKEN_1 = 'YOUR_USER1_FIREBASE_TOKEN_HERE'; // User from customera.com (companyId = 1)
const TOKEN_2 = 'YOUR_USER2_FIREBASE_TOKEN_HERE'; // User from customerb.com (companyId = 2)

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`🧪 Test: ${testName}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function makeRequest(method, endpoint, token, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

async function testUserInfo(token, expectedCompanyId) {
  logTest('Get User Info');
  
  const result = await makeRequest('GET', '/auth/me', token);
  
  if (!result.success) {
    logError(`Failed to get user info: ${result.error}`);
    return false;
  }
  
  const companyId = result.data?.user?.companyId;
  log(`User companyId: ${companyId}`, 'blue');
  
  if (companyId === expectedCompanyId) {
    logSuccess(`User has correct companyId: ${companyId}`);
    return true;
  } else {
    logError(`Expected companyId ${expectedCompanyId}, got ${companyId}`);
    return false;
  }
}

async function testInvoiceIsolation(token1, token2) {
  logTest('Test Invoice Data Isolation');
  
  // Create invoice as User 1
  log('Creating invoice as User 1...', 'blue');
  const invoiceData = {
    customerName: 'Test Customer A',
    items: [
      { name: 'Test Item 1', quantity: 1, price: 100, vatRate: 5 }
    ],
    issueDate: new Date().toISOString(),
    currency: 'AED',
    language: 'en'
  };
  
  const createResult = await makeRequest('POST', '/invoices', token1, invoiceData);
  
  if (!createResult.success) {
    logError(`Failed to create invoice: ${createResult.error}`);
    return false;
  }
  
  const invoiceId = createResult.data?.id || createResult.data?.invoiceNumber;
  logSuccess(`Invoice created: ${invoiceId}`);
  
  // Try to access as User 2 (should fail)
  log('Trying to access invoice as User 2 (should fail)...', 'blue');
  const accessResult = await makeRequest('GET', `/invoices/${invoiceId}`, token2);
  
  if (accessResult.success) {
    logError(`❌ SECURITY ISSUE: User 2 can access User 1's invoice!`);
    return false;
  } else if (accessResult.status === 404) {
    logSuccess(`User 2 correctly cannot access User 1's invoice (404)`);
  } else {
    logWarning(`Unexpected status: ${accessResult.status}`);
  }
  
  // List invoices as User 1 (should see the invoice)
  log('Listing invoices as User 1...', 'blue');
  const listResult1 = await makeRequest('GET', '/invoices', token1);
  
  if (listResult1.success) {
    const invoices = listResult1.data?.invoices || listResult1.data || [];
    const hasInvoice = invoices.some(inv => inv.id === invoiceId || inv.invoiceNumber === invoiceId);
    
    if (hasInvoice) {
      logSuccess(`User 1 can see their own invoice`);
    } else {
      logError(`User 1 cannot see their own invoice`);
      return false;
    }
  }
  
  // List invoices as User 2 (should NOT see User 1's invoice)
  log('Listing invoices as User 2 (should not see User 1\'s invoice)...', 'blue');
  const listResult2 = await makeRequest('GET', '/invoices', token2);
  
  if (listResult2.success) {
    const invoices = listResult2.data?.invoices || listResult2.data || [];
    const hasInvoice = invoices.some(inv => inv.id === invoiceId || inv.invoiceNumber === invoiceId);
    
    if (!hasInvoice) {
      logSuccess(`User 2 correctly cannot see User 1's invoice`);
    } else {
      logError(`❌ SECURITY ISSUE: User 2 can see User 1's invoice!`);
      return false;
    }
  }
  
  return true;
}

async function testInventoryIsolation(token1, token2) {
  logTest('Test Inventory Data Isolation');
  
  // Create inventory item as User 1
  log('Creating inventory item as User 1...', 'blue');
  const itemData = {
    name: 'Test Product A',
    sku: 'TEST-A-001',
    stock: 10,
    costPrice: 50,
    salePrice: 100,
    category: 'Test'
  };
  
  const createResult = await makeRequest('POST', '/inventory', token1, itemData);
  
  if (!createResult.success) {
    logError(`Failed to create inventory item: ${createResult.error}`);
    return false;
  }
  
  const itemId = createResult.data?.id;
  logSuccess(`Inventory item created: ${itemId}`);
  
  // Try to access as User 2 (should fail)
  log('Trying to access inventory item as User 2 (should fail)...', 'blue');
  const accessResult = await makeRequest('GET', `/inventory/${itemId}`, token2);
  
  if (accessResult.success) {
    logError(`❌ SECURITY ISSUE: User 2 can access User 1's inventory item!`);
    return false;
  } else if (accessResult.status === 404) {
    logSuccess(`User 2 correctly cannot access User 1's inventory item (404)`);
  }
  
  // List inventory as User 1 (should see the item)
  log('Listing inventory as User 1...', 'blue');
  const listResult1 = await makeRequest('GET', '/inventory', token1);
  
  if (listResult1.success) {
    const items = Array.isArray(listResult1.data) ? listResult1.data : [];
    const hasItem = items.some(item => item.id === itemId || item.name === 'Test Product A');
    
    if (hasItem) {
      logSuccess(`User 1 can see their own inventory item`);
    } else {
      logError(`User 1 cannot see their own inventory item`);
      return false;
    }
  }
  
  // List inventory as User 2 (should NOT see User 1's item)
  log('Listing inventory as User 2 (should not see User 1\'s item)...', 'blue');
  const listResult2 = await makeRequest('GET', '/inventory', token2);
  
  if (listResult2.success) {
    const items = Array.isArray(listResult2.data) ? listResult2.data : [];
    const hasItem = items.some(item => item.id === itemId || item.name === 'Test Product A');
    
    if (!hasItem) {
      logSuccess(`User 2 correctly cannot see User 1's inventory item`);
    } else {
      logError(`❌ SECURITY ISSUE: User 2 can see User 1's inventory item!`);
      return false;
    }
  }
  
  return true;
}

async function runAllTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('🚀 Multi-Tenancy Testing Script', 'cyan');
  log('='.repeat(60), 'cyan');
  
  // Check if tokens are set
  if (TOKEN_1 === 'YOUR_USER1_FIREBASE_TOKEN_HERE' || TOKEN_2 === 'YOUR_USER2_FIREBASE_TOKEN_HERE') {
    logError('Please update TOKEN_1 and TOKEN_2 in the script with actual Firebase tokens');
    logWarning('Get tokens by:');
    logWarning('1. Login to your app');
    logWarning('2. Open DevTools → Application → Local Storage');
    logWarning('3. Find Firebase token or check Network tab → Headers → Authorization');
    process.exit(1);
  }
  
  const results = {
    userInfo: false,
    invoiceIsolation: false,
    inventoryIsolation: false
  };
  
  try {
    // Test 1: User Info
    results.userInfo = await testUserInfo(TOKEN_1, 1);
    await testUserInfo(TOKEN_2, 2);
    
    // Test 2: Invoice Isolation
    results.invoiceIsolation = await testInvoiceIsolation(TOKEN_1, TOKEN_2);
    
    // Test 3: Inventory Isolation
    results.inventoryIsolation = await testInventoryIsolation(TOKEN_1, TOKEN_2);
    
  } catch (error) {
    logError(`Test execution failed: ${error.message}`);
    console.error(error);
  }
  
  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 Test Results Summary', 'cyan');
  log('='.repeat(60), 'cyan');
  
  log(`User Info: ${results.userInfo ? '✅ PASS' : '❌ FAIL'}`, results.userInfo ? 'green' : 'red');
  log(`Invoice Isolation: ${results.invoiceIsolation ? '✅ PASS' : '❌ FAIL'}`, results.invoiceIsolation ? 'green' : 'red');
  log(`Inventory Isolation: ${results.inventoryIsolation ? '✅ PASS' : '❌ FAIL'}`, results.inventoryIsolation ? 'green' : 'red');
  
  const allPassed = Object.values(results).every(r => r === true);
  
  if (allPassed) {
    log('\n🎉 All tests passed! Multi-tenancy is working correctly.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please review the errors above.', 'yellow');
  }
  
  return allPassed;
}

// Run tests
runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    logError(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });

