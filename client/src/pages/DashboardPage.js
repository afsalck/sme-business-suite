import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import MetricCard from "../components/MetricCard";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import DiagnosticInfo from "../components/DiagnosticInfo";
import apiClient from "../services/apiClient";
import { formatCurrency } from "../utils/formatters";

export default function DashboardPage({ language }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadMetrics = async () => {
      
      console.log("=".repeat(60));
      console.log("🟢 [DASHBOARD PAGE] Starting to load metrics...");
      console.log("   API Base URL:", process.env.REACT_APP_API_BASE_URL || "http://localhost:5004/api");
      console.log("   Endpoint: dashboard/metrics");
      console.log("   Full URL:", `${process.env.REACT_APP_API_BASE_URL || "http://localhost:5004/api"}/dashboard/metrics`);
      
      setLoading(true);
      setError(null);
      try {
        console.log("   [DASHBOARD PAGE] Making API request...");
        const { data } = await apiClient.get("/dashboard/metrics");
        console.log("   [DASHBOARD PAGE] ✅ API request successful!");
        console.log("   [DASHBOARD PAGE] Response data:", data);
        
        // Validate and normalize response data with safe fallbacks
        if (!data || typeof data !== 'object') {
          throw new Error("Invalid response format from server");
        }
        
        // Ensure data has the expected structure with safe fallbacks
        const normalizedData = {
          totals: {
            totalSales: data?.totals?.totalSales ?? 0,
            totalExpenses: data?.totals?.totalExpenses ?? 0,
            dailySales: data?.totals?.dailySales ?? 0,
            dailyExpenses: data?.totals?.dailyExpenses ?? 0,
            profit: data?.totals?.profit ?? 0,
            vatPayable: data?.totals?.vatPayable ?? 0,
            expiringDocs: data?.totals?.expiringDocs ?? 0,
            totalInvoices: data?.totals?.totalInvoices ?? 0,
            paidInvoices: data?.totals?.paidInvoices ?? 0,
            overdueInvoices: data?.totals?.overdueInvoices ?? 0
          },
          charts: {
            salesTrend: Array.isArray(data?.charts?.salesTrend) ? data.charts.salesTrend : [],
            expenseTrend: Array.isArray(data?.charts?.expenseTrend) ? data.charts.expenseTrend : []
          }
        };
        
        setMetrics(normalizedData);
        console.log("   [DASHBOARD PAGE] Metrics normalized:", normalizedData);
        console.log("=".repeat(60));
      } catch (err) {
        console.error("=".repeat(60));
        console.error("❌ [DASHBOARD PAGE] Error loading metrics:");
        console.error("   Error object:", err);
        console.error("   Error message:", err?.message);
        console.error("   Error response:", err?.response);
        console.error("   Status code:", err?.response?.status);
        console.error("   Response data:", err?.response?.data);
        console.error("   Request URL:", err?.config?.url);
        console.error("   Request method:", err?.config?.method);
        console.error("   Full request URL:", err?.config?.baseURL + err?.config?.url);
        console.error("=".repeat(60));
        const errorMessage = err?.response?.data?.message || err?.message || "Unknown error";
        const statusCode = err?.response?.status;
        
        let userFriendlyMessage = "Unable to load dashboard";
        if (statusCode === 401) {
          userFriendlyMessage = "Please log in again. Your session may have expired.";
        } else if (statusCode === 403) {
          userFriendlyMessage = "You don't have permission to view the dashboard.";
        } else if (statusCode >= 500) {
          userFriendlyMessage = "Server error. Please check if the backend is running.";
        } else if (err?.code === "ECONNREFUSED" || err?.code === "ERR_NETWORK" || err?.message?.includes("Network Error")) {
          userFriendlyMessage = "❌ Server is not running! Please start the server: cd server && npm run dev";
        } else {
          userFriendlyMessage = `Error: ${errorMessage}`;
        }
        
        setError({ message: userFriendlyMessage, original: err });
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, []);

  const cards = useMemo(() => {
    if (!metrics || !metrics.totals) return [];
    
    // Safe access with fallbacks to prevent crashes
    const totals = metrics.totals || {};
    
    return [
      {
        label: t("dashboard.totalSales"),
        value: formatCurrency(totals.totalSales ?? 0, language === "ar" ? "ar-AE" : "en-AE"),
        accent: "bg-emerald-100"
      },
      {
        label: t("dashboard.dailySales"),
        value: formatCurrency(totals.dailySales ?? 0, language === "ar" ? "ar-AE" : "en-AE"),
        accent: "bg-teal-100"
      },
      {
        label: t("dashboard.totalExpenses"),
        value: formatCurrency(
          totals.totalExpenses ?? 0,
          language === "ar" ? "ar-AE" : "en-AE"
        ),
        accent: "bg-rose-100"
      },
      {
        label: t("dashboard.dailyExpenses"),
        value: formatCurrency(totals.dailyExpenses ?? 0, language === "ar" ? "ar-AE" : "en-AE"),
        accent: "bg-pink-100"
      },
      {
        label: t("dashboard.profit"),
        value: formatCurrency(totals.profit ?? 0, language === "ar" ? "ar-AE" : "en-AE"),
        accent: "bg-indigo-100"
      },
      {
        label: t("dashboard.vatPayable"),
        value: formatCurrency(totals.vatPayable ?? 0, language === "ar" ? "ar-AE" : "en-AE"),
        accent: "bg-amber-100"
      },
      {
        label: t("dashboard.totalInvoices"),
        value: totals.totalInvoices ?? 0,
        accent: "bg-blue-100"
      },
      {
        label: t("dashboard.paidInvoices"),
        value: totals.paidInvoices ?? 0,
        accent: "bg-green-100"
      },
      {
        label: t("dashboard.overdueInvoices"),
        value: totals.overdueInvoices ?? 0,
        accent: "bg-red-100"
      }
    ];
  }, [metrics, t, language]);

  if (loading) {
    return <LoadingState message={t("common.loading")} />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <EmptyState
          title={error.message || "Unable to load dashboard"}
          description={
            error.message?.includes("Cannot connect")
              ? "Please check if the backend server is running on port 5004."
              : error.message?.includes("log in")
              ? "Try logging out and logging back in."
              : "Check your network connection or API settings."
          }
        />
        <DiagnosticInfo />
        {process.env.NODE_ENV === "development" && error.original && (
          <div className="rounded-lg bg-red-50 p-4 text-xs text-red-800">
            <strong>Debug Info:</strong>
            <pre className="mt-2 overflow-auto">
              {JSON.stringify(
                {
                  status: error.original?.response?.status,
                  message: error.original?.response?.data?.message,
                  code: error.original?.code
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
        <MetricCard
          label={t("dashboard.expiringDocs")}
          value={metrics?.totals?.expiringDocs ?? 0}
          accent="bg-orange-100"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">
            {t("dashboard.salesTrend")}
          </h3>
          <div className="h-64">
            {(!metrics?.charts?.salesTrend || metrics.charts.salesTrend.length === 0) ? (
              <EmptyState title="No sales data" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.charts.salesTrend}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0E7490" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#0E7490" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) =>
                      formatCurrency(value, language === "ar" ? "ar-AE" : "en-AE")
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#0E7490"
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">
            {t("dashboard.expenseTrend")}
          </h3>
          <div className="h-64">
            {(!metrics?.charts?.expenseTrend || metrics.charts.expenseTrend.length === 0) ? (
              <EmptyState title="No expense data" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.charts.expenseTrend}>
                  <defs>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) =>
                      formatCurrency(value, language === "ar" ? "ar-AE" : "en-AE")
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#f97316"
                    fillOpacity={1}
                    fill="url(#colorExpense)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        {t("dashboard.vatReminder")}
      </div>
    </div>
  );
}

