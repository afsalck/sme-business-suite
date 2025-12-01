import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useAuth from "../hooks/useAuth";
import LoadingState from "../components/LoadingState";

export default function LoginPage({ language }) {
  const { t } = useTranslation();
  const { user, loading, loginWithEmail, loginWithGoogle, error } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // CRITICAL: Show loading during auth initialization
  // This prevents redirect loops
  if (loading) {
    return <LoadingState />;
  }

  // CRITICAL: Only redirect if loading is false and user exists
  // This ensures we don't redirect during auth initialization
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await loginWithEmail(form.email, form.password);
      // Navigation will happen automatically via onAuthStateChanged
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    setFormError(null);
    try {
      await loginWithGoogle();
      // Navigation will happen automatically via onAuthStateChanged
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
      <div className={`w-full max-w-md rounded-2xl bg-white p-8 shadow-lg ${language === "ar" ? "rtl" : ""}`}>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">{t("auth.welcome")}</h1>
          <p className="mt-2 text-sm text-slate-500">{t("auth.loginSubtitle")}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-600">{t("auth.email")}</label>
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">{t("auth.password")}</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              required
            />
          </div>
          {(formError || error) && (
            <p className="text-sm text-red-600">{formError || error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
          >
            {submitting ? t("common.loading") : t("auth.signIn")}
          </button>
        </form>
        <div className="mt-4">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={submitting}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          >
            {t("auth.googleSignIn")}
          </button>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          {t("auth.noAccount")} {t("auth.createAccount")}
        </p>
      </div>
    </div>
  );
}

