import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import useCompany from "../hooks/useCompany";
import useAuth from "../hooks/useAuth";
import apiClient from "../services/apiClient";

export default function CompanySettingsPage({ language }) {
  const { t } = useTranslation();
  const { role } = useAuth();
  const { company, loading, error, loadCompany, updateCompany } = useCompany();
  const [form, setForm] = useState({
    name: "",
    shopName: "",
    address: "",
    trn: "",
    email: "",
    phone: "",
    website: ""
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || "",
        shopName: company.shopName || "",
        address: company.address || "",
        trn: company.trn || "",
        email: company.email || "",
        phone: company.phone || "",
        website: company.website || ""
      });
    }
  }, [company]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSuccess(false);

    try {
      await updateCompany(form);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setSaveError(err.message || t("companySettings.failedToSave"));
    } finally {
      setSaving(false);
    }
  };

  if (role !== "admin") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-800">{t("companySettings.accessDenied")}</h2>
        <p className="mt-2 text-sm text-red-600">
          {t("companySettings.onlyAdminAccess")}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-sm text-slate-600">{t("companySettings.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${language === "ar" ? "rtl" : ""}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("companySettings.title")}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {t("companySettings.subtitle")}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-600">{t("companySettings.savedSuccessfully")}</p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                {t("companySettings.companyName")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={t("companySettings.placeholders.companyName")}
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                {t("companySettings.companyNameHelper")}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                {t("companySettings.shopName")}
              </label>
              <input
                type="text"
                value={form.shopName}
                onChange={(e) => setForm((prev) => ({ ...prev, shopName: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={t("companySettings.placeholders.shopName")}
              />
              <p className="mt-1 text-xs text-slate-500">
                {t("companySettings.shopNameHelper")}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">{t("companySettings.address")}</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              rows={3}
              placeholder={t("companySettings.placeholders.address")}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">{t("companySettings.trn")}</label>
              <input
                type="text"
                value={form.trn}
                onChange={(e) => setForm((prev) => ({ ...prev, trn: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={t("companySettings.placeholders.trn")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">{t("companySettings.email")}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={t("companySettings.placeholders.email")}
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">{t("companySettings.phone")}</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={t("companySettings.placeholders.phone")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">{t("companySettings.website")}</label>
              <input
                type="text"
                value={form.website}
                onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={t("companySettings.placeholders.website")}
              />
            </div>
          </div>

          {saveError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-600">{saveError}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={() => loadCompany()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
            >
              {saving ? t("companySettings.saving") : t("companySettings.saveSettings")}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <h3 className="text-sm font-semibold text-blue-900">💡 {t("companySettings.howItWorks")}</h3>
        <ul className="mt-2 space-y-1 text-xs text-blue-800">
          <li>• <strong>{t("companySettings.companyName")}:</strong> {t("companySettings.companyNameUsage")}</li>
          <li>• <strong>{t("companySettings.shopName")}:</strong> {t("companySettings.shopNameUsage")}</li>
          <li>• {t("companySettings.changesTakeEffect")}</li>
        </ul>
      </div>
    </div>
  );
}
