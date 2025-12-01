import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import dayjs from "dayjs";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import { formatCurrency } from "../utils/formatters";
import useAuth from "../hooks/useAuth";

const createEmptyItem = () => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
  discount: 0
});

const PAYMENT_TERMS_OPTIONS = [
  { value: "7 days", label: "7 Days" },
  { value: "14 days", label: "14 Days" },
  { value: "30 days", label: "30 Days" },
  { value: "60 days", label: "60 Days" },
  { value: "custom", label: "Custom" }
];

export default function InvoicesPage({ language }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("issueDate");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [form, setForm] = useState({
    invoiceNumber: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    issueDate: dayjs().format("YYYY-MM-DD"),
    paymentTerms: "30 days",
    customDays: "",
    language: language || "en",
    currency: "AED",
    notes: "",
    status: "draft",
    items: [createEmptyItem()],
    totalDiscount: 0
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);

  const isAdmin = role === "admin";

  // Calculate due date based on payment terms
  const dueDate = useMemo(() => {
    if (!form.issueDate) return null;
    const issue = dayjs(form.issueDate);
    let days = 30;
    
    if (form.paymentTerms === "custom" && form.customDays) {
      days = parseInt(form.customDays, 10) || 30;
    } else if (form.paymentTerms !== "custom") {
      const match = form.paymentTerms.match(/(\d+)/);
      if (match) days = parseInt(match[1], 10);
    }
    
    return issue.add(days, "day").format("YYYY-MM-DD");
  }, [form.issueDate, form.paymentTerms, form.customDays]);

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = form.items.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0) - (item.discount || 0),
      0
    );
    const discountedSubtotal = Math.max(0, subtotal - (form.totalDiscount || 0));
    const vat = discountedSubtotal * 0.05;
    const grandTotal = discountedSubtotal + vat;
    
    return {
      subtotal,
      totalDiscount: form.totalDiscount || 0,
      discountedSubtotal,
      vat,
      grandTotal
    };
  }, [form.items, form.totalDiscount]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        sortBy,
        sortOrder
      });
      
      if (searchTerm) params.append("customer", searchTerm);
      if (statusFilter) params.append("status", statusFilter);

      const { data } = await apiClient.get(`/invoices?${params.toString()}`);
      setInvoices(data.invoices || data || []);
      setTotalInvoices(data.total || (Array.isArray(data) ? data.length : 0));
    } catch (err) {
      console.error("Error loading invoices:", err);
      setError(err?.response?.data?.message || "Failed to load invoices");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [currentPage, searchTerm, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, language }));
  }, [language]);

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const items = prev.items.map((item, idx) => {
        if (idx === index) {
          if (field === "description") {
            return { ...item, [field]: value };
          }
          return { ...item, [field]: Number(value) || 0 };
        }
        return item;
      });
      return { ...prev, items };
    });
  };

  const handleAddItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, createEmptyItem()] }));
  };

  const handleRemoveItem = (index) => {
    if (form.items.length > 1) {
      setForm((prev) => ({
        ...prev,
        items: prev.items.filter((_, idx) => idx !== index)
      }));
    }
  };

  const resetForm = () => {
    setForm({
      invoiceNumber: "",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      issueDate: dayjs().format("YYYY-MM-DD"),
      paymentTerms: "30 days",
      customDays: "",
      language: language || "en",
      currency: "AED",
      notes: "",
      status: "draft",
      items: [createEmptyItem()],
      totalDiscount: 0
    });
    setEditingInvoice(null);
    setShowForm(false);
    setError(null);
  };

  const handleEdit = (invoice) => {
    setEditingInvoice(invoice);
    setForm({
      invoiceNumber: invoice.invoiceNumber || "",
      customerName: invoice.customerName || "",
      customerEmail: invoice.customerEmail || "",
      customerPhone: invoice.customerPhone || "",
      issueDate: invoice.issueDate ? dayjs(invoice.issueDate).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
      paymentTerms: invoice.paymentTerms || "30 days",
      customDays: "",
      language: invoice.language || language || "en",
      currency: invoice.currency || "AED",
      notes: invoice.notes || "",
      status: invoice.status || "draft",
      items: invoice.items && invoice.items.length > 0 ? invoice.items : [createEmptyItem()],
      totalDiscount: invoice.totalDiscount || 0
    });
    setShowForm(true);
  };

  const handleView = async (invoice) => {
    try {
      const { data } = await apiClient.get(`/invoices/${invoice.id || invoice._id}`);
      setViewingInvoice(data);
    } catch (err) {
      console.error("Error loading invoice:", err);
      alert("Failed to load invoice details");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin) {
      alert("Only administrators can create invoices");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        issueDate: form.issueDate,
        dueDate: dueDate,
        paymentTerms: form.paymentTerms === "custom" ? `${form.customDays} days` : form.paymentTerms,
        language: form.language,
        currency: form.currency,
        notes: form.notes,
        status: form.status,
        totalDiscount: form.totalDiscount || 0,
        items: form.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          discount: Number(item.discount) || 0
        }))
      };

      if (editingInvoice) {
        const { data } = await apiClient.put(`/invoices/${editingInvoice.id || editingInvoice._id}`, payload);
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === data.id ? data : inv))
        );
      } else {
        const { data } = await apiClient.post("/invoices", payload);
        setInvoices((prev) => [data, ...prev]);
      }

      resetForm();
      await loadInvoices();
    } catch (err) {
      console.error("Invoice save error:", err);
      setError(err?.response?.data?.message || err.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (invoice) => {
    if (!isAdmin) {
      alert("Only administrators can delete invoices");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber || invoice.id}?`)) {
      return;
    }

    try {
      await apiClient.delete(`/invoices/${invoice.id || invoice._id}`);
      await loadInvoices();
    } catch (err) {
      console.error("Error deleting invoice:", err);
      alert(err?.response?.data?.message || "Failed to delete invoice");
    }
  };

  const handleStatusChange = async (invoice, newStatus) => {
    if (!isAdmin) {
      alert("Only administrators can change invoice status");
      return;
    }

    try {
      const { data } = await apiClient.patch(`/invoices/${invoice.id || invoice._id}/status`, {
        status: newStatus
      });
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === data.id ? data : inv))
      );
    } catch (err) {
      console.error("Error updating status:", err);
      alert(err?.response?.data?.message || "Failed to update status");
    }
  };

  const handleDownloadPdf = async (invoice) => {
    try {
      const response = await apiClient.get(`/invoices/${invoice.id || invoice._id}/pdf`, {
        responseType: "blob"
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice-${invoice.invoiceNumber || invoice.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading PDF:", err);
      alert("Failed to download PDF");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      viewed: "bg-purple-100 text-purple-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-yellow-100 text-yellow-800"
    };
    return colors[status] || colors.draft;
  };

  if (loading && invoices.length === 0) {
    return <LoadingState message={t("common.loading")} />;
  }

  return (
    <div className={clsx("space-y-6", language === "ar" && "rtl")}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t("invoices.title")}</h1>
        {isAdmin && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            {showForm ? t("common.cancel") : t("invoices.create")}
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && isAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">
            {editingInvoice ? t("invoices.edit") : t("invoices.create")}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-600">
                  {t("invoices.invoiceNumber")}
                </label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                  value={editingInvoice ? (form.invoiceNumber || "") : "AUTO: INV-YYYY-XXXX"}
                  onChange={(e) => {
                    if (!editingInvoice) return; // Don't allow changes when creating
                    setForm((prev) => ({ ...prev, invoiceNumber: e.target.value }));
                  }}
                  placeholder="AUTO: INV-YYYY-XXXX"
                  disabled={true}
                  readOnly={true}
                  title={editingInvoice ? "Invoice number cannot be changed" : "Invoice number will be auto-generated"}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {editingInvoice ? "Invoice number cannot be changed" : "Will be auto-generated (INV-YYYY-XXXX)"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600">
                  {t("invoices.customerName")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.customerName}
                  onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600">
                  {t("invoices.customerEmail")}
                </label>
                <input
                  type="email"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.customerEmail}
                  onChange={(e) => setForm((prev) => ({ ...prev, customerEmail: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600">
                  {t("invoices.customerPhone")}
                </label>
                <input
                  type="tel"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.customerPhone}
                  onChange={(e) => setForm((prev) => ({ ...prev, customerPhone: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600">
                  {t("invoices.issueDate")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.issueDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, issueDate: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600">
                  {t("invoices.paymentTerms")}
                </label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.paymentTerms}
                  onChange={(e) => setForm((prev) => ({ ...prev, paymentTerms: e.target.value }))}
                >
                  {PAYMENT_TERMS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {form.paymentTerms === "custom" && (
                <div>
                  <label className="block text-sm font-medium text-slate-600">
                    {t("invoices.customDays")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={form.customDays}
                    onChange={(e) => setForm((prev) => ({ ...prev, customDays: e.target.value }))}
                    placeholder="Enter days"
                  />
                </div>
              )}
              {dueDate && (
                <div>
                  <label className="block text-sm font-medium text-slate-600">
                    {t("invoices.dueDate")}
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                    value={dueDate}
                    readOnly
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-600">
                  {t("invoices.language")}
                </label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.language}
                  onChange={(e) => setForm((prev) => ({ ...prev, language: e.target.value }))}
                >
                  <option value="en">{t("common.english")}</option>
                  <option value="ar">{t("common.arabic")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600">
                  {t("invoices.status")}
                </label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="draft">{t("invoices.statusDraft")}</option>
                  <option value="sent">{t("invoices.statusSent")}</option>
                  <option value="paid">{t("invoices.statusPaid")}</option>
                </select>
              </div>
            </div>

            {/* Invoice Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">{t("invoices.addItem")}</h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="rounded-lg border border-primary px-3 py-1 text-sm font-medium text-primary transition hover:bg-primary hover:text-white"
                >
                  + {t("invoices.addItem")}
                </button>
              </div>
              {form.items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-12"
                >
                  <div className="md:col-span-5">
                    <label className="text-xs font-medium text-slate-500">
                      {t("invoices.description")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-slate-500">
                      {t("invoices.quantity")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-slate-500">
                      {t("invoices.unitPrice")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-slate-500">
                      {t("invoices.discount")}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      value={item.discount}
                      onChange={(e) => handleItemChange(idx, "discount", e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50"
                      disabled={form.items.length === 1}
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Discount */}
            <div>
              <label className="block text-sm font-medium text-slate-600">
                {t("invoices.totalDiscount")}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.totalDiscount}
                onChange={(e) => setForm((prev) => ({ ...prev, totalDiscount: Number(e.target.value) || 0 }))}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-600">
                {t("invoices.notes")}
              </label>
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            {/* Totals Summary */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">{t("invoices.subtotal")}</span>
                <span className="font-medium">{formatCurrency(totals.subtotal, language === "ar" ? "ar-AE" : "en-AE")}</span>
              </div>
              {totals.totalDiscount > 0 && (
                <div className="mt-2 flex justify-between">
                  <span className="text-slate-600">{t("invoices.totalDiscount")}</span>
                  <span className="font-medium text-red-600">-{formatCurrency(totals.totalDiscount, language === "ar" ? "ar-AE" : "en-AE")}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between">
                <span className="text-slate-600">{t("invoices.vat")}</span>
                <span className="font-medium">{formatCurrency(totals.vat, language === "ar" ? "ar-AE" : "en-AE")}</span>
              </div>
              <div className="mt-3 flex justify-between border-t border-slate-300 pt-2">
                <span className="text-lg font-bold text-slate-800">{t("invoices.grandTotal")}</span>
                <span className="text-lg font-bold text-slate-800">{formatCurrency(totals.grandTotal, language === "ar" ? "ar-AE" : "en-AE")}</span>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-red-800">
                <strong>Error:</strong> {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
              >
                {saving ? t("common.loading") : editingInvoice ? t("common.save") : t("invoices.save")}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-300 px-6 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <input
              type="text"
              placeholder={t("common.search") + "..."}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">{t("invoices.allStatuses")}</option>
              <option value="draft">{t("invoices.statusDraft")}</option>
              <option value="sent">{t("invoices.statusSent")}</option>
              <option value="viewed">{t("invoices.statusViewed")}</option>
              <option value="paid">{t("invoices.statusPaid")}</option>
              <option value="overdue">{t("invoices.statusOverdue")}</option>
              <option value="cancelled">{t("invoices.statusCancelled")}</option>
            </select>
          </div>
          <div>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="issueDate">{t("invoices.sortByDate")}</option>
              <option value="invoiceNumber">{t("invoices.sortByNumber")}</option>
              <option value="customerName">{t("invoices.sortByCustomer")}</option>
              <option value="total">{t("invoices.sortByTotal")}</option>
            </select>
          </div>
          <div>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="DESC">{t("invoices.sortDesc")}</option>
              <option value="ASC">{t("invoices.sortAsc")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-800">{t("invoices.title")}</h2>
        {invoices.length === 0 ? (
          <EmptyState title={t("invoices.noInvoices")} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">{t("invoices.invoiceNumber")}</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">{t("invoices.customerName")}</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">{t("invoices.issueDate")}</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">{t("invoices.dueDate")}</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">{t("invoices.total")}</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">{t("common.status")}</th>
                    {isAdmin && (
                      <th className="px-4 py-3 text-left font-medium text-slate-500">{t("common.actions")}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id || invoice._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {invoice.invoiceNumber || `#${invoice.id}`}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{invoice.customerName}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {dayjs(invoice.issueDate).format("YYYY-MM-DD")}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {invoice.dueDate ? dayjs(invoice.dueDate).format("YYYY-MM-DD") : "-"}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {formatCurrency(invoice.total, language === "ar" ? "ar-AE" : "en-AE")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(invoice.status)}`}>
                          {t(`invoices.status${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}`)}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleView(invoice)}
                              className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                            >
                              {t("common.view")}
                            </button>
                            <button
                              onClick={() => handleEdit(invoice)}
                              className="rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                            >
                              {t("common.edit")}
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(invoice)}
                              className="rounded bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100"
                            >
                              PDF
                            </button>
                            <select
                              value={invoice.status}
                              onChange={(e) => handleStatusChange(invoice, e.target.value)}
                              className="rounded border border-slate-300 px-2 py-1 text-xs"
                            >
                              <option value="draft">{t("invoices.statusDraft")}</option>
                              <option value="sent">{t("invoices.statusSent")}</option>
                              <option value="viewed">{t("invoices.statusViewed")}</option>
                              <option value="paid">{t("invoices.statusPaid")}</option>
                              <option value="overdue">{t("invoices.statusOverdue")}</option>
                              <option value="cancelled">{t("invoices.statusCancelled")}</option>
                            </select>
                            <button
                              onClick={() => handleDelete(invoice)}
                              className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                            >
                              {t("common.delete")}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalInvoices > 20 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  {t("invoices.showing")} {(currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, totalInvoices)} {t("invoices.of")} {totalInvoices}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
                  >
                    {t("invoices.previous")}
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={currentPage * 20 >= totalInvoices}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
                  >
                    {t("invoices.next")}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* View Invoice Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">{t("invoices.invoiceDetails")}</h2>
              <button
                onClick={() => setViewingInvoice(null)}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">{t("invoices.invoiceNumber")}</p>
                  <p className="font-semibold">{viewingInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">{t("invoices.status")}</p>
                  <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(viewingInvoice.status)}`}>
                    {t(`invoices.status${viewingInvoice.status.charAt(0).toUpperCase() + viewingInvoice.status.slice(1)}`)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-500">{t("invoices.customerName")}</p>
                  <p className="font-semibold">{viewingInvoice.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">{t("invoices.issueDate")}</p>
                  <p className="font-semibold">{dayjs(viewingInvoice.issueDate).format("YYYY-MM-DD")}</p>
                </div>
                {viewingInvoice.dueDate && (
                  <div>
                    <p className="text-sm text-slate-500">{t("invoices.dueDate")}</p>
                    <p className="font-semibold">{dayjs(viewingInvoice.dueDate).format("YYYY-MM-DD")}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-500">{t("invoices.total")}</p>
                  <p className="font-semibold text-lg">{formatCurrency(viewingInvoice.total, language === "ar" ? "ar-AE" : "en-AE")}</p>
                </div>
              </div>
              {viewingInvoice.items && viewingInvoice.items.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">{t("invoices.items")}</h3>
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">{t("invoices.description")}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">{t("invoices.quantity")}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">{t("invoices.unitPrice")}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">{t("invoices.discount")}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">{t("invoices.total")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {viewingInvoice.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2">{item.description}</td>
                          <td className="px-4 py-2">{item.quantity}</td>
                          <td className="px-4 py-2">{formatCurrency(item.unitPrice, language === "ar" ? "ar-AE" : "en-AE")}</td>
                          <td className="px-4 py-2">{formatCurrency(item.discount || 0, language === "ar" ? "ar-AE" : "en-AE")}</td>
                          <td className="px-4 py-2 font-medium">{formatCurrency(item.lineTotal, language === "ar" ? "ar-AE" : "en-AE")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {viewingInvoice.notes && (
                <div>
                  <p className="text-sm text-slate-500">{t("invoices.notes")}</p>
                  <p className="mt-1">{viewingInvoice.notes}</p>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadPdf(viewingInvoice)}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                >
                  {t("invoices.downloadPdf")}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      handleEdit(viewingInvoice);
                      setViewingInvoice(null);
                    }}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {t("common.edit")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
