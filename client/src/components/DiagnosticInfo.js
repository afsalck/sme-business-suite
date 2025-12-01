// Diagnostic component to help debug API issues
import { useEffect, useState } from "react";
import { auth } from "../config/firebase";
import apiClient from "../services/apiClient";

export default function DiagnosticInfo() {
  const [diagnostics, setDiagnostics] = useState({});

  useEffect(() => {
    const runDiagnostics = async () => {
      const results = {
        firebaseUser: !!auth.currentUser,
        firebaseEmail: auth.currentUser?.email || "Not logged in",
        apiBaseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:5004/api",
        healthCheck: null,
        apiTest: null
      };

      // Test health endpoint (no auth)
      try {
        const healthRes = await fetch("http://localhost:5004/health");
        results.healthCheck = {
          success: healthRes.ok,
          status: healthRes.status,
          message: healthRes.ok ? "Backend is running" : "Backend returned error"
        };
      } catch (error) {
        results.healthCheck = {
          success: false,
          error: error.message,
          message: "Cannot connect to backend server"
        };
      }

      // Test API endpoint (with auth)
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          const apiRes = await apiClient.get("/dashboard/metrics");
          results.apiTest = {
            success: true,
            status: apiRes.status,
            message: "API call successful"
          };
        } catch (error) {
          results.apiTest = {
            success: false,
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            code: error.code
          };
        }
      } else {
        results.apiTest = {
          success: false,
          message: "Not logged in - cannot test API"
        };
      }

      setDiagnostics(results);
    };

    runDiagnostics();
  }, []);

  if (Object.keys(diagnostics).length === 0) {
    return <div className="text-sm text-slate-500">Running diagnostics...</div>;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs">
      <h4 className="mb-2 font-semibold">Diagnostic Information</h4>
      <div className="space-y-1">
        <div>
          <strong>Firebase User:</strong> {diagnostics.firebaseUser ? "✅ Logged in" : "❌ Not logged in"}
          {diagnostics.firebaseEmail && ` (${diagnostics.firebaseEmail})`}
        </div>
        <div>
          <strong>API Base URL:</strong> {diagnostics.apiBaseURL}
        </div>
        {diagnostics.healthCheck && (
          <div>
            <strong>Backend Health:</strong>{" "}
            {diagnostics.healthCheck.success ? "✅" : "❌"} {diagnostics.healthCheck.message}
            {diagnostics.healthCheck.error && ` (${diagnostics.healthCheck.error})`}
          </div>
        )}
        {diagnostics.apiTest && (
          <div>
            <strong>API Test:</strong> {diagnostics.apiTest.success ? "✅" : "❌"}{" "}
            {diagnostics.apiTest.message}
            {diagnostics.apiTest.status && ` (Status: ${diagnostics.apiTest.status})`}
            {diagnostics.apiTest.code && ` (Code: ${diagnostics.apiTest.code})`}
          </div>
        )}
      </div>
    </div>
  );
}

