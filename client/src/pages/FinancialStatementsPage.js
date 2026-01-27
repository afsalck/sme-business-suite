import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import { formatCurrency } from "../utils/formatters";

export default function FinancialStatementsPage({ language }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("trial-balance");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Trial Balance
  const [trialBalance, setTrialBalance] = useState([]);
  const [tbFromDate, setTbFromDate] = useState("");
  const [tbToDate, setTbToDate] = useState("");
  const [exporting, setExporting] = useState(false);

  // Profit & Loss
  const [profitLoss, setProfitLoss] = useState(null);
  const [plFromDate, setPlFromDate] = useState("");
  const [plToDate, setPlToDate] = useState("");

  // Balance Sheet
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [bsAsOfDate, setBsAsOfDate] = useState("");

  useEffect(() => {
    if (activeTab === "trial-balance" && (tbFromDate || tbToDate)) {
      loadTrialBalance();
    } else if (activeTab === "profit-loss" && (plFromDate || plToDate)) {
      loadProfitLoss();
    } else if (activeTab === "balance-sheet" && bsAsOfDate) {
      loadBalanceSheet();
    }
  }, [activeTab, tbFromDate, tbToDate, plFromDate, plToDate, bsAsOfDate]);

  const loadTrialBalance = async () => {
    setLoading(true);
    try {
      const params = {};
      if (tbFromDate) params.fromDate = tbFromDate;
      if (tbToDate) params.toDate = tbToDate;

      const { data } = await apiClient.get("/accounting/trial-balance", { params });
      setTrialBalance(data || []);
    } catch (err) {
      console.error("Error loading trial balance:", err);
      setError(err?.response?.data?.message || "Failed to load trial balance");
    } finally {
      setLoading(false);
    }
  };

  const loadProfitLoss = async () => {
    setLoading(true);
    try {
      const params = {};
      if (plFromDate) params.fromDate = plFromDate;
      if (plToDate) params.toDate = plToDate;

      const { data } = await apiClient.get("/accounting/profit-loss", { params });
      setProfitLoss(data);
    } catch (err) {
      console.error("Error loading profit & loss:", err);
      setError(err?.response?.data?.message || "Failed to load profit & loss statement");
    } finally {
      setLoading(false);
    }
  };

  const loadBalanceSheet = async () => {
    setLoading(true);
    try {
      const params = {};
      if (bsAsOfDate) params.asOfDate = bsAsOfDate;

      const { data } = await apiClient.get("/accounting/balance-sheet", { params });
      setBalanceSheet(data);
    } catch (err) {
      console.error("Error loading balance sheet:", err);
      setError(err?.response?.data?.message || "Failed to load balance sheet");
    } finally {
      setLoading(false);
    }
  };

  const handleExportTrialBalance = async () => {
    if (trialBalance.length === 0) {
      alert("Please generate the trial balance first before exporting");
      return;
    }

    setExporting(true);
    try {
      // Prepare data for export
      const exportData = trialBalance.map(item => ({
        'Account Code': item.accountCode,
        'Account Name': item.accountName,
        'Account Type': item.accountType,
        'Opening Debit': parseFloat(item.openingDebit || 0),
        'Opening Credit': parseFloat(item.openingCredit || 0),
        'Period Debit': parseFloat(item.periodDebits || 0),
        'Period Credit': parseFloat(item.periodCredits || 0),
        'Ending Balance': parseFloat(item.endingBalance || 0)
      }));

      // Calculate totals
      const totals = {
        'Account Code': '',
        'Account Name': 'TOTAL',
        'Account Type': '',
        'Opening Debit': trialBalance.reduce((sum, item) => sum + parseFloat(item.openingDebit || 0), 0),
        'Opening Credit': trialBalance.reduce((sum, item) => sum + parseFloat(item.openingCredit || 0), 0),
        'Period Debit': trialBalance.reduce((sum, item) => sum + parseFloat(item.periodDebits || 0), 0),
        'Period Credit': trialBalance.reduce((sum, item) => sum + parseFloat(item.periodCredits || 0), 0),
        'Ending Balance': 0
      };

      exportData.push(totals);

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      worksheet['!cols'] = [
        { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Trial Balance");

      // Generate filename
      const filename = `Trial_Balance_${tbFromDate || 'all'}_to_${tbToDate || 'all'}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
      
      // Write file
      XLSX.writeFile(workbook, filename);
      
      alert("Trial Balance exported successfully!");
    } catch (err) {
      console.error("Error exporting trial balance:", err);
      alert("Failed to export trial balance. Please make sure xlsx library is installed.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Financial Statements</h1>
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex space-x-1">
          {[
            { id: "trial-balance", label: "Trial Balance" },
            { id: "profit-loss", label: "Profit & Loss" },
            { id: "balance-sheet", label: "Balance Sheet" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {activeTab === "trial-balance" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("common.fromDate")}</label>
                <input
                  type="date"
                  value={tbFromDate}
                  onChange={(e) => setTbFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("common.toDate")}</label>
                <input
                  type="date"
                  value={tbToDate}
                  onChange={(e) => setTbToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadTrialBalance}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {t("common.generate")}
                </button>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleExportTrialBalance}
                  disabled={exporting || trialBalance.length === 0}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {exporting ? t("common.loading") : `📥 ${t("common.export")}`}
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <LoadingState />
          ) : (
            trialBalance.length > 0 && (
              <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                          Account
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">
                          Opening Debit
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">
                          Opening Credit
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">
                          Period Debit
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">
                          Period Credit
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">
                          Ending Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {trialBalance.map((item) => (
                        <tr key={item.accountId} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm">
                            <div className="font-medium text-slate-900">
                              {item.accountCode} - {item.accountName}
                            </div>
                            <div className="text-xs text-slate-500">{item.accountType}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-slate-900">
                            {formatCurrency(item.openingDebit, language === "ar" ? "ar-AE" : "en-AE")}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-slate-900">
                            {formatCurrency(item.openingCredit, language === "ar" ? "ar-AE" : "en-AE")}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-slate-900">
                            {formatCurrency(item.periodDebits, language === "ar" ? "ar-AE" : "en-AE")}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-slate-900">
                            {formatCurrency(item.periodCredits, language === "ar" ? "ar-AE" : "en-AE")}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">
                            {formatCurrency(item.endingBalance, language === "ar" ? "ar-AE" : "en-AE")}
                          </td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      {(() => {
                        const totals = trialBalance.reduce((acc, item) => {
                          acc.openingDebit += parseFloat(item.openingDebit || 0);
                          acc.openingCredit += parseFloat(item.openingCredit || 0);
                          acc.periodDebit += parseFloat(item.periodDebits || 0);
                          acc.periodCredit += parseFloat(item.periodCredits || 0);
                          return acc;
                        }, { openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 0 });
                        const totalDebits = totals.openingDebit + totals.periodDebit;
                        const totalCredits = totals.openingCredit + totals.periodCredit;
                        return (
                          <tr className="bg-slate-100 font-semibold">
                            <td className="px-4 py-3 text-sm text-slate-900">TOTAL</td>
                            <td className="px-4 py-3 text-sm text-right text-slate-900">
                              {formatCurrency(totals.openingDebit, language === "ar" ? "ar-AE" : "en-AE")}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-slate-900">
                              {formatCurrency(totals.openingCredit, language === "ar" ? "ar-AE" : "en-AE")}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-slate-900">
                              {formatCurrency(totals.periodDebit, language === "ar" ? "ar-AE" : "en-AE")}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-slate-900">
                              {formatCurrency(totals.periodCredit, language === "ar" ? "ar-AE" : "en-AE")}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-slate-900">
                              {formatCurrency(0, language === "ar" ? "ar-AE" : "en-AE")}
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
                {/* Balance Check */}
                {(() => {
                  const totals = trialBalance.reduce((acc, item) => {
                    acc.openingDebit += parseFloat(item.openingDebit || 0);
                    acc.openingCredit += parseFloat(item.openingCredit || 0);
                    acc.periodDebit += parseFloat(item.periodDebits || 0);
                    acc.periodCredit += parseFloat(item.periodCredits || 0);
                    return acc;
                  }, { openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 0 });
                  const totalDebits = totals.openingDebit + totals.periodDebit;
                  const totalCredits = totals.openingCredit + totals.periodCredit;
                  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
                  return (
                    <div className={`p-4 border-t border-slate-200 ${isBalanced ? 'bg-green-50' : 'bg-red-50'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">Balance Check:</span>
                        <div className="text-right">
                          <div className="text-sm text-slate-600">
                            Total Debits: {formatCurrency(totalDebits, language === "ar" ? "ar-AE" : "en-AE")}
                          </div>
                          <div className="text-sm text-slate-600">
                            Total Credits: {formatCurrency(totalCredits, language === "ar" ? "ar-AE" : "en-AE")}
                          </div>
                          <div className={`text-sm font-bold mt-1 ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                            {isBalanced ? "✓ Balanced" : "✗ Not Balanced"}
                          </div>
                          {!isBalanced && (
                            <div className="text-xs text-red-600 mt-1">
                              Difference: {formatCurrency(Math.abs(totalDebits - totalCredits), language === "ar" ? "ar-AE" : "en-AE")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )
          )}
        </div>
      )}

      {activeTab === "profit-loss" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={plFromDate}
                  onChange={(e) => setPlFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={plToDate}
                  onChange={(e) => setPlToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadProfitLoss}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <LoadingState />
          ) : (
            profitLoss && (
              <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Profit & Loss Statement</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {profitLoss.period.from} to {profitLoss.period.to}
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Revenue</h3>
                    <div className="space-y-2">
                      {profitLoss.revenues.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between px-4 py-2 bg-slate-50 rounded">
                          <span className="text-sm text-slate-700">{item.accountName}</span>
                          <span className="text-sm font-medium text-slate-900">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between px-4 py-3 border-t-2 border-slate-300 font-semibold">
                        <span>Total Revenue</span>
                        <span>{formatCurrency(profitLoss.revenues.total)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Expenses</h3>
                    <div className="space-y-2">
                      {profitLoss.expenses.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between px-4 py-2 bg-slate-50 rounded">
                          <span className="text-sm text-slate-700">{item.accountName}</span>
                          <span className="text-sm font-medium text-slate-900">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between px-4 py-3 border-t-2 border-slate-300 font-semibold">
                        <span>Total Expenses</span>
                        <span>{formatCurrency(profitLoss.expenses.total)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t-2 border-slate-400">
                    <div className="flex justify-between px-4 py-3 font-bold text-lg">
                      <span>Net Income</span>
                      <span className={profitLoss.netIncome >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(profitLoss.netIncome)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {activeTab === "balance-sheet" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">As Of Date</label>
                <input
                  type="date"
                  value={bsAsOfDate}
                  onChange={(e) => setBsAsOfDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadBalanceSheet}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <LoadingState />
          ) : (
            balanceSheet && (
              <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Balance Sheet</h2>
                  <p className="text-sm text-slate-600 mt-1">As of {balanceSheet.asOfDate}</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Assets</h3>
                    <div className="space-y-2">
                      {balanceSheet.assets.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between px-4 py-2 bg-slate-50 rounded">
                          <span className="text-sm text-slate-700">{item.accountName}</span>
                          <span className="text-sm font-medium text-slate-900">
                            {formatCurrency(item.balance)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between px-4 py-3 border-t-2 border-slate-300 font-semibold">
                        <span>Total Assets</span>
                        <span>{formatCurrency(balanceSheet.assets.total)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Liabilities</h3>
                    <div className="space-y-2">
                      {balanceSheet.liabilities.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between px-4 py-2 bg-slate-50 rounded">
                          <span className="text-sm text-slate-700">{item.accountName}</span>
                          <span className="text-sm font-medium text-slate-900">
                            {formatCurrency(item.balance)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between px-4 py-3 border-t-2 border-slate-300 font-semibold">
                        <span>Total Liabilities</span>
                        <span>{formatCurrency(balanceSheet.liabilities.total)}</span>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-4">Equity</h3>
                    <div className="space-y-2">
                      {balanceSheet.equity.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between px-4 py-2 bg-slate-50 rounded">
                          <span className="text-sm text-slate-700">{item.accountName}</span>
                          <span className="text-sm font-medium text-slate-900">
                            {formatCurrency(item.balance)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between px-4 py-2 bg-slate-50 rounded">
                        <span className="text-sm text-slate-700">Retained Earnings</span>
                        <span className="text-sm font-medium text-slate-900">
                          {formatCurrency(balanceSheet.equity.retainedEarnings)}
                        </span>
                      </div>
                      <div className="flex justify-between px-4 py-3 border-t-2 border-slate-300 font-semibold">
                        <span>Total Equity</span>
                        <span>
                          {formatCurrency(
                            balanceSheet.equity.total + balanceSheet.equity.retainedEarnings
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between px-4 py-3 border-t-2 border-slate-400 mt-4 font-semibold">
                      <span>Total Liabilities & Equity</span>
                      <span>{formatCurrency(balanceSheet.totalLiabilitiesAndEquity)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-slate-50 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Balance Check:</span>
                    <span
                      className={
                        balanceSheet.isBalanced
                          ? "text-green-600 font-semibold"
                          : "text-red-600 font-semibold"
                      }
                    >
                      {balanceSheet.isBalanced ? "✓ Balanced" : "✗ Not Balanced"}
                    </span>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

