import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import useAuth from "../hooks/useAuth";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import { isDeveloper } from "../utils/developerCheck";
import dayjs from "dayjs";

export default function CompaniesManagementPage({ language }) {
  const { t } = useTranslation();
  const { role, user, loading: authLoading } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingCompanyId, setDeletingCompanyId] = useState(null);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    shopName: "",
    emailDomain: "",
    address: "",
    trn: "",
    email: "",
    phone: "",
    website: "",
    enabledModules: null // null = all modules, array = specific modules
  });

  // Available modules for selection
  const availableModules = [
    { id: "dashboard", label: "Dashboard" },
    { id: "invoices", label: "Invoices" },
    { id: "inventory", label: "Inventory & Sales" },
    { id: "pos", label: "Point of Sale (POS)" },
    { id: "expenses", label: "Expenses" },
    { id: "reports", label: "Reports" },
    { id: "hr", label: "HR Management" },
    { id: "payroll", label: "Payroll" },
    { id: "accounting", label: "Accounting" },
    { id: "vat", label: "VAT" },
    { id: "kyc", label: "KYC/AML" }
  ];

  useEffect(() => {
    // Wait for auth to load, then check if user is developer (which requires admin role)
    if (!authLoading && user) {
      const isDev = isDeveloper(user);
      if (isDev || role === "admin") {
        loadCompanies();
      } else {
        // Not a developer or admin, but DeveloperRoute should have blocked this
        setLoading(false);
      }
    }
  }, [role, user, authLoading]);

  const loadCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("[CompaniesManagement] Loading companies...");
      const { data } = await apiClient.get("/company/admin/all");
      console.log("[CompaniesManagement] Companies loaded:", data);
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("=".repeat(60));
      console.error("[CompaniesManagement] Error loading companies:");
      console.error("Error:", err);
      console.error("Response:", err?.response);
      console.error("Status:", err?.response?.status);
      console.error("Data:", err?.response?.data);
      console.error("=".repeat(60));
      
      const errorMessage = err?.response?.data?.message 
        || err?.message 
        || "Failed to load companies";
      setError(errorMessage);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingCompany) {
        // Update existing company
        const endpoint = `/company/admin/${editingCompany.companyId}`;
        console.log(`[Companies] 🚀 Updating company via PUT ${endpoint}`);
        console.log(`[Companies] 📦 Payload:`, formData);
        
        const response = await apiClient.put(endpoint, formData);
        console.log(`[Companies] ✅ Company updated successfully:`, response.data);
        
        setEditingCompany(null);
        alert(t("companies.updatedSuccessfully") || "Company updated successfully!");
      } else {
        // Create new company
        const endpoint = "/company/admin/create";
        console.log(`[Companies] 🚀 Creating company via POST ${endpoint}`);
        console.log(`[Companies] 📦 Payload:`, formData);
        
        const response = await apiClient.post(endpoint, formData);
        console.log(`[Companies] ✅ Company created successfully:`, response.data);
        
        setShowForm(false);
      }
      
      setFormData({
        name: "",
        shopName: "",
        emailDomain: "",
        address: "",
        trn: "",
        email: "",
        phone: "",
        website: "",
        enabledModules: null
      });
      await loadCompanies();
      
      if (!editingCompany) {
        alert(t("companies.createdSuccessfully") || "Company created successfully!");
      }
    } catch (err) {
      console.error("=".repeat(60));
      console.error("[Companies] ❌ Error saving company:");
      console.error("=".repeat(60));
      console.error("Error object:", err);
      console.error("Error message:", err?.message);
      console.error("Error response:", err?.response);
      console.error("Error response data:", err?.response?.data);
      console.error("Error response status:", err?.response?.status);
      console.error("Request URL:", err?.config?.url);
      console.error("Request method:", err?.config?.method);
      console.error("Full URL:", err?.config?.baseURL + err?.config?.url);
      console.error("=".repeat(60));
      
      const errorMessage = err?.response?.data?.message 
        || err?.message 
        || `Failed to ${editingCompany ? 'update' : 'create'} company`;
      
      setError(errorMessage);
      
      // Show detailed error in alert for debugging
      if (process.env.NODE_ENV === 'development') {
        alert(`Error: ${errorMessage}\n\nCheck console for details.`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name || "",
      shopName: company.shopName || "",
      emailDomain: company.emailDomains?.[0] || "",
      address: company.address || "",
      trn: company.trn || "",
      email: company.email || "",
      phone: company.phone || "",
      website: company.website || "",
      enabledModules: company.enabledModules || null
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCompany(null);
    setFormData({
      name: "",
      shopName: "",
      emailDomain: "",
      address: "",
      trn: "",
      email: "",
      phone: "",
      website: ""
    });
  };

  const handleDelete = async (company) => {
    // Prevent deleting default company
    if (company.companyId === 1) {
      alert(t("companies.cannotDeleteDefault") || "Cannot delete the default company");
      return;
    }

    const confirmMessage = t("companies.deleteConfirm") 
      ? t("companies.deleteConfirm").replace("{name}", company.name)
      : `Are you sure you want to delete "${company.name}"? This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setDeleting(true);
    setDeletingCompanyId(company.companyId);
    setError(null);

    try {
      const endpoint = `/company/admin/${company.companyId}`;
      console.log(`[Companies] 🗑️ Deleting company via DELETE ${endpoint}`);
      
      await apiClient.delete(endpoint);
      console.log(`[Companies] ✅ Company deleted successfully`);
      
      alert(t("companies.deletedSuccessfully") || "Company deleted successfully!");
      await loadCompanies();
    } catch (err) {
      console.error("=".repeat(60));
      console.error("[Companies] ❌ Error deleting company:");
      console.error("=".repeat(60));
      console.error("Error object:", err);
      console.error("Error message:", err?.message);
      console.error("Error response:", err?.response);
      console.error("Error response data:", err?.response?.data);
      console.error("=".repeat(60));
      
      const errorMessage = err?.response?.data?.message 
        || err?.message 
        || "Failed to delete company";
      
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
    } finally {
      setDeleting(false);
      setDeletingCompanyId(null);
    }
  };

  // Show loading while auth is being determined
  if (authLoading) {
    return <LoadingState />;
  }

  // Check if user is developer (DeveloperRoute should have already checked this, but double-check)
  const isDev = isDeveloper(user);
  if (!isDev && role !== "admin") {
    return (
      <div className="flex h-64 items-center justify-center">
        <EmptyState
          title={t("admin.accessDenied") || "Access Denied"}
          description={t("admin.mustBeAdmin") || "You must be an admin to access this page"}
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className={`space-y-6 ${language === "ar" ? "rtl" : ""}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t("companies.title") || "Companies Management"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t("companies.subtitle") || "Add and manage client companies"}
          </p>
        </div>
        <button
          onClick={() => {
            if (showForm) {
              handleCancel();
            } else {
              setShowForm(true);
              setEditingCompany(null);
            }
          }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          {showForm ? "✕ " : "+ "}
          {showForm 
            ? (t("common.cancel") || "Cancel")
            : (t("companies.addNew") || "Add New Company")
          }
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {editingCompany 
              ? (t("companies.editCompany") || "Edit Company")
              : (t("companies.addNewCompany") || "Add New Company")
            }
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("companies.companyName") || "Company Name"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder={t("companies.placeholders.companyName") || "e.g., ABC Company"}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("companies.shopName") || "Shop Name"}
                </label>
                <input
                  type="text"
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder={t("companies.placeholders.shopName") || "e.g., ABC Shop"}
                />
              </div>
            </div>

            {!editingCompany && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("companies.emailDomain") || "Email Domain"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.emailDomain}
                  onChange={(e) => setFormData({ ...formData, emailDomain: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder={t("companies.placeholders.emailDomain") || "e.g., abc.com"}
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  {t("companies.emailDomainHelper") || "Users with this email domain will be assigned to this company"}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t("companies.address") || "Address"}
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                rows={2}
                placeholder={t("companies.placeholders.address") || "Company address"}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("companies.trn") || "TRN"}
                </label>
                <input
                  type="text"
                  value={formData.trn}
                  onChange={(e) => setFormData({ ...formData, trn: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder={t("companies.placeholders.trn") || "Tax Registration Number"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("companies.phone") || "Phone"}
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder={t("companies.placeholders.phone") || "+971-4-XXX-XXXX"}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("companies.email") || "Email"}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder={t("companies.placeholders.email") || "info@company.com"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("companies.website") || "Website"}
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder={t("companies.placeholders.website") || "www.company.com"}
                />
              </div>
            </div>

            {/* Module Configuration Section */}
            <div className="border-t border-slate-200 pt-4">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                {t("companies.enabledModules") || "Enabled Modules"}
              </label>
              <p className="text-xs text-slate-500 mb-3">
                {t("companies.enabledModulesDescription") || 
                  "Select which modules this company can access. Leave all unchecked to enable all modules (default)."}
              </p>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="moduleAccess"
                    checked={formData.enabledModules === null}
                    onChange={() => setFormData({ ...formData, enabledModules: null })}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-slate-700">
                    {t("companies.allModules") || "All Modules (Default)"}
                  </span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="moduleAccess"
                    checked={formData.enabledModules !== null}
                    onChange={() => setFormData({ ...formData, enabledModules: [] })}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-slate-700">
                    {t("companies.customModules") || "Custom Selection"}
                  </span>
                </label>
              </div>

              {formData.enabledModules !== null && (
                <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {availableModules.map((module) => (
                    <label key={module.id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Array.isArray(formData.enabledModules) && formData.enabledModules.includes(module.id)}
                        onChange={(e) => {
                          const currentModules = Array.isArray(formData.enabledModules) ? formData.enabledModules : [];
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              enabledModules: [...currentModules, module.id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              enabledModules: currentModules.filter(m => m !== module.id)
                            });
                          }
                        }}
                        className="text-primary focus:ring-primary rounded"
                      />
                      <span className="text-sm text-slate-700">{module.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {formData.enabledModules !== null && Array.isArray(formData.enabledModules) && formData.enabledModules.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-800">
                    <strong>{t("companies.selectedModules") || "Selected:"}</strong>{" "}
                    {formData.enabledModules.map(id => {
                      const module = availableModules.find(m => m.id === id);
                      return module ? module.label : id;
                    }).join(", ")}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {t("common.cancel") || "Cancel"}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
              >
                {saving 
                  ? (t("common.saving") || "Saving...")
                  : (editingCompany 
                      ? (t("companies.updateCompany") || "Update Company")
                      : (t("companies.createCompany") || "Create Company")
                    )
                }
              </button>
            </div>
          </form>
        </div>
      )}

      {companies.length === 0 ? (
        <EmptyState
          title={t("companies.noCompanies") || "No Companies"}
          description={t("companies.noCompaniesDescription") || "Add your first company to get started"}
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    {t("companies.companyId") || "ID"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    {t("companies.companyName") || "Company Name"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    {t("companies.shopName") || "Shop Name"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    {t("companies.emailDomain") || "Email Domain"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    {t("companies.email") || "Email"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    {t("companies.enabledModules") || "Modules"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    {t("companies.createdAt") || "Created"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    {t("common.actions") || "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {companies.map((company) => (
                  <tr key={company.companyId} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {company.companyId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {company.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {company.shopName || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {company.emailDomains && company.emailDomains.length > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {company.emailDomains.join(", ")}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {company.email || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {company.enabledModules === null || company.enabledModules === undefined ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {t("companies.allModules") || "All Modules"}
                        </span>
                      ) : Array.isArray(company.enabledModules) && company.enabledModules.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {company.enabledModules.slice(0, 3).map((moduleId) => {
                            const module = availableModules.find(m => m.id === moduleId);
                            return (
                              <span key={moduleId} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {module ? module.label : moduleId}
                              </span>
                            );
                          })}
                          {company.enabledModules.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                              +{company.enabledModules.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {t("companies.noModules") || "No Modules"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {dayjs(company.createdAt).format("MMM DD, YYYY")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleEdit(company)}
                          className="text-primary hover:text-primary-dark font-medium transition"
                          title={t("companies.editCompany") || "Edit Company"}
                        >
                          {t("common.edit") || "Edit"}
                        </button>
                        {company.companyId !== 1 && (
                          <button
                            onClick={() => handleDelete(company)}
                            disabled={deleting && deletingCompanyId === company.companyId}
                            className="text-red-600 hover:text-red-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t("companies.deleteCompany") || "Delete Company"}
                          >
                            {deleting && deletingCompanyId === company.companyId
                              ? (t("common.deleting") || "Deleting...")
                              : (t("common.delete") || "Delete")
                            }
                          </button>
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

