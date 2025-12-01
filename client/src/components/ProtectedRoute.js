import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import LoadingState from "./LoadingState";

/**
 * ProtectedRoute Component
 * 
 * CRITICAL: This component prevents infinite redirect loops by:
 * 1. Showing loading state until auth is ready
 * 2. Only redirecting after loading is complete
 * 3. Using React Router Navigate (not window.location)
 */
export default function ProtectedRoute({ roles }) {
  const { user, role, loading } = useAuth();

  // CRITICAL: Show loading until auth state is determined
  // This prevents false redirects during initialization
  if (loading) {
    return <LoadingState />;
  }

  // CRITICAL: Only redirect if loading is false and user is null
  // This ensures we don't redirect during auth initialization
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access if roles are specified
  if (roles && roles.length > 0 && !roles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // User is authenticated - render protected content
  return <Outlet />;
}

