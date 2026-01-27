import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import dayjs from "dayjs";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import useAuth from "../hooks/useAuth";
import { formatCurrency } from "../utils/formatters";

export default function ReportsPage({ language }) {
  const { t } = useTranslation();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [executingReport, setExecutingReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    reportName: "",
    reportType: "financial",
    description: "",
    dateRange: "last_month",
    startDate: "",
    endDate: ""
  });

  const isAuthorized = role === "admin" || role === "accountant";

  useEffect(() => {
    if (!isAuthorized) return;
    loadReports();
  }, [isAuthorized]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/reports");
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading reports:", err);
      setError(err.response?.data?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const { data } = await apiClient.post("/reports", {
        ...form,
        config: {},
        filters: {}
      });
      setReports((prev) => [data, ...prev]);
      setShowCreateForm(false);
      setForm({
        reportName: "",
        reportType: "financial",
        description: "",
        dateRange: "last_month",
        startDate: "",
        endDate: ""
      });
      alert("Report created successfully!");
    } catch (err) {
      console.error("Error creating report:", err);
      setError(err.response?.data?.message || "Failed to create report");
    } finally {
      setCreating(false);
    }
  };

  const handleExecuteReport = async (reportId) => {
    setExecutingReport(reportId);
    setError(null);
    setReportData(null);
    
    try {
      console.log(`[Reports] Executing report ${reportId}...`);
      const { data } = await apiClient.post(`/reports/${reportId}/execute`);
      console.log(`[Reports] Report executed successfully:`, data);
      
      if (data && (data.data || data.recordCount !== undefined)) {
        setReportData({ reportId, ...data });
      } else {
        throw new Error("Invalid report response received");
      }
    } catch (err) {
      console.error("Error executing report:", err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to execute report";
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
    } finally {
      setExecutingReport(null);
    }
  };

  const handleExportReport = async (reportId, format = "excel") => {
    try {
      // Request the file as a blob
      const response = await apiClient.get(`/reports/${reportId}/export?format=${format}`, {
        responseType: 'blob'
      });
      
      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'report.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
      
      alert("Report exported and downloaded successfully!");
    } catch (err) {
      console.error("Error exporting report:", err);
      
      // If it's a blob error, try to read the error message
      if (err.response?.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result);
            alert(errorData.message || "Failed to export report");
          } catch {
            alert("Failed to export report");
          }
        };
        reader.readAsText(err.response.data);
      } else {
        alert(err.response?.data?.message || "Failed to export report");
      }
    }
  };

  const getReportTypeColor = (type) => {
    switch (type) {
      case "financial":
        return "bg-blue-100 text-blue-800";
      case "sales":
        return "bg-green-100 text-green-800";
      case "expenses":
        return "bg-red-100 text-red-800";
      case "payroll":
        return "bg-purple-100 text-purple-800";
      case "compliance":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-700">Access Denied</p>
          <p className="mt-2 text-sm text-slate-500">
            Only administrators and accountants can access reports.
          </p>
        </div>
      </div>
    );
  }

  if (loading && reports.length === 0) {
    return <LoadingState message="Loading reports..." />;
  }

  return (
    <div className={clsx("space-y-6", language === "ar" && "rtl")}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-slate-600">
            Generate comprehensive reports from all modules
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          {showCreateForm ? "Cancel" : "+ New Report"}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Create New Report</h2>
          <form onSubmit={handleCreateReport} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Report Name *
                </label>
                <input
                  type="text"
                  value={form.reportName}
                  onChange={(e) => setForm(prev => ({ ...prev, reportName: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Report Type *
                </label>
                <select
                  value={form.reportType}
                  onChange={(e) => setForm(prev => ({ ...prev, reportType: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="financial">Financial</option>
                  <option value="sales">Sales</option>
                  <option value="expenses">Expenses</option>
                  <option value="payroll">Payroll</option>
                  <option value="compliance">Compliance</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date Range
                </label>
                <select
                  value={form.dateRange}
                  onChange={(e) => setForm(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last_week">Last Week</option>
                  <option value="last_month">Last Month</option>
                  <option value="last_quarter">Last Quarter</option>
                  <option value="last_year">Last Year</option>
                  <option value="this_month">This Month</option>
                  <option value="this_year">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              {form.dateRange === "custom" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create Report"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setError(null);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reports List */}
      {reports.length === 0 ? (
        <EmptyState title="No reports found" />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Report Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Date Range</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Last Run</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{report.reportName}</div>
                      {report.description && (
                        <div className="text-xs text-slate-500">{report.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium capitalize ${getReportTypeColor(report.reportType)}`}>
                        {report.reportType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {report.dateRange || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {report.lastRunAt ? dayjs(report.lastRunAt).format("DD MMM YYYY HH:mm") : "Never"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleExecuteReport(report.id)}
                          disabled={executingReport === report.id}
                          className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-60"
                        >
                          {executingReport === report.id ? "Running..." : "Run"}
                        </button>
                        <button
                          onClick={() => handleExportReport(report.id, "excel")}
                          className="text-sm text-green-600 hover:text-green-700"
                        >
                          Export
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report Results */}
      {reportData && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-800">Report Results</h2>
            <button
              onClick={() => setReportData(null)}
              className="text-slate-500 hover:text-slate-700"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600">Records</div>
                <div className="text-2xl font-bold text-slate-900">{reportData.recordCount || 0}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600">Execution Time</div>
                <div className="text-2xl font-bold text-slate-900">{reportData.executionTime || 0}ms</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600">Date Range</div>
                <div className="text-sm font-medium text-slate-900">
                  {reportData.dateRange?.startDate && dayjs(reportData.dateRange.startDate).format("DD MMM YYYY")} - {reportData.dateRange?.endDate && dayjs(reportData.dateRange.endDate).format("DD MMM YYYY")}
                </div>
              </div>
            </div>
            {reportData.summary && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(reportData.summary).map(([key, value]) => (
                    <div key={key} className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-sm text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-sm font-medium text-slate-900">
                        {typeof value === 'number' && (key.includes('total') || key.includes('amount') || key.includes('revenue') || key.includes('expenses') || key.includes('Sales') || key.includes('Profit'))
                          ? formatCurrency(value, language === "ar" ? "ar-AE" : "en-AE")
                          : value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

