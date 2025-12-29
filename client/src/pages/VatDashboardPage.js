import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import dayjs from "dayjs";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import useAuth from "../hooks/useAuth";
import { formatCurrency } from "../utils/formatters";

export default function VatDashboardPage({ language }) {
  const { t } = useTranslation();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: dayjs().startOf("month").format("YYYY-MM-DD"),
    to: dayjs().endOf("month").format("YYYY-MM-DD")
  });

  const isAuthorized = role === "admin" || role === "accountant";

  useEffect(() => {
    if (!isAuthorized) return;
    loadSummary();
  }, [isAuthorized, dateRange]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to
      });
      const { data } = await apiClient.get(`/vat/summary?${params.toString()}`);
      setSummary(data);
    } catch (err) {
      console.error("Error loading VAT summary:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to,
        format
      });
      const response = await apiClient.get(`/vat/report?${params.toString()}`, {
        responseType: "blob"
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const extension = format === "pdf" ? "pdf" : "csv";
      link.setAttribute(
        "download",
        `vat-report-${dateRange.from}-${dateRange.to}.${extension}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting report:", err);
      alert(t("vatDashboard.failedToExport"));
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-700">{t("vatDashboard.accessDenied")}</p>
          <p className="mt-2 text-sm text-slate-500">
            {t("vatDashboard.onlyAdminAccountant")}
          </p>
        </div>
      </div>
    );
  }

  if (loading && !summary) {
    return <LoadingState message={t("vatDashboard.loadingDashboard")} />;
  }

  return (
    <div className={clsx("space-y-6", language === "ar" && "rtl")}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("vatDashboard.title")}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {t("vatDashboard.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("csv")}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t("vatDashboard.exportCsv")}
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            {t("vatDashboard.exportPdf")}
          </button>
        </div>
      </div>

      {/* Date Range */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-600">
              {t("vatDashboard.fromDate")}
            </label>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={dateRange.from}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, from: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">
              {t("vatDashboard.toDate")}
            </label>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={dateRange.to}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, to: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Taxable Sales</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatCurrency(summary.taxableSales)}
                </p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">VAT Collected</p>
                <p className="mt-2 text-2xl font-bold text-green-600">
                  {formatCurrency(summary.totalVatCollected)}
                </p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Zero-rated Sales</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatCurrency(summary.zeroRatedSales)}
                </p>
              </div>
              <div className="rounded-full bg-yellow-100 p-3">
                <svg
                  className="h-6 w-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Net VAT Payable</p>
                <p className={clsx(
                  "mt-2 text-2xl font-bold",
                  summary.netVatPayable >= 0 ? "text-red-600" : "text-green-600"
                )}>
                  {formatCurrency(summary.netVatPayable)}
                </p>
              </div>
              <div className={clsx(
                "rounded-full p-3",
                summary.netVatPayable >= 0 ? "bg-red-100" : "bg-green-100"
              )}>
                <svg
                  className={clsx(
                    "h-6 w-6",
                    summary.netVatPayable >= 0 ? "text-red-600" : "text-green-600"
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Stats */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Total Invoices</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {summary.totalInvoicesCount}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Exempt Sales</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {formatCurrency(summary.exemptSales)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">VAT Adjustments</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {formatCurrency(summary.adjustmentVat)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

