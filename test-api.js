// Test API connectivity
const axios = require("axios");

async function testAPI() {
  console.log("🔍 Testing API Connection...\n");
  
  const baseURL = "http://localhost:5000";
  
  // Test 1: Health endpoint (no auth required)
  try {
    console.log("1. Testing health endpoint...");
    const healthRes = await axios.get(`${baseURL}/health`);
    console.log("   ✅ Health check passed:", healthRes.data);
  } catch (error) {
    console.log("   ❌ Health check failed:", error.message);
    console.log("   → Make sure the server is running on port 5000");
    return;
  }
  
  // Test 2: API endpoint (requires auth)
  try {
    console.log("\n2. Testing API endpoint (without auth)...");
    const apiRes = await axios.get(`${baseURL}/api/dashboard/metrics`);
    console.log("   ✅ API responded:", apiRes.status);
  } catch (error) {
    if (error.response?.status === 401) {
      console.log("   ⚠️  API requires authentication (expected)");
      console.log("   → This is normal - you need to be logged in");
    } else {
      console.log("   ❌ API error:", error.message);
      console.log("   → Status:", error.response?.status);
      console.log("   → Message:", error.response?.data?.message);
    }
  }
  
  console.log("\n✅ Basic connectivity test complete!");
  console.log("\nNext steps:");
  console.log("1. Open browser console (F12)");
  console.log("2. Check for errors when loading dashboard");
  console.log("3. Look for network requests to /api/dashboard/metrics");
  console.log("4. Check if Authorization header is being sent");
}

testAPI().catch(console.error);

