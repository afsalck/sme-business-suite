import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import clsx from "clsx";
import useAuth from "../hooks/useAuth";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";

const PERIOD_TYPES = [
  { value: "monthly", label: "Monthly" },
  { value: "bi-weekly", label: "Bi-Weekly" },
  { value: "weekly", label: "Weekly" }
];

const createPeriodForm = () => ({
  periodName: "",
  periodType: "monthly",
  startDate: dayjs().startOf("month").format("YYYY-MM-DD"),
  endDate: dayjs().endOf("month").format("YYYY-MM-DD"),
  payDate: dayjs().add(5, "days").format("YYYY-MM-DD")
});

export default function PayrollPeriodsPage({ language }) {
  const { t } = useTranslation();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(createPeriodForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [processingPeriod, setProcessingPeriod] = useState(null);
  const [showEmployeeSelection, setShowEmployeeSelection] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [processing, setProcessing] = useState(false);

  const isAdmin = role === "admin" || role === "accountant";

  useEffect(() => {
    loadPeriods();
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await apiClient.get("/employees");
      const employeeList = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.employees || []);
      setEmployees(employeeList);
    } catch (err) {
      console.error("Failed to load employees:", err);
    }
  };

  const loadPeriods = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/payroll/periods");
      setPeriods(response.data || []);
    } catch (err) {
      console.error("Failed to load periods:", err);
      setError(err.response?.data?.message || "Failed to load payroll periods");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      console.log('[Payroll Periods] Submitting form:', form);
      const response = await apiClient.post("/payroll/periods", form);
      console.log('[Payroll Periods] Response received:', response.data);
      setPeriods((prev) => [response.data, ...prev]);
      setForm(createPeriodForm());
      setShowForm(false);
      alert("Payroll period created successfully!");
      // Reload periods to ensure we have the latest data
      loadPeriods();
    } catch (err) {
      console.error("[Payroll Periods] Failed to create period:", err);
      console.error("[Payroll Periods] Error response:", err.response?.data);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to create payroll period";
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleProcessPayroll = (period) => {
    setProcessingPeriod(period);
    setShowEmployeeSelection(true);
    setSelectedEmployeeIds([]); // Start with none selected (will process all)
  };

  const handleEmployeeToggle = (employeeId) => {
    setSelectedEmployeeIds(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedEmployeeIds.length === employees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(employees.map(emp => emp.id));
    }
  };

  const handleConfirmProcess = async () => {
    if (!processingPeriod) return;

    setProcessing(true);
    setError(null);

    try {
      const payload = {
        payrollPeriodId: processingPeriod.id,
        employeeIds: selectedEmployeeIds.length > 0 ? selectedEmployeeIds : null // null = process all
      };

      console.log('[Payroll] Processing payroll:', payload);
      const response = await apiClient.post("/payroll/process", payload);
      console.log('[Payroll] Payroll processed:', response.data);

      alert(`Payroll processed successfully! ${response.data.totalEmployees || 0} employees processed.`);
      setShowEmployeeSelection(false);
      setProcessingPeriod(null);
      setSelectedEmployeeIds([]);
      loadPeriods(); // Reload to show updated status
    } catch (err) {
      console.error("[Payroll] Failed to process payroll:", err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to process payroll";
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "locked":
        return "bg-slate-100 text-slate-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading && periods.length === 0) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll Periods</h1>
          <p className="text-sm text-slate-600 mt-1">Create and manage payroll periods</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
          >
            {showForm ? "Cancel" : "+ New Period"}
          </button>
        )}
      </div>

      {/* Create Period Form */}
      {showForm && isAdmin && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Create New Payroll Period</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Period Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.periodName}
                  onChange={(e) => setForm({ ...form, periodName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="e.g., December 2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Period Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.periodType}
                  onChange={(e) => setForm({ ...form, periodType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {PERIOD_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Pay Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.payDate}
                  onChange={(e) => setForm({ ...form, payDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Period"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(createPeriodForm());
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Periods Table */}
      {periods.length === 0 ? (
        <EmptyState message="No payroll periods found" />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Period Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Start Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    End Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Pay Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Status
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {periods.map((period) => (
                  <tr key={period.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {period.periodName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 capitalize">
                      {period.periodType}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {dayjs(period.startDate).format("DD MMM YYYY")}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {dayjs(period.endDate).format("DD MMM YYYY")}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {dayjs(period.payDate).format("DD MMM YYYY")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          "px-2 py-1 text-xs font-medium rounded-full",
                          getStatusColor(period.status)
                        )}
                      >
                        {period.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        {period.status === "draft" && (
                          <button
                            onClick={() => handleProcessPayroll(period)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Process Payroll
                          </button>
                        )}
                        {period.status === "completed" && (
                          <span className="text-xs text-slate-500">Completed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employee Selection Modal */}
      {showEmployeeSelection && processingPeriod && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              Process Payroll: {processingPeriod.periodName}
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Select employees to include in payroll processing. Leave all unchecked to process all employees.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="mb-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {selectedEmployeeIds.length === employees.length ? "Deselect All" : "Select All"}
              </button>
              <span className="ml-4 text-sm text-slate-600">
                {selectedEmployeeIds.length === 0 
                  ? "All employees will be processed" 
                  : `${selectedEmployeeIds.length} employee(s) selected`}
              </span>
            </div>

            <div className="border border-slate-200 rounded-lg max-h-96 overflow-y-auto mb-4">
              {employees.length === 0 ? (
                <div className="p-4 text-center text-slate-500">No employees found</div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {employees.map((employee) => (
                    <label
                      key={employee.id}
                      className="flex items-center p-3 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployeeIds.includes(employee.id)}
                        onChange={() => handleEmployeeToggle(employee.id)}
                        className="mr-3 h-4 w-4 text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">
                          {employee.fullName || employee.name}
                        </div>
                        <div className="text-sm text-slate-500">
                          {employee.designation || employee.position || "Employee"}
                          {employee.basicSalary && ` • Salary: AED ${parseFloat(employee.basicSalary || 0).toFixed(2)}`}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowEmployeeSelection(false);
                  setProcessingPeriod(null);
                  setSelectedEmployeeIds([]);
                  setError(null);
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmProcess}
                disabled={processing}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                {processing ? "Processing..." : "Process Payroll"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

