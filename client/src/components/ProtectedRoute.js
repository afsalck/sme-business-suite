import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import LoadingState from "./LoadingState";

export default function ProtectedRoute({ roles }) {
  const { user, role, loading } = useAuth();

  // Wait until Firebase auth is ready
  if (loading) {
    return <LoadingState />;
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role-based protection
  if (roles?.length && !roles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Allowed
  return <Outlet />;
}
