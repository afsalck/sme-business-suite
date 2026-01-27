import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useCompany from "../hooks/useCompany";
import LoadingState from "./LoadingState";
import EmptyState from "./EmptyState";
import { useTranslation } from "react-i18next";
import { hasModuleAccessWithCompany } from "../utils/rolePermissions";
import { isDeveloper } from "../utils/developerCheck";

/**
 * ModuleAccessRoute Component
 * Protects routes that require specific module access
 * Checks both role permissions AND company module access
 * 
 * Usage:
 * <Route path="/expenses" element={
 *   <ModuleAccessRoute module="expenses">
 *     <ExpensesPage />
 *   </ModuleAccessRoute>
 * } />
 */
export default function ModuleAccessRoute({ children, module }) {
  const { t } = useTranslation();
  const { user, role, loading: authLoading } = useAuth();
  const { company, loading: companyLoading } = useCompany();

  // Show loading until auth and company are loaded
  if (authLoading || companyLoading) {
    return <LoadingState />;
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Developers can bypass module restrictions
  if (isDeveloper(user)) {
    return children;
  }

  // Check if user has access to this module
  const enabledModules = company?.enabledModules;
  const hasAccess = hasModuleAccessWithCompany(role, module, enabledModules);

  if (!hasAccess) {
    // Show friendly message instead of redirecting
    return (
      <div className="flex h-64 items-center justify-center">
        <EmptyState
          title={t("moduleAccess.accessDenied") || "Module Not Available"}
          description={
            t("moduleAccess.moduleNotEnabled", { module }) || 
            `The ${module} module is not enabled for your company. Please contact your administrator.`
          }
        />
      </div>
    );
  }

  return children;
}
