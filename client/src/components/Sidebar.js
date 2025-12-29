import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useAuth from "../hooks/useAuth";
import useCompany from "../hooks/useCompany";
import { hasModuleAccess } from "../utils/rolePermissions";
import { isDeveloper } from "../utils/developerCheck";

// Base navigation items - available to all roles that have access
const baseNavItems = [
  { to: "/dashboard", key: "dashboard", module: "dashboard" },
  { to: "/invoices", key: "invoices", module: "invoices" },
  { to: "/inventory", key: "inventory", module: "inventory" },
  { to: "/pos", key: "pos", module: "pos" },
  { to: "/expenses", key: "expenses", module: "expenses" },
  { to: "/reports/daily-sales", key: "dailySalesReport", module: "reports" }
];

const vatNavItems = [
  { to: "/vat/dashboard", key: "vatDashboard", module: "vat" },
  { to: "/vat/report", key: "vatReport", module: "vat" },
  { to: "/vat/filing", key: "vatFiling", module: "vat" },
  { to: "/vat/settings", key: "vatSettings", module: "vat" }
];

const accountingNavItems = [
  { to: "/accounting/chart-of-accounts", key: "chartOfAccounts", module: "accounting" },
  { to: "/accounting/journal-entries", key: "journalEntries", module: "accounting" },
  { to: "/accounting/general-ledger", key: "generalLedger", module: "accounting" },
  { to: "/accounting/financial-statements", key: "financialStatements", module: "accounting" },
  { to: "/payments", key: "payments", module: "accounting" }
];

const hrNavItems = [
  { to: "/hr", key: "hrManagement", module: "hr" },
  { to: "/payroll/periods", key: "payrollPeriods", module: "payroll" },
  { to: "/payroll/records", key: "payrollRecords", module: "payroll" }
];

export default function Sidebar({ isArabic }) {
  const { t } = useTranslation();
  const { role, user } = useAuth();
  const { company, displayName, loading: companyLoading } = useCompany();
  const location = useLocation();
  
  // Check if user is developer
  const isDev = isDeveloper(user);
  
  // Show "Developer Portal" for developers instead of company name
  const portalName = isDev 
    ? t("navigation.developerPortal") 
    : (companyLoading ? t("appName") : (displayName || t("appName")));
  const companyName = isDev 
    ? t("navigation.developerPortal") 
    : (companyLoading ? t("appName") : (company?.name || t("appName")));
  
  // Filter navigation items based on role permissions
  const navItems = baseNavItems.filter(item => hasModuleAccess(role, item.module));

  return (
    <aside
      className={`h-full w-64 flex-shrink-0 border-r border-slate-200 bg-white ${
        isArabic ? "rtl" : ""
      }`}
    >
      <div className="relative px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-primary via-primary-dark to-primary overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full -ml-12 -mb-12"></div>
        </div>
        
        {/* Content */}
        <div className="relative flex items-center gap-3">
          {/* Icon/Badge */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          
          {/* Company Name / Developer Portal */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white leading-tight truncate">
              {portalName}
            </h1>
            <p className="text-xs text-white/70 mt-0.5 font-normal">
              {companyName}
            </p>
          </div>
        </div>
      </div>
      <nav className="p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.key}
            to={item.to}
            className={({ isActive }) =>
              `block rounded-lg px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-primary text-white shadow"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            {item.label || t(`navigation.${item.key}`)}
          </NavLink>
        ))}
        
        {/* HR & Payroll Section - visible to HR, Admin, and Accountant */}
        {hasModuleAccess(role, "hr") && (
          <>
            <div className="my-2 border-t border-slate-200"></div>
            <div className="px-2 py-1 text-xs font-semibold uppercase text-slate-500">
              {t("navigation.hrManagement")}
            </div>
            {hrNavItems.filter(item => hasModuleAccess(role, item.module)).map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-lg px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-primary text-white shadow"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                {t(`navigation.${item.key}`)}
              </NavLink>
            ))}
          </>
        )}
        
        {/* Compliance & Financial Section - visible to Admin and Accountant */}
        {hasModuleAccess(role, "kyc") && (
          <>
            <div className="my-2 border-t border-slate-200"></div>
            <div className="px-2 py-1 text-xs font-semibold uppercase text-slate-500">
              {t("navigation.compliance")}
            </div>
            <NavLink
              to="/kyc/clients"
              className={({ isActive }) =>
                `block rounded-lg px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary text-white shadow"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              {t("navigation.kycClients")}
            </NavLink>
          </>
        )}
        
        {/* VAT Section - visible to Admin and Accountant */}
        {hasModuleAccess(role, "vat") && (
          <>
            <div className="my-2 border-t border-slate-200"></div>
            <div className="px-2 py-1 text-xs font-semibold uppercase text-slate-500">
              {t("navigation.vat")}
            </div>
            {vatNavItems.filter(item => hasModuleAccess(role, item.module)).map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-lg px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-primary text-white shadow"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                {t(`navigation.${item.key}`)}
              </NavLink>
            ))}
          </>
        )}
        
        {/* Reports Section - visible to Admin and Accountant (and Staff for daily sales) */}
        {hasModuleAccess(role, "reports") && role !== "staff" && (
          <>
            <div className="my-2 border-t border-slate-200"></div>
            <div className="px-2 py-1 text-xs font-semibold uppercase text-slate-500">
              {t("navigation.reports")}
            </div>
            <NavLink
              to="/reports"
              className={({ isActive }) =>
                `block rounded-lg px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary text-white shadow"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              {t("navigation.reportsAnalytics")}
            </NavLink>
          </>
        )}
        
        {/* Accounting Section - visible to Admin and Accountant */}
        {hasModuleAccess(role, "accounting") && (
          <>
            <div className="my-2 border-t border-slate-200"></div>
            <div className="px-2 py-1 text-xs font-semibold uppercase text-slate-500">
              {t("navigation.accounting")}
            </div>
            {accountingNavItems.filter(item => hasModuleAccess(role, item.module)).map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-lg px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-primary text-white shadow"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                {t(`navigation.${item.key}`)}
              </NavLink>
            ))}
          </>
        )}
        
        {/* Developer Section - visible only to Developers */}
        {isDeveloper(user) && (
          <>
            <div className="my-2 border-t border-slate-200"></div>
            <div className="px-2 py-1 text-xs font-semibold uppercase text-slate-500">
              Developer
            </div>
            <NavLink
              to="/admin/companies"
              className={() => {
                // Only highlight if exactly on /admin/companies
                const isActive = location.pathname === '/admin/companies';
                return `block rounded-lg px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary text-white shadow"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`;
              }}
            >
              {t("navigation.companiesManagement") || "Companies Management"}
            </NavLink>
            <NavLink
              to="/admin"
              className={() => {
                // Only highlight if exactly on /admin (not /admin/companies)
                const isActive = location.pathname === '/admin';
                return `block rounded-lg px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary text-white shadow"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`;
              }}
            >
              {t("navigation.admin") || "Admin Management"}
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  );
}

