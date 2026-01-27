import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import { formatCurrency } from "../utils/formatters";
import useAuth from "../hooks/useAuth";

// Expense categories - will be translated in component
const EXPENSE_CATEGORIES = [
  { value: "Office Rent", key: "expenses.categories.officeRent" },
  { value: "Utilities (Electricity, Water, Internet)", key: "expenses.categories.utilities" },
  { value: "Salaries & Wages", key: "expenses.categories.salaries" },
  { value: "Professional Services (Legal, Accounting)", key: "expenses.categories.professionalServices" },
  { value: "Marketing & Advertising", key: "expenses.categories.marketing" },
  { value: "Office Supplies", key: "expenses.categories.officeSupplies" },
  { value: "Equipment & Furniture", key: "expenses.categories.equipment" },
  { value: "Travel & Transportation", key: "expenses.categories.travel" },
  { value: "Insurance", key: "expenses.categories.insurance" },
  { value: "Bank Charges", key: "expenses.categories.bankCharges" },
  { value: "Software & Subscriptions", key: "expenses.categories.software" },
  { value: "Maintenance & Repairs", key: "expenses.categories.maintenance" },
  { value: "Training & Development", key: "expenses.categories.training" },
  { value: "Telecommunications", key: "expenses.categories.telecommunications" },
  { value: "Other", key: "expenses.categories.other" }
];

const PAYMENT_TYPES = [
  { value: "Cash", key: "expenses.paymentTypes.cash" },
  { value: "Bank Transfer", key: "expenses.paymentTypes.bankTransfer" },
  { value: "Credit Card", key: "expenses.paymentTypes.creditCard" },
  { value: "Debit Card", key: "expenses.paymentTypes.debitCard" },
  { value: "Cheque", key: "expenses.paymentTypes.cheque" },
  { value: "Online Payment", key: "expenses.paymentTypes.onlinePayment" },
  { value: "Other", key: "expenses.paymentTypes.other" }
];

const initialForm = {
  category: "",
  date: dayjs().format("YYYY-MM-DD"),
  amount: "",
  description: "",
  supplier: "",
  paymentType: "",
  vatApplicable: false,
  receiptUrl: ""
};

