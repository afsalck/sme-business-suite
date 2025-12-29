import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import dayjs from "dayjs";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import useAuth from "../hooks/useAuth";
import { formatCurrency } from "../utils/formatters";

export default function VatReportPage({ language }) {
  const { t } = useTranslation();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: dayjs().startOf("month").format("YYYY-MM-DD"),
    to: dayjs().endOf("month").format("YYYY-MM-DD")
  });

  const isAuthorized = role === "admin" || role === "accountant";

  useEffect(() => {
    if (!isAuthorized) return;
    loadReport();
  }, [isAuthorized, dateRange]);

  const loadReport = async () => {
    setLoading(true);
    try {
      // For now, we'll use the summary endpoint and get report data separately
      // In a real implementation, you might have a dedicated report endpoint
      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to
      });
      const { data: summary } = await apiClient.get(`/vat/summary?${params.toString()}`);
      
      // For the report page, we'll show a summary and allow export
      // The actual detailed report is available via export
      setReportData({ summary });
    } catch (err) {
      console.error("Error loading VAT report:", err);
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
      alert(t("vatReport.failedToExport"));
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-700">{t("vatReport.accessDenied")}</p>
          <p className="mt-2 text-sm text-slate-500">
            {t("vatReport.onlyAdminAccountant")}
          </p>
        </div>
      </div>
    );
  }

  if (loading && !reportData) {
    return <LoadingState message={t("vatReport.loadingReport")} />;
  }

  return (
    <div className={clsx("space-y-6", language === "ar" && "rtl")}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("vatReport.title")}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {t("vatReport.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("csv")}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t("vatReport.exportCsv")}
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            {t("vatReport.exportPdf")}
          </button>
        </div>
      </div>

      {/* Date Range */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-600">
              {t("vatReport.fromDate")}
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
              {t("vatReport.toDate")}
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

      {/* Report Summary */}
      {reportData?.summary && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">{t("vatReport.reportSummary")}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-slate-600">{t("vatReport.totalInvoices")}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {reportData.summary.totalInvoicesCount}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">{t("vatReport.taxableSales")}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatCurrency(reportData.summary.taxableSales)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">{t("vatReport.vatCollected")}</p>
              <p className="mt-1 text-2xl font-bold text-green-600">
                {formatCurrency(reportData.summary.totalVatCollected)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">{t("vatReport.netVatPayable")}</p>
              <p className={clsx(
                "mt-1 text-2xl font-bold",
                reportData.summary.netVatPayable >= 0 ? "text-red-600" : "text-green-600"
              )}>
                {formatCurrency(reportData.summary.netVatPayable)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Export Instructions */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
        <h3 className="mb-2 text-sm font-semibold text-blue-900">
          {t("vatReport.exportInstructions")}
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>
            • <strong>{t("vatReport.exportCsv")}:</strong> {t("vatReport.csvExportDescription")}
          </li>
          <li>
            • <strong>{t("vatReport.exportPdf")}:</strong> {t("vatReport.pdfExportDescription")}
          </li>
          <li>
            • {t("vatReport.reportsIncludeAll")}
          </li>
          <li>
            • {t("vatReport.ensureTrnConfigured")}
          </li>
        </ul>
      </div>
    </div>
  );
}

