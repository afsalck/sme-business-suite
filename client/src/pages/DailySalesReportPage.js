import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";

const formatCurrency = (amount, locale = "en-AE") => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2
  }).format(amount || 0);
};

export default function DailySalesReportPage({ language }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: dayjs().subtract(30, "day").format("YYYY-MM-DD"),
    to: dayjs().format("YYYY-MM-DD")
  });

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get("/inventory/sales/daily-report", {
        params: {
          from: dateRange.from,
          to: dateRange.to
        }
      });
      setReportData(data);
    } catch (err) {
      console.error("Error loading daily sales report:", err);
      setError(err.response?.data?.message || err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [dateRange.from, dateRange.to]);

  const handleDateChange = (field, value) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
  };

  const handleQuickFilter = (days) => {
    setDateRange({
      from: dayjs().subtract(days, "day").format("YYYY-MM-DD"),
      to: dayjs().format("YYYY-MM-DD")
    });
  };

  const handleDownloadExcel = async () => {
    setDownloading(true);
    setError(null);
    try {
      console.log("[Excel Download] Starting download...");
      console.log("[Excel Download] Date range:", { from: dateRange.from, to: dateRange.to });
      
      const response = await apiClient.get("/inventory/sales/daily-report/excel", {
        params: {
          from: dateRange.from,
          to: dateRange.to
        },
        responseType: "blob" // Important for binary data
      });

      console.log("[Excel Download] Response received:", {
        status: response.status,
        headers: response.headers,
        dataType: typeof response.data,
        dataSize: response.data?.size || response.data?.length || "unknown"
      });

      // Check if response is actually a blob
      if (!(response.data instanceof Blob)) {
        // If it's a string, it might be an error JSON
        if (typeof response.data === 'string') {
          try {
            const errorData = JSON.parse(response.data);
            throw new Error(errorData.message || "Failed to download Excel file");
          } catch (parseErr) {
            throw new Error("Server returned invalid data. Expected Excel file.");
          }
        }
        throw new Error("Invalid response format. Expected blob.");
      }

      // Create a blob from the response
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });

      console.log("[Excel Download] Blob created:", {
        size: blob.size,
        type: blob.type
      });

      if (blob.size === 0) {
        throw new Error("Downloaded file is empty. Please try again.");
      }

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `daily-sales-report-${dateRange.from}-to-${dateRange.to}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log("[Excel Download] Download triggered successfully");
      setDownloading(false);
    } catch (err) {
      setDownloading(false);
      console.error("[Excel Download] Error:", err);
      console.error("[Excel Download] Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      // Try to extract error message from blob response if it's an error
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const errorData = JSON.parse(text);
          setError(errorData.message || "Failed to download Excel file");
        } catch {
          setError(err.message || "Failed to download Excel file");
        }
      } else {
        setError(err.response?.data?.message || err.message || "Failed to download Excel file");
      }
    }
  };

  if (loading) {
    return <LoadingState message={t("common.loading")} />;
  }

  if (error && !reportData) {
    return (
      <EmptyState
        title="Failed to load report"
        description={error}
        action={
          <button
            type="button"
            onClick={loadReport}
            className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Daily Sales Report</h1>
          <p className="mt-1 text-sm text-slate-500">
            View sales performance by day
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadExcel}
          disabled={downloading}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {downloading ? "Downloading..." : "Download Excel"}
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600">From Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={dateRange.from}
                onChange={(e) => handleDateChange("from", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">To Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={dateRange.to}
                onChange={(e) => handleDateChange("to", e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleQuickFilter(7)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => handleQuickFilter(30)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => handleQuickFilter(90)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Last 90 Days
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {reportData && reportData.totals && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Total Sales</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {formatCurrency(reportData.totals.totalSales, language === "ar" ? "ar-AE" : "en-AE")}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Total VAT</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {formatCurrency(reportData.totals.totalVAT, language === "ar" ? "ar-AE" : "en-AE")}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Total Items Sold</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {reportData.totals.totalItems.toLocaleString()}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Transactions</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {reportData.totals.transactionCount}
            </div>
          </div>
        </div>
      )}

      {/* Daily Report Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Daily Breakdown</h2>
        {!reportData || !reportData.dailyData || reportData.dailyData.length === 0 ? (
          <EmptyState title="No sales data found" description="No sales recorded for the selected period." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">Transactions</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">Items Sold</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">VAT</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">Total Sales</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reportData.dailyData.map((day) => (
                  <tr key={day.date} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {dayjs(day.date).format("MMM DD, YYYY")}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {day.transactionCount}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {day.totalItems}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatCurrency(day.totalVAT, language === "ar" ? "ar-AE" : "en-AE")}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatCurrency(day.totalSales, language === "ar" ? "ar-AE" : "en-AE")}
                    </td>
                    <td className="px-4 py-3">
                      <details className="cursor-pointer">
                        <summary className="text-primary hover:text-primary-dark text-sm font-medium">
                          View Details
                        </summary>
                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <div className="space-y-2">
                            {day.sales.map((sale, idx) => (
                              <div key={sale.id || idx} className="flex justify-between items-start border-b border-slate-200 pb-2 last:border-0">
                                <div className="flex-1">
                                  <div className="font-medium text-slate-700">
                                    {sale.summary || `Sale #${sale.id}`}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    {dayjs(sale.date).format("HH:mm")} • {sale.items?.length || 0} items
                                  </div>
                                  {sale.items && Array.isArray(sale.items) && (
                                    <div className="mt-1 text-xs text-slate-600">
                                      {sale.items.map((item, i) => (
                                        <span key={i}>
                                          {item.name} × {item.quantity}
                                          {i < sale.items.length - 1 && ", "}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right ml-4">
                                  <div className="font-semibold text-slate-900">
                                    {formatCurrency(sale.totalSales, language === "ar" ? "ar-AE" : "en-AE")}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    VAT: {formatCurrency(sale.totalVAT, language === "ar" ? "ar-AE" : "en-AE")}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

