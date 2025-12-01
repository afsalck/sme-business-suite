import "./config/firebase";

import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthProvider } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import ProtectedRoute from "./components/ProtectedRoute";
import LoadingState from "./components/LoadingState";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import InvoicesPage from "./pages/InvoicesPage";
import EmployeesPage from "./pages/EmployeesPage";
import InventoryPage from "./pages/InventoryPage";
import ExpensesPage from "./pages/ExpensesPage";
import DailySalesReportPage from "./pages/DailySalesReportPage";
import AdminManagementPage from "./pages/AdminManagementPage";
import HRPage from "./pages/HRPage";
import NotificationsPage from "./pages/NotificationsPage";

function AppShell({ language, onToggleLanguage }) {
  // Loading is handled by ProtectedRoute - no need to check here
  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar isArabic={language === "ar"} />
      <div className="flex flex-1 flex-col">
        <Topbar language={language} onToggleLanguage={onToggleLanguage} />
        <main className={`flex-1 overflow-y-auto p-6 ${language === "ar" ? "rtl" : ""}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.language || "en");

  useEffect(() => {
    i18n.changeLanguage(language);
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language, i18n]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "en" ? "ar" : "en"));
  };

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage language={language} />} />
          <Route element={<ProtectedRoute />}>
            <Route
              element={<AppShell language={language} onToggleLanguage={toggleLanguage} />}
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage language={language} />} />
              <Route path="/invoices" element={<InvoicesPage language={language} />} />
              <Route path="/employees" element={<EmployeesPage language={language} />} />
              <Route path="/hr" element={<HRPage language={language} />} />
              <Route path="/inventory" element={<InventoryPage language={language} />} />
              <Route path="/expenses" element={<ExpensesPage language={language} />} />
              <Route path="/reports/daily-sales" element={<DailySalesReportPage language={language} />} />
              <Route path="/admin" element={<AdminManagementPage language={language} />} />
              <Route path="/notifications" element={<NotificationsPage language={language} />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

