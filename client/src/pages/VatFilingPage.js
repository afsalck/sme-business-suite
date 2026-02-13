import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import dayjs from "dayjs";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import useAuth from "../hooks/useAuth";
import { formatCurrency } from "../utils/formatters";

export default function VatFilingPage({ language }) {
  const { t } = useTranslation();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [filings, setFilings] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    periodStartDate: dayjs().startOf("month").format("YYYY-MM-DD"),
    periodEndDate: dayjs().endOf("month").format("YYYY-MM-DD")
  });

  const isAuthorized = role === "admin" || role === "accountant";

  useEffect(() => {
    if (!isAuthorized) return;
    loadFilings();
  }, [isAuthorized]);

  const loadFilings = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/vat-filings");
      setFilings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading VAT filings:", err);
      setError(err.response?.data?.message || t("vatFiling.failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFiling = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const { data } = await apiClient.post("/vat-filings", form);
      setFilings((prev) => [data, ...prev]);
      setShowCreateForm(false);
      setForm({
        periodStartDate: dayjs().startOf("month").format("YYYY-MM-DD"),
        periodEndDate: dayjs().endOf("month").format("YYYY-MM-DD")
      });
      alert(t("vatFiling.filingCreated"));
    } catch (err) {
      console.error("Error creating VAT filing:", err);
      setError(err.response?.data?.message || t("vatFiling.failedToCreate"));
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateFiles = async (filingId) => {
    try {
      await apiClient.post(`/vat-filings/${filingId}/generate-files`);
      alert(t("vatFiling.filesGenerated"));
      loadFilings();
    } catch (err) {
      console.error("Error generating files:", err);
      alert(err.response?.data?.message || t("vatFiling.failedToGenerate"));
    }
  };

  const handleDownloadXml = async (filingId) => {
    try {
      const response = await apiClient.get(`/vat-filings/${filingId}/download-xml`, {
        responseType: "blob"
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `VAT-Return-${filingId}.xml`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading XML:", err);
      alert(err.response?.data?.message || t("vatFiling.failedToDownloadXml"));
    }
  };

  const handleDownloadCsv = async (filingId) => {
    try {
      const response = await apiClient.get(`/vat-filings/${filingId}/download-csv`, {
        responseType: "blob"
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `VAT-Return-${filingId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading CSV:", err);
      alert(err.response?.data?.message || t("vatFiling.failedToDownloadCsv"));
    }
  };

  const handleSubmit = async (filingId) => {
    if (!window.confirm(t("vatFiling.submitConfirm"))) {
      return;
    }

    try {
      await apiClient.post(`/vat-filings/${filingId}/submit`);
      alert(t("vatFiling.filingSubmitted"));
      loadFilings();
    } catch (err) {
      console.error("Error submitting filing:", err);
      alert(err.response?.data?.message || t("vatFiling.failedToSubmit"));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "submitted":
        return "bg-blue-100 text-blue-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "corrected":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-700">{t("vatFiling.accessDenied")}</p>
          <p className="mt-2 text-sm text-slate-500">
            {t("vatFiling.onlyAdminAccountant")}
          </p>
        </div>
      </div>
    );
  }

  if (loading && filings.length === 0) {
    return <LoadingState message={t("vatFiling.loadingFilings")} />;
  }

  return (
    <div className={clsx("space-y-6", language === "ar" && "rtl")}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("vatFiling.title")}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {t("vatFiling.subtitle")}
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          {showCreateForm ? t("common.cancel") : t("vatFiling.newFiling")}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">{t("vatFiling.createNewFiling")}</h2>
          <form onSubmit={handleCreateFiling}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("vatFiling.periodStartDate")} *
                </label>
                <input
                  type="date"
                  value={form.periodStartDate}
                  onChange={(e) => setForm(prev => ({ ...prev, periodStartDate: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("vatFiling.periodEndDate")} *
                </label>
                <input
                  type="date"
                  value={form.periodEndDate}
                  onChange={(e) => setForm(prev => ({ ...prev, periodEndDate: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
              >
                {creating ? t("vatFiling.creating") : t("vatFiling.createFiling")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setError(null);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filings List */}
      {filings.length === 0 ? (
        <EmptyState title={t("vatFiling.noFilingsFound")} />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t("vatFiling.period")}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t("common.dueDate") || "Due Date"}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t("vatFiling.taxableSales")}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t("vatFiling.vatCollected")}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t("vatFiling.netVatPayable")}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t("vatFiling.status")}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t("vatFiling.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filings.map((filing) => (
                  <tr key={filing.id}>
                    <td className="px-6 py-4 text-sm">
                      {dayjs(filing.periodStartDate).format("MMM YYYY")}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {dayjs(filing.dueDate).format("DD MMM YYYY")}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {formatCurrency(filing.taxableSales, language === "ar" ? "ar-AE" : "en-AE")}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {formatCurrency(filing.totalVatCollected, language === "ar" ? "ar-AE" : "en-AE")}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold">
                      {formatCurrency(filing.netVatPayable, language === "ar" ? "ar-AE" : "en-AE")}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(filing.status)}`}>
                        {t(`vatFiling.${filing.status}`) || filing.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {filing.status === "draft" && (
                          <>
                            {!filing.ftaXmlFile && (
                              <button
                                onClick={() => handleGenerateFiles(filing.id)}
                                className="text-sm text-blue-600 hover:text-blue-700"
                              >
                                {t("vatFiling.generateFiles")}
                              </button>
                            )}
                            {filing.ftaXmlFile && (
                              <>
                                <button
                                  onClick={() => handleDownloadXml(filing.id)}
                                  className="text-sm text-green-600 hover:text-green-700"
                                >
                                  {t("vatFiling.downloadXml")}
                                </button>
                                <button
                                  onClick={() => handleDownloadCsv(filing.id)}
                                  className="text-sm text-green-600 hover:text-green-700"
                                >
                                  {t("vatFiling.downloadCsv")}
                                </button>
                                <button
                                  onClick={() => handleSubmit(filing.id)}
                                  className="text-sm text-primary hover:text-primary-dark font-medium"
                                >
                                  {t("vatFiling.submit")}
                                </button>
                              </>
                            )}
                          </>
                        )}
                        {filing.status === "submitted" && filing.ftaReferenceNumber && (
                          <span className="text-xs text-slate-500">
                            Ref: {filing.ftaReferenceNumber}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

