import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import useAuth from "../hooks/useAuth";

export default function JournalEntriesPage({ language }) {
  const { t } = useTranslation();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    entryDate: new Date().toISOString().split("T")[0],
    description: "",
    reference: "",
    referenceType: "",
    lines: [{ accountId: "", debitAmount: "", creditAmount: "", description: "" }]
  });
  const [totalDebits, setTotalDebits] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedEntries, setExpandedEntries] = useState(new Set());

  const isAuthorized = role === "admin" || role === "accountant";

  useEffect(() => {
    loadAccounts();
    loadEntries();
  }, [statusFilter]);

  useEffect(() => {
    calculateTotals();
  }, [formData.lines]);

  const loadAccounts = async () => {
    try {
      const { data } = await apiClient.get("/accounting/chart-of-accounts");
      setAccounts(data || []);
    } catch (err) {
      console.error("Error loading accounts:", err);
    }
  };

  const loadEntries = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const { data } = await apiClient.get("/accounting/journal-entries", { params });
      setEntries(data.entries || []);
    } catch (err) {
      console.error("Error loading journal entries:", err);
      setError(err?.response?.data?.message || "Failed to load journal entries");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const debits = formData.lines.reduce(
      (sum, line) => sum + (parseFloat(line.debitAmount) || 0),
      0
    );
    const credits = formData.lines.reduce(
      (sum, line) => sum + (parseFloat(line.creditAmount) || 0),
      0
    );
    setTotalDebits(debits);
    setTotalCredits(credits);
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { accountId: "", debitAmount: "", creditAmount: "", description: "" }]
    });
  };

  const removeLine = (index) => {
    if (formData.lines.length > 2) {
      setFormData({
        ...formData,
        lines: formData.lines.filter((_, i) => i !== index)
      });
    }
  };

  const updateLine = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // If debit is entered, clear credit and vice versa
    if (field === "debitAmount" && value) {
      newLines[index].creditAmount = "";
    } else if (field === "creditAmount" && value) {
      newLines[index].debitAmount = "";
    }
    
    setFormData({ ...formData, lines: newLines });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthorized) return;

    // Validate balance
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      alert(`Journal entry is not balanced. Debits: ${totalDebits.toFixed(2)}, Credits: ${totalCredits.toFixed(2)}`);
      return;
    }

    // Validate at least 2 lines
    if (formData.lines.length < 2) {
      alert("Journal entry must have at least 2 lines");
      return;
    }

    try {
      const payload = {
        ...formData,
        lines: formData.lines.map((line) => ({
          accountId: parseInt(line.accountId),
          debitAmount: parseFloat(line.debitAmount) || 0,
          creditAmount: parseFloat(line.creditAmount) || 0,
          description: line.description || ""
        }))
      };

      await apiClient.post("/accounting/journal-entries", payload);
      setShowForm(false);
      resetForm();
      loadEntries();
    } catch (err) {
      console.error("Error creating journal entry:", err);
      alert(err?.response?.data?.message || "Failed to create journal entry");
    }
  };

  const handlePost = async (entryId) => {
    if (!window.confirm("Are you sure you want to post this journal entry? This action cannot be undone.")) {
      return;
    }

    try {
      await apiClient.post(`/accounting/journal-entries/${entryId}/post`);
      loadEntries();
    } catch (err) {
      console.error("Error posting journal entry:", err);
      alert(err?.response?.data?.message || "Failed to post journal entry");
    }
  };

  const resetForm = () => {
    setFormData({
      entryDate: new Date().toISOString().split("T")[0],
      description: "",
      reference: "",
      referenceType: "",
      lines: [{ accountId: "", debitAmount: "", creditAmount: "", description: "" }]
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: "bg-yellow-100 text-yellow-800",
      posted: "bg-green-100 text-green-800",
      reversed: "bg-red-100 text-red-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Journal Entries</h1>
        {isAuthorized && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
          >
            + New Entry
          </button>
        )}
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => setStatusFilter("")}
          className={`px-4 py-2 rounded-lg transition ${
            statusFilter === ""
              ? "bg-primary text-white"
              : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter("draft")}
          className={`px-4 py-2 rounded-lg transition ${
            statusFilter === "draft"
              ? "bg-primary text-white"
              : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          Draft
        </button>
        <button
          onClick={() => setStatusFilter("posted")}
          className={`px-4 py-2 rounded-lg transition ${
            statusFilter === "posted"
              ? "bg-primary text-white"
              : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          Posted
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
          <h2 className="text-xl font-semibold mb-4">New Journal Entry</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Entry Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.entryDate}
                  onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reference</label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-slate-700">Entry Lines *</label>
                <button
                  type="button"
                  onClick={addLine}
                  className="text-sm text-primary hover:text-primary-dark"
                >
                  + Add Line
                </button>
              </div>
              <div className="space-y-3">
                {formData.lines.map((line, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-slate-50 rounded-lg">
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Account</label>
                      <select
                        required
                        value={line.accountId}
                        onChange={(e) => updateLine(index, "accountId", e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="">Select account</option>
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.accountCode} - {acc.accountName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Debit</label>
                      <input
                        type="number"
                        step="0.01"
                        value={line.debitAmount}
                        onChange={(e) => updateLine(index, "debitAmount", e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Credit</label>
                      <input
                        type="number"
                        step="0.01"
                        value={line.creditAmount}
                        onChange={(e) => updateLine(index, "creditAmount", e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(index, "description", e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-1">
                      {formData.lines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="w-full px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end space-x-4 pt-2 border-t border-slate-200">
                <div className="text-sm">
                  <span className="font-medium">Total Debits: </span>
                  <span className={Math.abs(totalDebits - totalCredits) > 0.01 ? "text-red-600" : "text-green-600"}>
                    {totalDebits.toFixed(2)}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Total Credits: </span>
                  <span className={Math.abs(totalDebits - totalCredits) > 0.01 ? "text-red-600" : "text-green-600"}>
                    {totalCredits.toFixed(2)}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Difference: </span>
                  <span className={Math.abs(totalDebits - totalCredits) > 0.01 ? "text-red-600" : "text-green-600"}>
                    {(totalDebits - totalCredits).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
              >
                Create Entry
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Entry #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Reference
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">
                  Lines
                </th>
                {isAuthorized && (
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {entries.map((entry) => {
                const isExpanded = expandedEntries.has(entry.id);
                return (
                  <>
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-mono text-slate-900">{entry.entryNumber}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {new Date(entry.entryDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">{entry.description}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{entry.reference || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            entry.status
                          )}`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            const newExpanded = new Set(expandedEntries);
                            if (isExpanded) {
                              newExpanded.delete(entry.id);
                            } else {
                              newExpanded.add(entry.id);
                            }
                            setExpandedEntries(newExpanded);
                          }}
                          className="text-primary hover:text-primary-dark text-sm font-medium"
                        >
                          {entry.lines?.length || 0} {isExpanded ? "▼" : "▶"}
                        </button>
                      </td>
                      {isAuthorized && (
                        <td className="px-4 py-3 text-center">
                          {entry.status === "draft" && (
                            <button
                              onClick={() => handlePost(entry.id)}
                              className="text-primary hover:text-primary-dark text-sm font-medium"
                            >
                              Post
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                    {isExpanded && entry.lines && entry.lines.length > 0 && (
                      <tr key={`${entry.id}-details`}>
                        <td colSpan={isAuthorized ? 7 : 6} className="px-4 py-4 bg-slate-50">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-slate-700 mb-2">Journal Entry Lines:</h4>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-300">
                                  <th className="text-left py-2 px-2 text-xs font-semibold text-slate-700">Account</th>
                                  <th className="text-right py-2 px-2 text-xs font-semibold text-slate-700">Debit</th>
                                  <th className="text-right py-2 px-2 text-xs font-semibold text-slate-700">Credit</th>
                                  <th className="text-left py-2 px-2 text-xs font-semibold text-slate-700">Description</th>
                                </tr>
                              </thead>
                              <tbody>
                                {entry.lines.map((line, idx) => (
                                  <tr key={idx} className="border-b border-slate-200">
                                    <td className="py-2 px-2 text-slate-900">
                                      {line.account?.accountCode} - {line.account?.accountName || "N/A"}
                                    </td>
                                    <td className="py-2 px-2 text-right text-slate-900 font-mono">
                                      {line.debitAmount > 0 ? parseFloat(line.debitAmount).toFixed(2) : "-"}
                                    </td>
                                    <td className="py-2 px-2 text-right text-slate-900 font-mono">
                                      {line.creditAmount > 0 ? parseFloat(line.creditAmount).toFixed(2) : "-"}
                                    </td>
                                    <td className="py-2 px-2 text-slate-600 text-xs">{line.description || "-"}</td>
                                  </tr>
                                ))}
                                <tr className="bg-slate-100 font-semibold">
                                  <td className="py-2 px-2 text-slate-900">Total</td>
                                  <td className="py-2 px-2 text-right text-slate-900 font-mono">
                                    {entry.lines.reduce((sum, line) => sum + (parseFloat(line.debitAmount) || 0), 0).toFixed(2)}
                                  </td>
                                  <td className="py-2 px-2 text-right text-slate-900 font-mono">
                                    {entry.lines.reduce((sum, line) => sum + (parseFloat(line.creditAmount) || 0), 0).toFixed(2)}
                                  </td>
                                  <td className="py-2 px-2"></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
        {entries.length === 0 && (
          <div className="p-8 text-center text-slate-500">No journal entries found</div>
        )}
      </div>
    </div>
  );
}

