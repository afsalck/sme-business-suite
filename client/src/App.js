import "./config/firebase";

import { useEffect, useState, lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthProvider } from "./context/AuthContext";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import ProtectedRoute from "./components/ProtectedRoute";
import DeveloperRoute from "./components/DeveloperRoute";
import ModuleAccessRoute from "./components/ModuleAccessRoute";
import LoadingState from "./components/LoadingState";

// Lazy load all page components for code splitting and better performance
const LoginPage = lazy(() => import("./pages/LoginPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const InvoicesPage = lazy(() => import("./pages/InvoicesPage"));
const HRPage = lazy(() => import("./pages/HRPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const DailySalesReportPage = lazy(() => import("./pages/DailySalesReportPage"));
const AdminManagementPage = lazy(() => import("./pages/AdminManagementPage"));
const CompaniesManagementPage = lazy(() => import("./pages/CompaniesManagementPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const VatSettingsPage = lazy(() => import("./pages/VatSettingsPage"));
const VatDashboardPage = lazy(() => import("./pages/VatDashboardPage"));
const VatReportPage = lazy(() => import("./pages/VatReportPage"));
const VatFilingPage = lazy(() => import("./pages/VatFilingPage"));
const ChartOfAccountsPage = lazy(() => import("./pages/ChartOfAccountsPage"));
const JournalEntriesPage = lazy(() => import("./pages/JournalEntriesPage"));
const GeneralLedgerPage = lazy(() => import("./pages/GeneralLedgerPage"));
const FinancialStatementsPage = lazy(() => import("./pages/FinancialStatementsPage"));
const PaymentsPage = lazy(() => import("./pages/PaymentsPage"));
const PayrollPeriodsPage = lazy(() => import("./pages/PayrollPeriodsPage"));
const PayrollRecordsPage = lazy(() => import("./pages/PayrollRecordsPage"));
const KycClientsPage = lazy(() => import("./pages/KycClientsPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const POSPage = lazy(() => import("./pages/POSPage"));

function AppShell({ language, onToggleLanguage }) {
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
        <Suspense fallback={<LoadingState />}>
          <Routes>
            {/* PUBLIC */}
            <Route path="/login" element={<LoginPage language={language} />} />

          {/* PROTECTED */}
          <Route element={<ProtectedRoute />}>
            {/* POS (no sidebar) */}
            <Route path="/pos" element={<POSPage language={language} />} />
            <Route path="/cafe-pos" element={<POSPage language={language} />} />

            {/* APP SHELL */}
            <Route element={<AppShell language={language} onToggleLanguage={toggleLanguage} />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              <Route path="/dashboard" element={<DashboardPage language={language} />} />

              <Route path="/invoices" element={
                <ModuleAccessRoute module="invoices">
                  <InvoicesPage language={language} />
                </ModuleAccessRoute>
              } />

              <Route path="/employees" element={<Navigate to="/hr" replace />} />

              <Route path="/hr" element={
                <ModuleAccessRoute module="hr">
                  <HRPage language={language} />
                </ModuleAccessRoute>
              } />

              <Route path="/inventory" element={
                <ModuleAccessRoute module="inventory">
                  <InventoryPage language={language} />
                </ModuleAccessRoute>
              } />

              <Route path="/expenses" element={
                <ModuleAccessRoute module="expenses">
                  <ExpensesPage language={language} />
                </ModuleAccessRoute>
              } />

              <Route path="/reports/daily-sales" element={
                <ModuleAccessRoute module="reports">
                  <DailySalesReportPage language={language} />
                </ModuleAccessRoute>
              } />

              {/* DEVELOPER */}
              <Route path="/admin/companies" element={
                <DeveloperRoute>
                  <CompaniesManagementPage language={language} />
                </DeveloperRoute>
              } />

              <Route path="/admin" element={
                <DeveloperRoute>
                  <AdminManagementPage language={language} />
                </DeveloperRoute>
              } />

              <Route path="/notifications" element={<NotificationsPage language={language} />} />

              <Route path="/vat/settings" element={<ModuleAccessRoute module="vat"><VatSettingsPage language={language} /></ModuleAccessRoute>} />
              <Route path="/vat/dashboard" element={<ModuleAccessRoute module="vat"><VatDashboardPage language={language} /></ModuleAccessRoute>} />
              <Route path="/vat/report" element={<ModuleAccessRoute module="vat"><VatReportPage language={language} /></ModuleAccessRoute>} />
              <Route path="/vat/filing" element={<ModuleAccessRoute module="vat"><VatFilingPage language={language} /></ModuleAccessRoute>} />

              <Route path="/accounting/chart-of-accounts" element={<ModuleAccessRoute module="accounting"><ChartOfAccountsPage language={language} /></ModuleAccessRoute>} />
              <Route path="/accounting/journal-entries" element={<ModuleAccessRoute module="accounting"><JournalEntriesPage language={language} /></ModuleAccessRoute>} />
              <Route path="/accounting/general-ledger" element={<ModuleAccessRoute module="accounting"><GeneralLedgerPage language={language} /></ModuleAccessRoute>} />
              <Route path="/accounting/financial-statements" element={<ModuleAccessRoute module="accounting"><FinancialStatementsPage language={language} /></ModuleAccessRoute>} />

              <Route path="/payments" element={<ModuleAccessRoute module="accounting"><PaymentsPage language={language} /></ModuleAccessRoute>} />

              <Route path="/payroll/periods" element={<ModuleAccessRoute module="payroll"><PayrollPeriodsPage language={language} /></ModuleAccessRoute>} />
              <Route path="/payroll/records" element={<ModuleAccessRoute module="payroll"><PayrollRecordsPage language={language} /></ModuleAccessRoute>} />

              <Route path="/kyc/clients" element={<ModuleAccessRoute module="kyc"><KycClientsPage language={language} /></ModuleAccessRoute>} />
              <Route path="/reports" element={<ModuleAccessRoute module="reports"><ReportsPage language={language} /></ModuleAccessRoute>} />
            </Route>
          </Route>

            {/* FALLBACK */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
