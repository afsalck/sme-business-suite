import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import dayjs from "dayjs";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import useAuth from "../hooks/useAuth";

export default function KycClientsPage({ language }) {
  const { t } = useTranslation();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    kycStatus: "",
    amlStatus: "",
    riskCategory: ""
  });
  const [viewingClient, setViewingClient] = useState(null);
  const [form, setForm] = useState({
    clientType: "individual",
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    nationality: "",
    companyName: "",
    tradeLicenseNumber: "",
    emiratesId: "",
    passportNumber: "",
    passportCountry: "",
    passportExpiry: "",
    trn: "",
    address: "",
    city: "",
    country: "UAE"
  });

  const isAuthorized = role === "admin" || role === "accountant";

  useEffect(() => {
    if (!isAuthorized) return;
    loadClients();
  }, [isAuthorized, filters]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.kycStatus) params.append("kycStatus", filters.kycStatus);
      if (filters.amlStatus) params.append("amlStatus", filters.amlStatus);
      if (filters.riskCategory) params.append("riskCategory", filters.riskCategory);

      const { data } = await apiClient.get(`/kyc?${params.toString()}`);
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading clients:", err);
      setError(err.response?.data?.message || t("kyc.failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const { data } = await apiClient.post("/kyc", form);
      setClients((prev) => [data, ...prev]);
      setShowCreateForm(false);
      setForm({
        clientType: "individual",
        fullName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        nationality: "",
        companyName: "",
        tradeLicenseNumber: "",
        emiratesId: "",
        passportNumber: "",
        passportCountry: "",
        passportExpiry: "",
        trn: "",
        address: "",
        city: "",
        country: "UAE"
      });
      alert(t("kyc.clientCreated"));
    } catch (err) {
      console.error("Error creating client:", err);
      setError(err.response?.data?.message || t("kyc.failedToCreate"));
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateKycStatus = async (clientId, status) => {
    if (!confirm(t("kyc.changeKycStatusConfirm", { status }))) {
      return;
    }

    try {
      const { data } = await apiClient.put(`/kyc/${clientId}/kyc-status`, { status });
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? data : c))
      );
      alert(t("kyc.kycStatusUpdated"));
    } catch (err) {
      console.error("Error updating KYC status:", err);
      alert(err.response?.data?.message || t("kyc.failedToUpdateKycStatus"));
    }
  };

  const handlePerformAmlScreening = async (clientId) => {
    if (!confirm(t("kyc.performAmlScreeningConfirm"))) {
      return;
    }

    try {
      await apiClient.post(`/kyc/${clientId}/aml-screening`, {
        screeningType: "sanctions"
      });
      alert(t("kyc.amlScreeningCompleted"));
      loadClients();
    } catch (err) {
      console.error("Error performing AML screening:", err);
      alert(err.response?.data?.message || t("kyc.failedToPerformAml"));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-gray-100 text-gray-800";
      case "in_review":
        return "bg-blue-100 text-blue-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "cleared":
        return "bg-green-100 text-green-800";
      case "flagged":
        return "bg-yellow-100 text-yellow-800";
      case "blocked":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRiskColor = (category) => {
    switch (category) {
      case "low":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-700">{t("kyc.accessDenied")}</p>
          <p className="mt-2 text-sm text-slate-500">
            {t("kyc.onlyAdminAccountant")}
          </p>
        </div>
      </div>
    );
  }

  if (loading && clients.length === 0) {
    return <LoadingState message={t("kyc.loadingClients")} />;
  }

  return (
    <div className={clsx("space-y-6", language === "ar" && "rtl")}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("kyc.title")}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {t("kyc.subtitle")}
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          {showCreateForm ? t("common.cancel") : t("kyc.newClient")}
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("kyc.kycStatus")}
            </label>
            <select
              value={filters.kycStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, kycStatus: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">{t("kyc.all")}</option>
              <option value="pending">{t("kyc.pending")}</option>
              <option value="in_review">{t("kyc.inReview")}</option>
              <option value="approved">{t("kyc.approved")}</option>
              <option value="rejected">{t("kyc.rejected")}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("kyc.amlStatus")}
            </label>
            <select
              value={filters.amlStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, amlStatus: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">{t("kyc.all")}</option>
              <option value="pending">{t("kyc.pending")}</option>
              <option value="cleared">{t("kyc.cleared")}</option>
              <option value="flagged">{t("kyc.flagged")}</option>
              <option value="blocked">{t("kyc.blocked")}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("kyc.riskCategory")}
            </label>
            <select
              value={filters.riskCategory}
              onChange={(e) => setFilters(prev => ({ ...prev, riskCategory: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">{t("kyc.all")}</option>
              <option value="low">{t("kyc.low")}</option>
              <option value="medium">{t("kyc.medium")}</option>
              <option value="high">{t("kyc.high")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">{t("kyc.createNewClient")}</h2>
          <form onSubmit={handleCreateClient} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("kyc.clientType")} *
                </label>
                <select
                  value={form.clientType}
                  onChange={(e) => setForm(prev => ({ ...prev, clientType: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="individual">{t("kyc.individual")}</option>
                  <option value="company">{t("kyc.company")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("kyc.fullName")} *
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              {form.clientType === "company" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t("kyc.companyName")}
                    </label>
                    <input
                      type="text"
                      value={form.companyName}
                      onChange={(e) => setForm(prev => ({ ...prev, companyName: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t("kyc.tradeLicenseNumber")}
                    </label>
                    <input
                      type="text"
                      value={form.tradeLicenseNumber}
                      onChange={(e) => setForm(prev => ({ ...prev, tradeLicenseNumber: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("kyc.email") || t("common.email")}
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("kyc.phone") || t("common.phone")}
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Emirates ID
                </label>
                <input
                  type="text"
                  value={form.emiratesId}
                  onChange={(e) => setForm(prev => ({ ...prev, emiratesId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Passport Number
                </label>
                <input
                  type="text"
                  value={form.passportNumber}
                  onChange={(e) => setForm(prev => ({ ...prev, passportNumber: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  TRN
                </label>
                <input
                  type="text"
                  value={form.trn}
                  onChange={(e) => setForm(prev => ({ ...prev, trn: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
                {creating ? t("kyc.creating") : t("kyc.createClient")}
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

      {/* Clients List */}
      {clients.length === 0 ? (
        <EmptyState title={t("kyc.noClientsFound")} />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t("kyc.name")}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t("kyc.type")}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t("kyc.kycStatus")}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t("kyc.amlStatus")}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t("kyc.risk")}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{client.fullName}</div>
                      <div className="text-xs text-slate-500">{client.email || client.phone || "—"}</div>
                    </td>
                    <td className="px-6 py-4 text-sm capitalize">{client.clientType}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(client.kycStatus)}`}>
                        {client.kycStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(client.amlStatus)}`}>
                        {client.amlStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getRiskColor(client.riskCategory)}`}>
                        {client.riskCategory} ({client.riskScore})
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewingClient(client)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          {t("kyc.view")}
                        </button>
                        <button
                          onClick={() => handlePerformAmlScreening(client.id)}
                          className="text-sm text-green-600 hover:text-green-700"
                        >
                          {t("kyc.screen")}
                        </button>
                        {client.kycStatus === "pending" && (
                          <button
                            onClick={() => handleUpdateKycStatus(client.id, "in_review")}
                            className="text-sm text-yellow-600 hover:text-yellow-700"
                          >
                            {t("kyc.review")}
                          </button>
                        )}
                        {client.kycStatus === "in_review" && (
                          <>
                            <button
                              onClick={() => handleUpdateKycStatus(client.id, "approved")}
                              className="text-sm text-green-600 hover:text-green-700"
                            >
                              {t("kyc.approve")}
                            </button>
                            <button
                              onClick={() => handleUpdateKycStatus(client.id, "rejected")}
                              className="text-sm text-red-600 hover:text-red-700"
                            >
                              {t("kyc.reject")}
                            </button>
                          </>
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

      {/* Client Detail Modal */}
      {viewingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{viewingClient.fullName}</h2>
              <button
                onClick={() => setViewingClient(null)}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">{t("common.email")}</label>
                  <p className="text-sm text-slate-900">{viewingClient.email || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">{t("common.phone")}</label>
                  <p className="text-sm text-slate-900">{viewingClient.phone || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">{t("kyc.emiratesId")}</label>
                  <p className="text-sm text-slate-900">{viewingClient.emiratesId || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">{t("kyc.passportNumber")}</label>
                  <p className="text-sm text-slate-900">{viewingClient.passportNumber || "—"}</p>
                </div>
              </div>
              {viewingClient.documents && viewingClient.documents.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">{t("kyc.documents")}</h3>
                  <div className="space-y-2">
                    {viewingClient.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <span className="text-sm">{doc.documentName}</span>
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(doc.status)}`}>
                          {doc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

