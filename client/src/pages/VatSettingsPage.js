import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import useAuth from "../hooks/useAuth";

export default function VatSettingsPage({ language }) {
  const { t } = useTranslation();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState({
    trn: "",
    vatEnabled: false,
    filingFrequency: "monthly",
    filingDay: 28
  });

  const isAuthorized = role === "admin" || role === "accountant";

  useEffect(() => {
    if (!isAuthorized) return;
    loadSettings();
  }, [isAuthorized]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/vat/settings");
      setSettings({
        trn: data.trn || "",
        vatEnabled: Boolean(data.vatEnabled),
        filingFrequency: data.filingFrequency || "monthly",
        filingDay: data.filingDay || 28
      });
    } catch (err) {
      console.error("Error loading VAT settings:", err);
      setError(err?.response?.data?.message || "Failed to load VAT settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthorized) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await apiClient.put("/vat/settings", {
        companyId: 1,
        ...settings
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving VAT settings:", err);
      setError(err?.response?.data?.message || "Failed to save VAT settings");
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-700">Access Denied</p>
          <p className="mt-2 text-sm text-slate-500">
            Only administrators and accountants can access VAT settings.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingState message="Loading VAT settings..." />;
  }

  return (
    <div className={clsx("space-y-6", language === "ar" && "rtl")}>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("navigation.vatSettingsTitle")}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {t("navigation.vatSettingsSubtitle")}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* VAT Enabled Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">
                {t("navigation.enableVat")}
              </label>
              <p className="mt-1 text-xs text-slate-500">
                {t("navigation.enableVatDescription")}
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={settings.vatEnabled}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, vatEnabled: e.target.checked }))
                }
              />
              <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20"></div>
            </label>
          </div>

          {/* TRN */}
          <div>
            <label className="block text-sm font-medium text-slate-600">
              {t("navigation.companyTRN")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={settings.trn}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, trn: e.target.value }))
              }
              placeholder={t("navigation.trnPlaceholder")}
              required={settings.vatEnabled}
              disabled={!settings.vatEnabled}
            />
            <p className="mt-1 text-xs text-slate-500">
              {t("navigation.trnDescription")}
            </p>
          </div>

          {/* Filing Frequency */}
          <div>
            <label className="block text-sm font-medium text-slate-600">
              {t("navigation.filingFrequency")}
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={settings.filingFrequency}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, filingFrequency: e.target.value }))
              }
              disabled={!settings.vatEnabled}
            >
              <option value="monthly">{t("navigation.monthly")}</option>
              <option value="quarterly">{t("navigation.quarterly")}</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              {t("navigation.filingFrequencyDescription")}
            </p>
          </div>

          {/* Filing Day */}
          <div>
            <label className="block text-sm font-medium text-slate-600">
              {t("navigation.filingDayOfMonth")}
            </label>
            <input
              type="number"
              min="1"
              max="28"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={settings.filingDay}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  filingDay: Math.min(28, Math.max(1, parseInt(e.target.value) || 28))
                }))
              }
              disabled={!settings.vatEnabled}
            />
            <p className="mt-1 text-xs text-slate-500">
              {t("navigation.filingDayDescription")}
            </p>
          </div>

          {/* Messages */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-sm text-green-800">
                {t("navigation.savedSuccessfully")}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !settings.vatEnabled}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? t("navigation.saving") : t("navigation.saveSettings")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

