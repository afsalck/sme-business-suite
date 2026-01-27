import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import useAuth from "../hooks/useAuth";

export default function ChartOfAccountsPage({ language }) {
  const { t } = useTranslation();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [recalculating, setRecalculating] = useState(false);
  const [recalculationResult, setRecalculationResult] = useState(null);
  const [formData, setFormData] = useState({
    accountCode: "",
    accountName: "",
    accountType: "Asset",
    parentAccountId: null,
    isActive: true,
    openingBalance: 0,
    description: ""
  });

  const accountTypes = ["Asset", "Liability", "Equity", "Revenue", "Expense"];

  const isAuthorized = role === "admin" || role === "accountant";

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/accounting/chart-of-accounts");
      setAccounts(data || []);
    } catch (err) {
      console.error("Error loading chart of accounts:", err);
      setError(err?.response?.data?.message || "Failed to load chart of accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthorized) return;

    try {
      // Ensure openingBalance is a valid number
      const openingBalanceValue = formData.openingBalance === '' || formData.openingBalance === null || formData.openingBalance === undefined
        ? 0
        : parseFloat(formData.openingBalance);
      
      if (isNaN(openingBalanceValue)) {
        alert('Opening balance must be a valid number');
        return;
      }

      const payload = {
        ...formData,
        parentAccountId: formData.parentAccountId || null,
        openingBalance: openingBalanceValue
      };

      console.log('Submitting account:', payload);

      let response;
      if (editingAccount) {
        response = await apiClient.put(`/accounting/chart-of-accounts/${editingAccount.id}`, payload);
      } else {
        response = await apiClient.post("/accounting/chart-of-accounts", payload);
      }

      // If opening balance was changed, show a message
      if (response.data?.openingBalanceChanged) {
        const shouldRecalculate = window.confirm(
          'Opening balance updated. Would you like to recalculate all account balances now?'
        );
        if (shouldRecalculate) {
          // Automatically trigger recalculation
          handleRecalculateBalances();
        }
      }

      setShowForm(false);
      setEditingAccount(null);
      resetForm();
      loadAccounts();
    } catch (err) {
      console.error("Error saving account:", err);
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || "Failed to save account";
      alert(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      accountCode: "",
      accountName: "",
      accountType: "Asset",
      parentAccountId: null,
      isActive: true,
      openingBalance: 0,
      description: ""
    });
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    // Ensure openingBalance is properly converted - it might come as a string or number
    const openingBalance = account.openingBalance !== null && account.openingBalance !== undefined
      ? parseFloat(account.openingBalance) || 0
      : 0;
    
    setFormData({
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      parentAccountId: account.parentAccountId || null,
      isActive: account.isActive,
      openingBalance: openingBalance,
      description: account.description || ""
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAccount(null);
    resetForm();
  };

  const handleRecalculateBalances = async () => {
    if (!isAuthorized) return;
    
    if (!window.confirm('This will recalculate all account balances from the General Ledger. This may take a moment. Continue?')) {
      return;
    }

    setRecalculating(true);
    setRecalculationResult(null);
    setError(null);

    try {
      const { data } = await apiClient.post('/accounting/chart-of-accounts/recalculate-balances');
      setRecalculationResult(data);
      // Reload accounts to show updated balances
      await loadAccounts();
      
      if (data.discrepancies && data.discrepancies.length > 0) {
        alert(`Recalculation completed!\n\nUpdated ${data.updatedAccounts} accounts.\nFound ${data.discrepancies.length} discrepancies that were corrected.`);
      } else {
        alert(`Recalculation completed!\n\nAll ${data.updatedAccounts} account balances are correct.`);
      }
    } catch (err) {
      console.error('Error recalculating balances:', err);
      setError(err?.response?.data?.message || 'Failed to recalculate balances');
    } finally {
      setRecalculating(false);
    }
  };

  const getAccountTypeColor = (type) => {
    const colors = {
      Asset: "bg-blue-100 text-blue-800",
      Liability: "bg-red-100 text-red-800",
      Equity: "bg-green-100 text-green-800",
      Revenue: "bg-purple-100 text-purple-800",
      Expense: "bg-orange-100 text-orange-800"
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Chart of Accounts</h1>
        <div className="flex gap-3">
          {isAuthorized && (
            <>
              <button
                onClick={handleRecalculateBalances}
                disabled={recalculating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Recalculate all account balances from General Ledger"
              >
                {recalculating ? 'Recalculating...' : '✓ Verify & Recalculate Balances'}
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
              >
                + Add Account
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {recalculationResult && (
        <div className={`p-4 border rounded-lg ${
          recalculationResult.discrepancies && recalculationResult.discrepancies.length > 0
            ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
            : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          <div className="font-semibold mb-2">
            Balance Recalculation Results
          </div>
          <div className="text-sm space-y-1">
            <div>✓ Updated {recalculationResult.updatedAccounts} accounts</div>
            {recalculationResult.discrepancies && recalculationResult.discrepancies.length > 0 && (
              <div className="mt-2">
                <div className="font-semibold">Found {recalculationResult.discrepancies.length} discrepancies (now corrected):</div>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {recalculationResult.discrepancies.slice(0, 5).map((disc, idx) => (
                    <li key={idx}>
                      {disc.accountCode} ({disc.accountName}): Difference of {Math.abs(disc.difference).toFixed(2)}
                    </li>
                  ))}
                  {recalculationResult.discrepancies.length > 5 && (
                    <li>... and {recalculationResult.discrepancies.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
            {recalculationResult.errors && recalculationResult.errors.length > 0 && (
              <div className="mt-2 text-red-600">
                <div className="font-semibold">Errors: {recalculationResult.errors.length}</div>
                <ul className="list-disc list-inside mt-1">
                  {recalculationResult.errors.map((err, idx) => (
                    <li key={idx}>{err.accountCode}: {err.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
          <h2 className="text-xl font-semibold mb-4">
            {editingAccount ? "Edit Account" : "New Account"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Account Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.accountCode}
                  onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Account Type *
                </label>
                <select
                  required
                  value={formData.accountType}
                  onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {accountTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Opening Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.openingBalance !== null && formData.openingBalance !== undefined ? formData.openingBalance : ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : e.target.value;
                    setFormData({ ...formData, openingBalance: value });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0.00"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Starting balance before any transactions. After updating, click "Verify & Recalculate Balances" to update current balances.
                </p>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-slate-700">Active</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
              >
                {editingAccount ? "Update" : "Create"}
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
                  Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Account Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">
                  Opening Balance
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">
                  Current Balance
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">
                  Status
                </th>
                {isAuthorized && (
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-mono text-slate-900">
                    {account.accountCode}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900">{account.accountName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAccountTypeColor(
                        account.accountType
                      )}`}
                    >
                      {account.accountType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-900">
                    {parseFloat(account.openingBalance || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">
                    {parseFloat(account.currentBalance || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {account.isActive ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    )}
                  </td>
                  {isAuthorized && (
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleEdit(account)}
                        className="text-primary hover:text-primary-dark text-sm font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {accounts.length === 0 && (
          <div className="p-8 text-center text-slate-500">No accounts found</div>
        )}
      </div>
    </div>
  );
}

