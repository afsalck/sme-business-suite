import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useAuth from "../hooks/useAuth";

const navItems = [
  { to: "/dashboard", key: "dashboard" },
  { to: "/invoices", key: "invoices" },
  { to: "/employees", key: "employees" },
  { to: "/hr", key: "hr", label: "HR Management" },
  { to: "/inventory", key: "inventory" },
  { to: "/expenses", key: "expenses" },
  { to: "/reports/daily-sales", key: "dailySalesReport", label: "Daily Sales Report" }
];

export default function Sidebar({ isArabic }) {
  const { t } = useTranslation();
  const { role } = useAuth();

  return (
    <aside
      className={`h-full w-64 flex-shrink-0 border-r border-slate-200 bg-white ${
        isArabic ? "rtl" : ""
      }`}
    >
      <div className="px-6 py-5 border-b border-slate-200">
        <h1 className="text-xl font-semibold text-primary-dark">{t("appName")}</h1>
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
        {role === "admin" && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `block rounded-lg px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-primary text-white shadow"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            {t("navigation.admin")}
          </NavLink>
        )}
      </nav>
    </aside>
  );
}

