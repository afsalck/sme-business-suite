import { useTranslation } from "react-i18next";
import useAuth from "../hooks/useAuth";
import NotificationBell from "./NotificationBell";

export default function Topbar({ language, onToggleLanguage }) {
  const { t } = useTranslation();
  const { user, logout, refreshRole } = useAuth();

  return (
    <header
      className={`flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 ${
        language === "ar" ? "rtl" : ""
      }`}
    >
      <div className="flex flex-col">
        <span className="text-sm text-slate-500">{t("dashboard.title")}</span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-slate-900 truncate">
            {user?.displayName || user?.email}
          </span>
          {user?.role && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              user.role === 'admin' 
                ? 'bg-purple-100 text-purple-700' 
                : 'bg-blue-100 text-blue-700'
            }`}>
              {user.role.toUpperCase()}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <button
          onClick={refreshRole}
          className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
          title="Refresh role from database"
        >
          🔄 Refresh Role
        </button>
        <button
          onClick={onToggleLanguage}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary-dark"
        >
          {language === "en" ? t("common.languageToggle") : t("common.languageToggle")}
        </button>
        <button
          onClick={logout}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          {t("navigation.logout")}
        </button>
      </div>
    </header>
  );
}

