import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import useAuth from "../hooks/useAuth";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";

const initialForm = {
  name: "",
  position: "",
  salary: "",
  visaExpiry: "",
  passportExpiry: "",
  notes: ""
};

export default function EmployeesPage({ language }) {
  const { t } = useTranslation();
  const { role } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Allow both admin and staff to manage employees
  const canManage = role === "admin" || role === "staff";

  const loadEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get("/employees");
      setEmployees(Array.isArray(data) ? data : []);
      if (data && !Array.isArray(data) && data.employees) {
        // Handle case where API returns { employees: [] }
        setEmployees(Array.isArray(data.employees) ? data.employees : []);
      }
    } catch (err) {
      console.error("Failed to load employees:", err);
      setError(err);
      // Set empty array on error to show empty state
      setEmployees([]);
      
      // Show user-friendly error message
      if (err.response?.status === 503) {
        setError({ 
          message: "Database connection unavailable. Please check server logs.",
          response: err.response 
        });
      } else if (err.response?.status === 404) {
        setError({ 
          message: "Employee API endpoint not found. Please check server configuration.",
          response: err.response 
        });
      } else if (err.code === "ERR_NETWORK" || err.message?.includes("Network Error")) {
        setError({ 
          message: "Cannot connect to server. Make sure the server is running on port 5004.",
          response: err.response 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canManage) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        salary: Number(form.salary)
      };
      const { data } = await apiClient.post("/employees", payload);
      setEmployees((prev) => [data, ...prev]);
      setForm(initialForm);
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message={t("common.loading")} />;
  }

  return (
    <div className={language === "ar" ? "rtl space-y-6" : "space-y-6"}>
      {/* Debug: Show current role */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm">
          <strong>Debug Info:</strong> Current role: <code>{role || 'loading...'}</code> | Can manage: <code>{canManage ? 'yes' : 'no'}</code>
        </div>
      )}
      {canManage && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">{t("employees.add")}</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-600">{t("employees.name")}</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  {t("employees.position")}
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.position}
                  onChange={(e) => setForm((prev) => ({ ...prev, position: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">{t("employees.salary")}</label>
                <input
                  type="number"
                  min="0"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.salary}
                  onChange={(e) => setForm((prev) => ({ ...prev, salary: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  {t("employees.visaExpiry")}
                </label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.visaExpiry}
                  onChange={(e) => setForm((prev) => ({ ...prev, visaExpiry: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  {t("employees.passportExpiry")}
                </label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.passportExpiry}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, passportExpiry: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">{t("employees.notes")}</label>
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">
                {error.response?.data?.message || "Failed to save employee"}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
            >
              {saving ? t("common.loading") : t("common.save")}
            </button>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">{t("employees.title")}</h2>
        {error && error.message && !error.response?.data?.message && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">
              <strong>Error loading employees:</strong> {error.message}
            </p>
            <button
              onClick={loadEmployees}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}
        {employees.length === 0 && !loading ? (
          <EmptyState title="No employees found" />
        ) : employees.length === 0 ? null : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">
                    {t("employees.name")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">
                    {t("employees.position")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">
                    {t("employees.salary")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">
                    {t("employees.visaExpiry")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">
                    {t("employees.passportExpiry")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">
                    {t("common.status")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {employees.map((employee) => (
                  <tr key={employee._id}>
                    <td className="px-3 py-3 font-medium text-slate-700">{employee.name}</td>
                    <td className="px-3 py-3 text-slate-600">{employee.position}</td>
                    <td className="px-3 py-3 text-slate-600">AED {employee.salary}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {dayjs(employee.visaExpiry).format("YYYY-MM-DD")}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {dayjs(employee.passportExpiry).format("YYYY-MM-DD")}
                    </td>
                    <td className="px-3 py-3">
                      {employee.expiringSoon ? (
                        <StatusBadge tone="warning">{t("employees.expiringSoon")}</StatusBadge>
                      ) : (
                        <StatusBadge tone="success">OK</StatusBadge>
                      )}
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

