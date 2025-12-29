import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";

export default function GeneralLedgerPage({ language }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    // Load ledger whenever filters change (including when cleared)
    loadLedger();
  }, [selectedAccountId, fromDate, toDate]);

  const loadAccounts = async () => {
    try {
      const { data } = await apiClient.get("/accounting/chart-of-accounts");
      setAccounts(data || []);
      // After accounts load, load ledger entries by default
      loadLedger();
    } catch (err) {
      console.error("Error loading accounts:", err);
      setLoading(false);
    }
  };

  const loadLedger = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedAccountId) params.accountId = selectedAccountId;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      const { data } = await apiClient.get("/accounting/general-ledger", { params });
      setLedgerEntries(data || []);
    } catch (err) {
      console.error("Error loading general ledger:", err);
      setError(err?.response?.data?.message || "Failed to load general ledger");
      setLedgerEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSelectedAccountId("");
    setFromDate("");
    setToDate("");
    setLedgerEntries([]);
  };

  if (loading && ledgerEntries.length === 0) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">General Ledger</h1>
        {selectedAccountId && (
          <button
            onClick={async () => {
              try {
                const { data } = await apiClient.get(`/accounting/chart-of-accounts/diagnostics?accountId=${selectedAccountId}`);
                console.log('Account Diagnostics:', data);
                alert(
                  `Account: ${data.account.accountCode} - ${data.account.accountName}\n\n` +
                  `Opening Balance: ${data.account.openingBalance.toFixed(2)}\n` +
                  `Current Balance (stored): ${data.account.currentBalance.toFixed(2)}\n` +
                  `Calculated Balance: ${data.account.calculatedBalance.toFixed(2)}\n` +
                  `Entry Count: ${data.entryCount}\n` +
                  `Has Discrepancy: ${data.hasDiscrepancy ? 'YES ⚠️' : 'NO ✓'}\n\n` +
                  `Check browser console for detailed entry breakdown.`
                );
              } catch (err) {
                console.error('Error getting diagnostics:', err);
                alert('Failed to get diagnostics. Check console for details.');
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            title="Get detailed account balance information"
          >
            🔍 Diagnose Account
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Account</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountCode} - {acc.accountName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleClearFilters}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Account
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Reference
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">
                  Debit
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">
                  Credit
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {ledgerEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-900">
                    {new Date(entry.entryDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900">
                    {entry.account?.accountCode} - {entry.account?.accountName}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900">{entry.description || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{entry.reference || "-"}</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-900">
                    {parseFloat(entry.debitAmount || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-900">
                    {parseFloat(entry.creditAmount || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">
                    {parseFloat(entry.runningBalance || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ledgerEntries.length === 0 && !loading && (
          <div className="p-8 text-center text-slate-500">
            {selectedAccountId || fromDate || toDate
              ? "No entries found for the selected filters"
              : "Select an account or date range to view general ledger entries"}
          </div>
        )}
      </div>
    </div>
  );
}