export default function ExpensesPage({ language }) {
  const { t } = useTranslation();
  const { role, uid } = useAuth();
  const canCreate = ["admin", "staff"].includes(role);
  const isAdmin = role === "admin";

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [viewingExpense, setViewingExpense] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  
  // Advanced filters
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    category: "",
    supplier: "",
    vatApplicable: "",
    paymentType: "",
    search: ""
  });

  // Calculate VAT and total amount
  const calculatedAmounts = useMemo(() => {
    const baseAmount = parseFloat(form.amount) || 0;
    const vatAmount = form.vatApplicable ? baseAmount * 0.05 : 0;
    const totalAmount = baseAmount + vatAmount;
    return {
      baseAmount,
      vatAmount: parseFloat(vatAmount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2))
    };
  }, [form.amount, form.vatApplicable]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.from) params.append("from", filters.from);
      if (filters.to) params.append("to", filters.to);
      if (filters.category) params.append("category", filters.category);
      if (filters.supplier) params.append("supplier", filters.supplier);
      if (filters.vatApplicable !== "") params.append("vatApplicable", filters.vatApplicable);
      if (filters.paymentType) params.append("paymentType", filters.paymentType);
      if (filters.search) params.append("search", filters.search);

      const { data } = await apiClient.get(`/expenses?${params.toString()}`);
      setExpenses(data || []);
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.from, filters.to, filters.category, filters.supplier, filters.vatApplicable, filters.paymentType, filters.search]);

  const totals = useMemo(() => {
    const totalAmount = expenses.reduce((sum, expense) => sum + (parseFloat(expense.totalAmount || expense.amount || 0)), 0);
    const totalVAT = expenses.reduce((sum, expense) => sum + (parseFloat(expense.vatAmount || 0)), 0);
    return {
      totalExpenses: totalAmount,
      totalVAT: totalVAT
    };
  }, [expenses]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canCreate) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        amount: calculatedAmounts.baseAmount,
        vatAmount: calculatedAmounts.vatAmount,
        totalAmount: calculatedAmounts.totalAmount
      };
      
      if (editingExpense) {
        const { data } = await apiClient.put(`/expenses/${editingExpense.id}`, payload);
        setExpenses((prev) => prev.map(exp => exp.id === editingExpense.id ? data : exp));
        setEditingExpense(null);
      } else {
        const { data } = await apiClient.post("/expenses", payload);
        setExpenses((prev) => [data, ...prev]);
      }
      setForm(initialForm);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || t("expenses.failedToSave"));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (expense) => {
    // Check permission: Staff can only edit their own expenses
    if (role === "staff" && expense.createdByUid !== uid) {
      alert(t("expenses.onlyEditOwn"));
      return;
    }
    
    setEditingExpense(expense);
    setForm({
      category: expense.category || "",
      date: expense.date ? dayjs(expense.date).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
      amount: expense.amount || "",
      description: expense.description || "",
      supplier: expense.supplier || "",
      paymentType: expense.paymentType || "",
      vatApplicable: expense.vatApplicable || false,
      receiptUrl: expense.receiptUrl || ""
    });
    setShowForm(true);
  };

  const handleDelete = async (expense) => {
    // Check permission: Staff can only delete their own expenses
    if (role === "staff" && expense.createdByUid !== uid) {
      alert(t("expenses.onlyDeleteOwn"));
      return;
    }

    if (!window.confirm(t("expenses.deleteConfirm"))) {
      return;
    }

    try {
      await apiClient.delete(`/expenses/${expense.id}`);
      setExpenses((prev) => prev.filter(exp => exp.id !== expense.id));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || t("expenses.failedToDelete"));
    }
  };

  const handleView = async (expenseId) => {
    try {
      const { data } = await apiClient.get(`/expenses/${expenseId}`);
      setViewingExpense(data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || t("expenses.failedToLoad"));
    }
  };

  const handleBackfillJournalEntries = async () => {
    if (!isAdmin) return;
    
    const confirmMessage = t("expenses.backfillConfirm");
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setBackfilling(true);
    try {
      const { data } = await apiClient.post("/expenses/backfill-journal-entries");
      console.log("[Expense] Backfill completed:", data);
      
      const message = `${t("expenses.backfillCompleted")}\n\n${t("expenses.backfillCreated", { created: data.results.created })}\n${t("expenses.backfillSkipped", { skipped: data.results.skipped })}\n${t("expenses.backfillErrors", { errors: data.results.errors.length })}`;
      if (data.results.errors.length > 0) {
        alert(message + `\n\n${t("expenses.checkConsoleForErrors")}`);
        console.error("[Expense] Backfill errors:", data.results.errors);
      } else {
        alert(message);
      }
    } catch (err) {
      console.error("[Expense] Backfill error:", err);
      const errorMessage = err.response?.data?.message || err.message || t("expenses.backfillFailed");
      alert(`${t("common.error")}: ${errorMessage}`);
    } finally {
      setBackfilling(false);
    }
  };

  const handleReceiptUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      alert(t("expenses.fileTypeError"));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(t("expenses.fileSizeError"));
      return;
    }

    // For now, we'll just store the file name
    // In production, you'd upload to cloud storage (S3, Firebase Storage, etc.)
    const receiptUrl = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, receiptUrl }));
    
    // TODO: Upload to server/cloud storage and get URL
    // For now, we'll use a placeholder
    alert(t("expenses.receiptUploadHint"));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingExpense(null);
    setShowForm(false);
  };

  const canEdit = (expense) => {
    return isAdmin || (role === "staff" && expense.createdByUid === uid);
  };

  const canDelete = (expense) => {
    return isAdmin || (role === "staff" && expense.createdByUid === uid);
  };

  if (loading) {
    return <LoadingState message={t("common.loading")} />;
  }

  return (
    <div className={clsx("space-y-6", language === "ar" && "rtl")}>
      {/* Header with Totals */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-semibold text-slate-800">{t("expenses.title")}</h2>
          <div className="flex gap-4 items-center">
            {isAdmin && expenses.length > 0 && (
              <button
                onClick={handleBackfillJournalEntries}
                disabled={backfilling}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
                title="Create journal entries for all existing expenses that don't have them"
              >
                {backfilling ? t("expenses.processing") : `✓ ${t("expenses.createJournalEntries")}`}
              </button>
            )}
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
              <span className="font-medium">{t("expenses.total")}: </span>
              <span>{formatCurrency(totals.totalExpenses, language === "ar" ? "ar-AE" : "en-AE")}</span>
            </div>
            {totals.totalVAT > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                <span className="font-medium">{t("expenses.totalVAT")}: </span>
                <span>{formatCurrency(totals.totalVAT, language === "ar" ? "ar-AE" : "en-AE")}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">{t("expenses.filters")}</h3>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-600">{t("expenses.fromDate")}</label>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={filters.from}
              onChange={(e) => setFilters(prev => ({ ...prev, from: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">{t("expenses.toDate")}</label>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={filters.to}
              onChange={(e) => setFilters(prev => ({ ...prev, to: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">{t("expenses.category")}</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            >
              <option value="">{t("expenses.allCategories")}</option>
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{t(cat.key)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">{t("expenses.supplier")}</label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={filters.supplier}
              onChange={(e) => setFilters(prev => ({ ...prev, supplier: e.target.value }))}
              placeholder={t("expenses.searchPlaceholder")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">{t("expenses.vatApplicable")}</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={filters.vatApplicable}
              onChange={(e) => setFilters(prev => ({ ...prev, vatApplicable: e.target.value }))}
            >
              <option value="">{t("expenses.all")}</option>
              <option value="true">{t("expenses.yes")}</option>
              <option value="false">{t("expenses.no")}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">{t("expenses.paymentType")}</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={filters.paymentType}
              onChange={(e) => setFilters(prev => ({ ...prev, paymentType: e.target.value }))}
            >
              <option value="">{t("expenses.allTypes")}</option>
              {PAYMENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>{t(type.key)}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-600">{t("common.search")}</label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder={t("expenses.searchPlaceholder")}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setFilters({ from: "", to: "", category: "", supplier: "", vatApplicable: "", paymentType: "", search: "" })}
          className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {t("expenses.clearFilters")}
        </button>
      </div>

      {/* Create/Edit Form */}
      {canCreate && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">
              {editingExpense ? t("expenses.editExpense") : t("expenses.addExpense")}
            </h3>
            {showForm && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
            )}
          </div>
          {(!showForm && !editingExpense) && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
            >
              + {t("expenses.addExpense")}
            </button>
          )}
          {showForm && (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-600">
                    {t("expenses.category")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    required
                  >
                    <option value="">{t("expenses.category")}</option>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{t(cat.key)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600">
                    {t("expenses.date")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={form.date}
                    onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-600">
                    {t("expenses.amount")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={form.amount}
                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600">
                    {t("expenses.supplier")}
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={form.supplier}
                    onChange={(e) => setForm((prev) => ({ ...prev, supplier: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-600">
                    {t("expenses.paymentType")}
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={form.paymentType}
                    onChange={(e) => setForm((prev) => ({ ...prev, paymentType: e.target.value }))}
                  >
                    <option value="">{t("expenses.paymentType")}</option>
                    {PAYMENT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{t(type.key)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600">
                    {t("expenses.uploadReceipt")}
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    onChange={handleReceiptUpload}
                  />
                  {form.receiptUrl && (
                    <p className="mt-1 text-xs text-slate-500">{t("expenses.uploadReceipt")}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600">
                  {t("expenses.description")}
                </label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="vatApplicable"
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={form.vatApplicable}
                    onChange={(e) => setForm((prev) => ({ ...prev, vatApplicable: e.target.checked }))}
                  />
                  <label htmlFor="vatApplicable" className="text-sm font-medium text-slate-700">
                    {t("expenses.vatApplicable")} (5%)
                  </label>
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">{t("expenses.baseAmount")}:</span>
                    <span className="font-medium">{formatCurrency(calculatedAmounts.baseAmount, language === "ar" ? "ar-AE" : "en-AE")}</span>
                  </div>
                  {form.vatApplicable && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t("expenses.vatAmount")} (5%):</span>
                      <span className="font-medium">{formatCurrency(calculatedAmounts.vatAmount, language === "ar" ? "ar-AE" : "en-AE")}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-300 pt-2">
                    <span className="font-semibold text-slate-800">{t("expenses.totalAmount")}:</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(calculatedAmounts.totalAmount, language === "ar" ? "ar-AE" : "en-AE")}</span>
                  </div>
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
                >
                  {saving ? t("common.loading") : (editingExpense ? t("common.save") : t("expenses.addExpense"))}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Expenses List */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">{t("expenses.title")}</h3>
        {expenses.length === 0 ? (
          <EmptyState title="No expenses recorded" />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Category</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Date</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Supplier</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Amount</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">VAT</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Total</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Payment Type</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {expenses.map((expense) => (
                  <tr key={expense.id || expense._id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 font-medium text-slate-700">{expense.category}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {dayjs(expense.date).format("YYYY-MM-DD")}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{expense.supplier || "—"}</td>
                    <td className="px-3 py-3 text-slate-700">
                      {formatCurrency(expense.amount, language === "ar" ? "ar-AE" : "en-AE")}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {expense.vatApplicable ? (
                        <span className="text-green-600">{formatCurrency(expense.vatAmount || 0, language === "ar" ? "ar-AE" : "en-AE")}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-800">
                      {formatCurrency(expense.totalAmount || expense.amount, language === "ar" ? "ar-AE" : "en-AE")}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{expense.paymentType || "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleView(expense.id || expense._id)}
                          className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                        >
                          View
                        </button>
                        {canEdit(expense) && (
                          <button
                            onClick={() => handleEdit(expense)}
                            className="rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-200"
                          >
                            Edit
                          </button>
                        )}
                        {canDelete(expense) && (
                          <button
                            onClick={() => handleDelete(expense)}
                            className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Expense Modal */}
      {viewingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-800">Expense Details</h3>
              <button
                onClick={() => setViewingExpense(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-500">Category</p>
                  <p className="font-semibold">{viewingExpense.category}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-semibold">{dayjs(viewingExpense.date).format("YYYY-MM-DD")}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Supplier</p>
                  <p className="font-semibold">{viewingExpense.supplier || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Payment Type</p>
                  <p className="font-semibold">{viewingExpense.paymentType || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Base Amount</p>
                  <p className="font-semibold">{formatCurrency(viewingExpense.amount, language === "ar" ? "ar-AE" : "en-AE")}</p>
                </div>
                {viewingExpense.vatApplicable && (
                  <div>
                    <p className="text-sm text-slate-500">VAT (5%)</p>
                    <p className="font-semibold text-green-600">{formatCurrency(viewingExpense.vatAmount || 0, language === "ar" ? "ar-AE" : "en-AE")}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-500">Total Amount</p>
                  <p className="font-semibold text-lg">{formatCurrency(viewingExpense.totalAmount || viewingExpense.amount, language === "ar" ? "ar-AE" : "en-AE")}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">VAT Applicable</p>
                  <p className="font-semibold">{viewingExpense.vatApplicable ? "Yes" : "No"}</p>
                </div>
              </div>
              {viewingExpense.description && (
                <div>
                  <p className="text-sm text-slate-500">Description</p>
                  <p className="font-semibold">{viewingExpense.description}</p>
                </div>
              )}
              {viewingExpense.receiptUrl && (
                <div>
                  <p className="text-sm text-slate-500">Receipt</p>
                  <a
                    href={viewingExpense.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View Receipt
                  </a>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
                <div>
                  <p className="text-sm text-slate-500">Created By</p>
                  <p className="font-semibold">{viewingExpense.createdByDisplayName || viewingExpense.createdByEmail || "—"}</p>
                  <p className="text-xs text-slate-400">{dayjs(viewingExpense.createdAt).format("YYYY-MM-DD HH:mm")}</p>
                </div>
                {viewingExpense.updatedByUid && (
                  <div>
                    <p className="text-sm text-slate-500">Last Updated By</p>
                    <p className="font-semibold">{viewingExpense.updatedByDisplayName || viewingExpense.updatedByEmail || "—"}</p>
                    <p className="text-xs text-slate-400">{dayjs(viewingExpense.updatedAt).format("YYYY-MM-DD HH:mm")}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              {canEdit(viewingExpense) && (
                <button
                  onClick={() => {
                    setViewingExpense(null);
                    handleEdit(viewingExpense);
                  }}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => setViewingExpense(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
