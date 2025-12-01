import axios from "axios";
import { auth } from "../config/firebase";

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:5004/api"
});

// Request interceptor: Automatically attach JWT token to every API request
// CRITICAL: Do NOT redirect here - let ProtectedRoute handle routing
apiClient.interceptors.request.use(
  async (config) => {
    const fullURL = `${config.baseURL}${config.url}`;
    console.log(`[API Request] ${config.method?.toUpperCase()} ${fullURL}`);
    
    // Skip token for public endpoints (none currently - all endpoints need auth)
    const publicEndpoints = [];
    const needsAuth = !publicEndpoints.some(endpoint => config.url?.includes(endpoint));
    
    if (needsAuth) {
      try {
        // In Firebase v10, auth.currentUser is available immediately
        // No need to wait for authStateReady (doesn't exist in v10)
        const currentUser = auth.currentUser;
        if (currentUser) {
          // Get fresh token (force refresh to ensure it's valid)
          const token = await currentUser.getIdToken(true);
          
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log(`[API Request] ✅ JWT token attached for ${currentUser.email}`);
          } else {
            console.warn("[API Request] ⚠️ Token is null, request may fail");
            // Don't redirect - let the 401 response handler deal with it
          }
        } else {
          console.warn("[API Request] ⚠️ No authenticated user found");
          // CRITICAL: Don't redirect here - causes infinite loops
          // Let the response interceptor handle 401 errors
        }
      } catch (error) {
        console.error("[API Request] ❌ Failed to get Firebase token:", error);
        // CRITICAL: Don't redirect here - causes infinite loops
        // Return config without token - server will return 401
      }
    }
    
    return config;
  },
  (error) => {
    console.error("[API Request] ❌ Request interceptor error:", error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    // Don't log blob responses in detail (they're binary)
    if (response.config.responseType === 'blob') {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status} (blob, size: ${response.data?.size || 'unknown'})`);
    } else {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  async (error) => {
    console.error("=".repeat(60));
    console.error("❌ [API ERROR] Request Failed");
    console.error("=".repeat(60));
    
    // Request Details
    const method = error?.config?.method?.toUpperCase() || 'UNKNOWN';
    const url = error?.config?.url || 'unknown';
    const baseURL = error?.config?.baseURL || '';
    const fullURL = baseURL + url;
    
    console.error("📋 Request Details:");
    console.error("   Method:", method);
    console.error("   URL:", url);
    console.error("   Base URL:", baseURL);
    console.error("   Full URL:", fullURL);
    console.error("");
    
    // Response Details
    const status = error?.response?.status;
    const statusText = error?.response?.statusText;
    const responseData = error?.response?.data;
    
    console.error("📥 Response Details:");
    console.error("   Status:", status || "No response (network error)");
    console.error("   Status Text:", statusText || "N/A");
    console.error("   Response Data:", responseData || "N/A");
    console.error("");
    
    // Error Details
    console.error("🔍 Error Details:");
    console.error("   Error Code:", error?.code || "N/A");
    console.error("   Error Message:", error?.message || "N/A");
    console.error("   Error Name:", error?.name || "N/A");
    
    if (error?.stack) {
      console.error("   Stack Trace:", error.stack.split('\n').slice(0, 5).join('\n'));
    }
    console.error("");
    
    // For blob responses, handle errors differently
    if (error?.config?.responseType === 'blob' && error?.response) {
      // If it's a blob response error, the data might be a blob containing JSON error
      // We'll let the calling code handle it
      console.error("❌ [BLOB ERROR] Blob download failed");
      console.error("   Status:", status);
      return Promise.reject(error);
    }
    
    // Specific Error Handling
    if (status === 401) {
      console.error("🔐 [AUTH] Unauthorized - Token missing or invalid");
      console.error("   Status: 401");
      console.error("   Fix: Clearing auth state...");
      
      // CRITICAL: Only sign out if we're not already on login page
      // This prevents infinite redirect loops
      if (window.location.pathname !== "/login") {
        try {
          await auth.signOut();
          // Let ProtectedRoute handle the redirect via React Router
          // Don't use window.location.href here - causes loops
        } catch (signOutError) {
          console.error("Failed to sign out:", signOutError);
        }
      }
    } else if (status === 403) {
      console.error("🚫 [PERMISSION] Forbidden - You don't have permission");
      console.error("   Status: 403");
      console.error("   Fix: Contact admin to update your role");
    } else if (status === 404) {
      console.error("🔍 [NOT FOUND] Endpoint not found");
      console.error("   Status: 404");
      console.error("   Requested URL:", fullURL);
      console.error("   Fix: Check if route exists on server");
      console.error("   Available routes: /api/auth, /api/dashboard, /api/employees, etc.");
    } else if (status >= 500) {
      console.error("💥 [SERVER] Server error");
      console.error("   Fix: Check server logs for details");
      console.error("   Message:", responseData?.message || "Internal server error");
    } else if (error?.code === "ECONNREFUSED" || error?.code === "ERR_NETWORK") {
      console.error("🌐 [NETWORK] Cannot connect to server");
      console.error("   Error code:", error?.code);
      console.error("");
      console.error("🔧 Fix: Start the server:");
      console.error("   1. Open terminal: cd D:\\Personal\\Biz\\server");
      console.error("   2. Run: npm run dev");
      console.error("   3. Wait for: 'Server running on port 5004'");
      console.error("   4. Refresh this page");
    } else {
      console.error("❓ [UNKNOWN] Unexpected error");
      console.error("   Check error details above");
    }
    
    console.error("=".repeat(60));
    return Promise.reject(error);
  }
);

export default apiClient;

