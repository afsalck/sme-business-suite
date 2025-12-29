import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import LoadingState from "./LoadingState";
import { isDeveloper } from "../utils/developerCheck";

/**
 * DeveloperRoute Component
 * Protects routes that should only be accessible to developers
 * Regular admins will be redirected
 */
export default function DeveloperRoute({ children }) {
  const { user, loading } = useAuth();

  // Show loading until auth state is determined
  if (loading) {
    return <LoadingState />;
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect if not a developer (must be admin role AND match developer email)
  if (!isDeveloper(user)) {
    // If user is admin but not developer, show message
    if (user.role === 'admin') {
      console.warn('[DeveloperRoute] Admin user is not a developer:', user.email);
    }
    return <Navigate to="/dashboard" replace />;
  }

  // Allow access for developers
  return children;
}

