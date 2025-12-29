import "./config/firebase";

import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthProvider } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import ProtectedRoute from "./components/ProtectedRoute";
import DeveloperRoute from "./components/DeveloperRoute";
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
import VatSettingsPage from "./pages/VatSettingsPage";
import VatDashboardPage from "./pages/VatDashboardPage";
import VatReportPage from "./pages/VatReportPage";
import VatFilingPage from "./pages/VatFilingPage";
import ChartOfAccountsPage from "./pages/ChartOfAccountsPage";
import JournalEntriesPage from "./pages/JournalEntriesPage";
import GeneralLedgerPage from "./pages/GeneralLedgerPage";
import FinancialStatementsPage from "./pages/FinancialStatementsPage";
import PaymentsPage from "./pages/PaymentsPage";
import PayrollPeriodsPage from "./pages/PayrollPeriodsPage";
import PayrollRecordsPage from "./pages/PayrollRecordsPage";
import KycClientsPage from "./pages/KycClientsPage";
import ReportsPage from "./pages/ReportsPage";
import POSPage from "./pages/POSPage";
import CompanySettingsPage from "./pages/CompanySettingsPage";
import CompaniesManagementPage from "./pages/CompaniesManagementPage";

function AppShell({ language, onToggleLanguage }) {
  // Loading is handled by ProtectedRoute - no need to check here
  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar isArabic={language === "ar"} />
      <div className="flex flex-1 flex-col">
        <Topbar language={language} onToggleLanguage={onToggleLanguage} />
        <main className={`flex-1 overflow-y-auto bg-slate-50 ${language === "ar" ? "rtl" : ""}`}>
          <div className="p-6">
            <Outlet />
          </div>
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
            {/* POS - Full screen without sidebar */}
            <Route path="/pos" element={<POSPage language={language} />} />
            <Route path="/cafe-pos" element={<POSPage language={language} />} />
            
            <Route
              element={<AppShell language={language} onToggleLanguage={toggleLanguage} />}
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage language={language} />} />
              <Route path="/invoices" element={<InvoicesPage language={language} />} />
              <Route path="/employees" element={<Navigate to="/hr" replace />} />
              <Route path="/hr" element={<HRPage language={language} />} />
              <Route path="/inventory" element={<InventoryPage language={language} />} />
              <Route path="/expenses" element={<ExpensesPage language={language} />} />
              <Route path="/reports/daily-sales" element={<DailySalesReportPage language={language} />} />
              {/* Developer-only routes - protected by DeveloperRoute */}
              {/* IMPORTANT: More specific routes must come BEFORE less specific ones */}
              <Route 
                path="/admin/companies" 
                element={
                  <DeveloperRoute>
                    <CompaniesManagementPage language={language} />
                  </DeveloperRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <DeveloperRoute>
                    <AdminManagementPage language={language} />
                  </DeveloperRoute>
                } 
              />
              <Route path="/notifications" element={<NotificationsPage language={language} />} />
              <Route path="/vat/settings" element={<VatSettingsPage language={language} />} />
              <Route path="/vat/dashboard" element={<VatDashboardPage language={language} />} />
              <Route path="/vat/report" element={<VatReportPage language={language} />} />
              <Route path="/vat/filing" element={<VatFilingPage language={language} />} />
              <Route path="/accounting/chart-of-accounts" element={<ChartOfAccountsPage language={language} />} />
              <Route path="/accounting/journal-entries" element={<JournalEntriesPage language={language} />} />
              <Route path="/accounting/general-ledger" element={<GeneralLedgerPage language={language} />} />
              <Route path="/accounting/financial-statements" element={<FinancialStatementsPage language={language} />} />
              <Route path="/payments" element={<PaymentsPage language={language} />} />
              <Route path="/payroll/periods" element={<PayrollPeriodsPage language={language} />} />
              <Route path="/payroll/records" element={<PayrollRecordsPage language={language} />} />
              <Route path="/kyc/clients" element={<KycClientsPage language={language} />} />
              <Route path="/reports" element={<ReportsPage language={language} />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

