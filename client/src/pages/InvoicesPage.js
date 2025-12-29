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

// Payment methods will be translated in component using t()
const PAYMENT_METHODS = [
  { value: "cash", labelKey: "invoices.paymentMethods.cash" },
  { value: "bank_transfer", labelKey: "invoices.paymentMethods.bankTransfer" },
  { value: "cheque", labelKey: "invoices.paymentMethods.cheque" },
  { value: "credit_card", labelKey: "invoices.paymentMethods.creditCard" },
  { value: "debit_card", labelKey: "invoices.paymentMethods.debitCard" },
  { value: "online", labelKey: "invoices.paymentMethods.online" },
  { value: "other", labelKey: "invoices.paymentMethods.other" }
];

const createEmptyItem = () => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
  discount: 0,
  vatType: "standard" // standard, zero, exempt
});

// Payment terms will be translated in component using t()
const PAYMENT_TERMS_OPTIONS = [
  { value: "7 days", labelKey: "invoices.paymentTermsOptions.7days" },
  { value: "14 days", labelKey: "invoices.paymentTermsOptions.14days" },
  { value: "30 days", labelKey: "invoices.paymentTermsOptions.30days" },
  { value: "60 days", labelKey: "invoices.paymentTermsOptions.60days" },
  { value: "custom", labelKey: "invoices.paymentTermsOptions.custom" }
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
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
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
    totalDiscount: 0,
    vatType: "standard", // Invoice-level VAT type
    supplierTRN: "",
    customerTRN: ""
  });
  const [vatBreakdown, setVatBreakdown] = useState(null);
  const [loadingVatPreview, setLoadingVatPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [invoicePayments, setInvoicePayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: dayjs().format("YYYY-MM-DD"),
    paymentAmount: "",
    paymentMethod: "bank_transfer",
    currency: "AED",
    referenceNumber: "",
    transactionId: "",
    bankName: "",
    bankAccount: "",
    notes: ""
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  const isAdmin = role === "admin";

  // Debug: Log when vatBreakdown changes
  useEffect(() => {
    console.log('[Invoice] vatBreakdown state changed:', vatBreakdown);
  }, [vatBreakdown]);

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

  // Calculate totals - use VAT breakdown if available, otherwise calculate locally
  const totals = useMemo(() => {
    if (vatBreakdown) {
      return {
        subtotal: vatBreakdown.subtotal || 0,
        totalDiscount: vatBreakdown.discountTotal || form.totalDiscount || 0,
        discountedSubtotal: (vatBreakdown.taxableSubtotal || 0) + (vatBreakdown.zeroRatedSubtotal || 0) + (vatBreakdown.exemptSubtotal || 0) - (vatBreakdown.discountTotal || 0),
        vat: vatBreakdown.vatAmount || 0,
        grandTotal: vatBreakdown.totalWithVAT || 0,
        taxableSubtotal: vatBreakdown.taxableSubtotal || 0,
        zeroRatedSubtotal: vatBreakdown.zeroRatedSubtotal || 0,
        exemptSubtotal: vatBreakdown.exemptSubtotal || 0
      };
    }
    
    // Fallback calculation
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
  }, [form.items, form.totalDiscount, vatBreakdown]);

  // Compute VAT preview
  const handlePreviewVat = async () => {
    // Validate that there are items with valid data
    const validItems = form.items.filter(
      item => item.description && (Number(item.quantity) || 0) > 0 && (Number(item.unitPrice) || 0) > 0
    );
    
    if (validItems.length === 0) {
      alert(t("invoices.addItemBeforeVat"));
      return;
    }
    
    setLoadingVatPreview(true);
    setError(null);
    try {
      console.log('[Invoice] Computing VAT with payload:', {
        vatType: form.vatType,
        supplierTRN: form.supplierTRN,
        customerTRN: form.customerTRN,
        totalDiscount: form.totalDiscount,
        itemsCount: validItems.length
      });
      
      const response = await apiClient.post("/vat/compute", {
        vatType: form.vatType,
        supplierTRN: form.supplierTRN,
        customerTRN: form.customerTRN,
        totalDiscount: form.totalDiscount || 0,
        items: validItems.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          discount: Number(item.discount) || 0,
          vatType: item.vatType || form.vatType
        }))
      });
      
      const data = response.data;
      console.log('[Invoice] VAT computed successfully:', data);
      console.log('[Invoice] Full response data:', JSON.stringify(data, null, 2));
      
      // Ensure we have all required fields with defaults
      const breakdownData = {
        taxableSubtotal: data.taxableSubtotal || 0,
        zeroRatedSubtotal: data.zeroRatedSubtotal || 0,
        exemptSubtotal: data.exemptSubtotal || 0,
        vatAmount: data.vatAmount || 0,
        totalWithVAT: data.totalWithVAT || 0,
        subtotal: data.subtotal || 0,
        discountTotal: data.discountTotal || 0,
        vatType: data.vatType || form.vatType
      };
      
      console.log('[Invoice] Setting vatBreakdown state with:', breakdownData);
      
      setVatBreakdown(breakdownData);
      setError(null);
      
      // Scroll to breakdown section after state update
      setTimeout(() => {
        const breakdownElement = document.querySelector('[data-vat-breakdown]');
        if (breakdownElement) {
          breakdownElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        console.log('[Invoice] VAT breakdown state updated. Current vatBreakdown:', breakdownData);
      }, 300);
    } catch (err) {
      console.error("Error computing VAT:", err);
      console.error("Error response:", err?.response);
      const errorMessage = err?.response?.data?.message || err?.message || t("invoices.failedToComputeVat");
      setError(errorMessage);
      setVatBreakdown(null);
      alert(`${t("common.error")}: ${errorMessage}`);
    } finally {
      setLoadingVatPreview(false);
    }
  };

  const loadInvoices = async (skipIfUpdating = true) => {
    // Skip reload if we're in the middle of updating a status
    if (skipIfUpdating && isUpdatingStatus) {
      console.log("[Invoice] Skipping reload - status update in progress");
      return;
    }
    
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
      const invoicesList = data.invoices || data || [];
      
      // Log the statuses of all invoices to debug - expand the array
      const statusSummary = invoicesList.map(inv => ({
        id: inv.id || inv._id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status
      }));
      console.log("[Invoice] Loaded invoices from server:", statusSummary);
      console.log("[Invoice] Full invoice list:", JSON.stringify(statusSummary, null, 2));
      
      // Specifically check invoice 18
      const invoice18 = invoicesList.find(inv => (inv.id || inv._id) === 18);
      if (invoice18) {
        console.log("[Invoice] 🔍 Invoice 18 status from server:", invoice18.status);
        console.log("[Invoice] 🔍 Invoice 18 full object:", JSON.stringify({
          id: invoice18.id || invoice18._id,
          invoiceNumber: invoice18.invoiceNumber,
          status: invoice18.status,
          dueDate: invoice18.dueDate
        }, null, 2));
      } else {
        console.log("[Invoice] ⚠️ Invoice 18 not found in loaded list");
      }
      
      setInvoices(invoicesList);
      setTotalInvoices(data.total || (Array.isArray(data) ? data.length : 0));
    } catch (err) {
      console.error("Error loading invoices:", err);
      setError(err?.response?.data?.message || t("invoices.failedToLoad"));
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Skip reload if we're updating a status to prevent overwriting the update
    if (!isUpdatingStatus) {
      loadInvoices();
    }
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
      totalDiscount: 0,
      vatType: "standard",
      supplierTRN: "",
      customerTRN: ""
    });
    setVatBreakdown(null);
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
      items: invoice.items && invoice.items.length > 0 
        ? invoice.items.map(item => ({ ...item, vatType: item.vatType || "standard" }))
        : [createEmptyItem()],
      totalDiscount: invoice.totalDiscount || 0,
      vatType: invoice.vatType || "standard",
      supplierTRN: invoice.supplierTRN || "",
      customerTRN: invoice.customerTRN || ""
    });
    setVatBreakdown(null);
    setShowForm(true);
  };

  // Load payments for a specific invoice
  const loadInvoicePayments = async (invoiceId) => {
    setLoadingPayments(true);
    try {
      const paymentsRes = await apiClient.get(`/payments/invoice/${invoiceId}`);
      setInvoicePayments(paymentsRes.data || []);
    } catch (paymentsErr) {
      console.error("Error loading payments:", paymentsErr);
      setInvoicePayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleView = async (invoice) => {
    try {
      const { data } = await apiClient.get(`/invoices/${invoice.id || invoice._id}`);
      setViewingInvoice(data);
      
      // Load payments for this invoice
      await loadInvoicePayments(invoice.id || invoice._id);
      
      // Pre-fill payment form with outstanding amount
      const outstanding = parseFloat(data.outstandingAmount || data.totalWithVAT || 0);
      setPaymentForm({
        paymentDate: dayjs().format("YYYY-MM-DD"),
        paymentAmount: outstanding > 0 ? outstanding.toFixed(2) : "",
        paymentMethod: "bank_transfer",
        currency: data.currency || "AED",
        referenceNumber: "",
        transactionId: "",
        bankName: "",
        bankAccount: "",
        notes: ""
      });
      setShowPaymentForm(false);
      setPaymentError(null);
    } catch (err) {
      console.error("Error loading invoice:", err);
      alert(t("invoices.failedToLoadDetails"));
    }
  };

  // Handle payment creation from invoice view
  const handleCreatePayment = async (e) => {
    e.preventDefault();
    if (!viewingInvoice) return;

    setSavingPayment(true);
    setPaymentError(null);

    try {
      if (!paymentForm.paymentAmount || parseFloat(paymentForm.paymentAmount) <= 0) {
        throw new Error(t("invoices.paymentAmountRequired"));
      }

      const paymentData = {
        invoiceId: viewingInvoice.id || viewingInvoice._id,
        ...paymentForm,
        paymentAmount: parseFloat(paymentForm.paymentAmount)
      };

      const response = await apiClient.post("/payments", paymentData);
      
      // Reload invoice to get updated balances
      const { data: updatedInvoice } = await apiClient.get(`/invoices/${viewingInvoice.id || viewingInvoice._id}`);
      setViewingInvoice(updatedInvoice);
      
      // Reload payments
      await loadInvoicePayments(viewingInvoice.id || viewingInvoice._id);
      
      // Reset form
      const outstanding = parseFloat(updatedInvoice.outstandingAmount || updatedInvoice.totalWithVAT || 0);
      setPaymentForm({
        paymentDate: dayjs().format("YYYY-MM-DD"),
        paymentAmount: outstanding > 0 ? outstanding.toFixed(2) : "",
        paymentMethod: "bank_transfer",
        currency: updatedInvoice.currency || "AED",
        referenceNumber: "",
        transactionId: "",
        bankName: "",
        bankAccount: "",
        notes: ""
      });
      setShowPaymentForm(false);
      
      alert(t("invoices.paymentRecorded"));
    } catch (err) {
      console.error("Failed to create payment:", err);
      setPaymentError(err.response?.data?.message || err.message || t("invoices.failedToCreatePayment"));
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin) {
      alert(t("invoices.onlyAdminCreate"));
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
        vatType: form.vatType,
        supplierTRN: form.supplierTRN,
        customerTRN: form.customerTRN,
        items: form.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          discount: Number(item.discount) || 0,
          vatType: item.vatType || form.vatType
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
      setError(err?.response?.data?.message || err.message || t("invoices.failedToSave"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (invoice) => {
    if (!isAdmin) {
      alert(t("invoices.onlyAdminDelete"));
      return;
    }

    if (!window.confirm(t("invoices.deleteConfirm", { invoiceNumber: invoice.invoiceNumber || invoice.id }))) {
      return;
    }

    try {
      await apiClient.delete(`/invoices/${invoice.id || invoice._id}`);
      await loadInvoices();
    } catch (err) {
      console.error("Error deleting invoice:", err);
      alert(err?.response?.data?.message || t("invoices.failedToDelete"));
    }
  };

  const handleStatusChange = async (invoice, newStatus) => {
    if (!isAdmin) {
      alert(t("invoices.onlyAdminChangeStatus"));
      return;
    }

    const invoiceId = invoice.id || invoice._id;
    if (!invoiceId) {
      alert(t("invoices.invalidInvoiceId"));
      return;
    }

    const oldStatus = invoice.status;
    setIsUpdatingStatus(true);

    // Optimistically update the UI immediately
    setInvoices((prev) =>
      prev.map((inv) => {
        const invId = inv.id || inv._id;
        if (invId === invoiceId) {
          console.log("[Invoice] Optimistic update:", invId, oldStatus, "->", newStatus);
          return { ...inv, status: newStatus };
        }
        return inv;
      })
    );

    try {
      console.log("[Invoice] Updating status:", { invoiceId, oldStatus, newStatus });
      const { data } = await apiClient.patch(`/invoices/${invoiceId}/status`, {
        status: newStatus
      });
      
      console.log("[Invoice] Status update response:", data);
      console.log("[Invoice] Response data ID:", data?.id, "Type:", typeof data?.id);
      
      // Update with the response from server - ensure we use the correct ID format
      // Create a completely new array to force React to detect the change
      setInvoices((prev) => {
        const responseId = data?.id || data?._id;
        const responseStatus = data?.status || newStatus;
        
        console.log("[Invoice] Matching invoice:", {
          invoiceId,
          responseId,
          responseStatus,
          invoiceIds: prev.map(inv => inv.id || inv._id)
        });
        
        // Create a new array with updated invoice
        const updated = prev.map((inv) => {
          const invId = inv.id || inv._id;
          
          // Match by ID - handle both number and string comparisons
          const idsMatch = 
            invId === invoiceId || 
            invId === responseId ||
            String(invId) === String(invoiceId) ||
            String(invId) === String(responseId) ||
            Number(invId) === Number(invoiceId) ||
            Number(invId) === Number(responseId);
          
          if (idsMatch) {
            console.log("[Invoice] ✓ Matched invoice:", invId, "Updating status to:", responseStatus);
            // Create a completely new object to force React re-render
            const newInvoice = {
              ...inv,
              ...data,
              status: responseStatus,
              id: responseId || invId,
              _id: responseId || invId
            };
            console.log("[Invoice] New invoice object status:", newInvoice.status);
            return newInvoice;
          }
          // Return existing invoice (new reference to ensure React detects change)
          return { ...inv };
        });
        
        const updatedInvoice = updated.find(inv => {
          const invId = inv.id || inv._id;
          return invId === invoiceId || invId === responseId ||
                 String(invId) === String(invoiceId) || String(invId) === String(responseId);
        });
        
        console.log("[Invoice] Final status check:", {
          invoiceId,
          found: !!updatedInvoice,
          status: updatedInvoice?.status,
          allStatuses: updated.map(inv => ({ id: inv.id || inv._id, status: inv.status }))
        });
        
        // Return new array to force React to detect the change
        return [...updated];
      });
      
      setIsUpdatingStatus(false);
      
      // Don't reload immediately - the state update should be sufficient
      // The optimistic update + server response merge should keep the UI in sync
      // Only reload as a last resort if there's a mismatch
      
    } catch (err) {
      console.error("Error updating status:", err);
      console.error("Error details:", err.response?.data);
      
      setIsUpdatingStatus(false);
      
      // Revert optimistic update on error
      setInvoices((prev) =>
        prev.map((inv) => {
          const invId = inv.id || inv._id;
          if (invId === invoiceId) {
            return { ...inv, status: oldStatus }; // Revert to original status
          }
          return inv;
        })
      );
      
      alert(err?.response?.data?.message || t("invoices.failedToUpdateStatus"));
    }
  };

  const handleDownloadPdf = async (invoice) => {
    try {
      const response = await apiClient.get(`/invoices/${invoice.id || invoice._id}/pdf`, {
        params: { lang: language },
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
      alert(t("invoices.failedToDownloadPdf"));
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
                  placeholder={t("invoices.invoiceNumberAuto")}
                  disabled={true}
                  readOnly={true}
                  title={editingInvoice ? t("invoices.invoiceNumberCannotChange") : t("invoices.invoiceNumberAutoGenerated")}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {editingInvoice ? t("invoices.invoiceNumberCannotChange") : t("invoices.invoiceNumberAutoGenerated")}
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
                      {t(option.labelKey)}
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
                    placeholder={t("invoices.enterDays")}
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

            {/* VAT Information */}
            <div className="rounded-xl border border-slate-200 bg-blue-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">{t("invoices.vatInformation")}</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600">
                    {t("invoices.invoiceVatType")}
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={form.vatType}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, vatType: e.target.value }));
                      setVatBreakdown(null);
                    }}
                  >
                    <option value="standard">{t("invoices.standard")}</option>
                    <option value="zero">{t("invoices.zeroRated")}</option>
                    <option value="exempt">{t("invoices.exempt")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600">
                    {t("invoices.supplierTRN")}
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={form.supplierTRN}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, supplierTRN: e.target.value }));
                      setVatBreakdown(null);
                    }}
                    placeholder={t("invoices.yourCompanyTRN")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600">
                    {t("invoices.customerTRN")}
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={form.customerTRN}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, customerTRN: e.target.value }));
                      setVatBreakdown(null);
                    }}
                    placeholder={t("invoices.customerTRNOptional")}
                  />
                </div>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handlePreviewVat}
                  disabled={loadingVatPreview}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loadingVatPreview ? t("invoices.computing") : t("invoices.previewVat")}
                </button>
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
                      onChange={(e) => {
                        handleItemChange(idx, "discount", e.target.value);
                        setVatBreakdown(null);
                      }}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-slate-500">
                      VAT Type
                    </label>
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      value={item.vatType || form.vatType}
                      onChange={(e) => {
                        handleItemChange(idx, "vatType", e.target.value);
                        setVatBreakdown(null);
                      }}
                    >
                    <option value="standard">{t("invoices.standard")}</option>
                    <option value="zero">{t("invoices.zeroRated")}</option>
                    <option value="exempt">{t("invoices.exempt")}</option>
                    </select>
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
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm" data-vat-breakdown>
              {vatBreakdown && (
                <div className="mb-4 rounded-lg border-2 border-blue-400 bg-blue-50 p-4 shadow-md">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-blue-900">✓ {t("invoices.vatBreakdown")}</span>
                    <button
                      type="button"
                      onClick={() => {
                        console.log('[Invoice] Clearing VAT breakdown');
                        setVatBreakdown(null);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      {t("invoices.clear")}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {totals.taxableSubtotal > 0 ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-700 font-medium">{t("invoices.taxableSubtotal")}</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(totals.taxableSubtotal, language === "ar" ? "ar-AE" : "en-AE")}</span>
                      </div>
                    ) : null}
                    {totals.zeroRatedSubtotal > 0 ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-700 font-medium">{t("invoices.zeroRatedSubtotal")}</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(totals.zeroRatedSubtotal, language === "ar" ? "ar-AE" : "en-AE")}</span>
                      </div>
                    ) : null}
                    {totals.exemptSubtotal > 0 ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-700 font-medium">{t("invoices.exemptSubtotal")}</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(totals.exemptSubtotal, language === "ar" ? "ar-AE" : "en-AE")}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3 pt-2 border-t border-blue-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-700 font-medium">{t("invoices.vatAmount")} (5%)</span>
                      <span className="font-bold text-blue-700">{formatCurrency(totals.vat, language === "ar" ? "ar-AE" : "en-AE")}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-slate-500">
                      <span>{t("invoices.totalWithVAT")}</span>
                      <span className="font-semibold">{formatCurrency(totals.grandTotal, language === "ar" ? "ar-AE" : "en-AE")}</span>
                    </div>
                  </div>
                </div>
              )}
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
                <span className="text-slate-600">{t("invoices.vat")} {vatBreakdown && "(5%)"}</span>
                <span className="font-medium">{formatCurrency(totals.vat, language === "ar" ? "ar-AE" : "en-AE")}</span>
              </div>
              <div className="mt-3 flex justify-between border-t border-slate-300 pt-2">
                <span className="text-lg font-bold text-slate-800">{t("invoices.grandTotal")}</span>
                <span className="text-lg font-bold text-slate-800">{formatCurrency(totals.grandTotal, language === "ar" ? "ar-AE" : "en-AE")}</span>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-red-800">
                <strong>{t("common.error")}:</strong> {error}
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
              placeholder={t("invoices.searchPlaceholder")}
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
                              key={`status-${invoice.id || invoice._id}-${invoice.status || 'draft'}`}
                              value={invoice.status || "draft"}
                              onChange={(e) => {
                                e.preventDefault();
                                handleStatusChange(invoice, e.target.value);
                              }}
                              disabled={!isAdmin}
                              className={`rounded border border-slate-300 px-2 py-1 text-xs ${
                                !isAdmin ? "opacity-50 cursor-not-allowed" : ""
                              }`}
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
                  <p className="font-semibold text-lg">{formatCurrency(viewingInvoice.totalWithVAT || viewingInvoice.total, language === "ar" ? "ar-AE" : "en-AE")}</p>
                </div>
                {viewingInvoice.paidAmount !== undefined && (
                  <div>
                    <p className="text-sm text-slate-500">{t("invoices.paidAmount")}</p>
                    <p className="font-semibold text-green-600">{formatCurrency(viewingInvoice.paidAmount || 0, language === "ar" ? "ar-AE" : "en-AE")}</p>
                  </div>
                )}
                {viewingInvoice.outstandingAmount !== undefined && (
                  <div>
                    <p className="text-sm text-slate-500">{t("invoices.outstanding")}</p>
                    <p className="font-semibold text-orange-600">{formatCurrency(viewingInvoice.outstandingAmount || 0, language === "ar" ? "ar-AE" : "en-AE")}</p>
                  </div>
                )}
              </div>
              
              {/* Payments Section */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{t("invoices.paymentHistory")}</h3>
                  {isAdmin && viewingInvoice.status !== "draft" && (
                    <button
                      onClick={() => setShowPaymentForm(!showPaymentForm)}
                      className="text-sm font-medium text-primary hover:text-primary-dark"
                    >
                      {showPaymentForm ? t("common.cancel") : `+ ${t("invoices.recordPayment")}`}
                    </button>
                  )}
                </div>
                
                {/* Payment Form */}
                {showPaymentForm && (
                  <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <form onSubmit={handleCreatePayment}>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t("invoices.paymentDate")}
                          </label>
                          <input
                            type="date"
                            value={paymentForm.paymentDate}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t("invoices.paymentAmount")} *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={viewingInvoice.outstandingAmount || viewingInvoice.totalWithVAT || 0}
                            value={paymentForm.paymentAmount}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentAmount: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t("invoices.paymentMethod")} *
                          </label>
                          <select
                            value={paymentForm.paymentMethod}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            required
                          >
                            {PAYMENT_METHODS.map(method => (
                              <option key={method.value} value={method.value}>
                                {t(method.labelKey)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t("invoices.referenceNumber")}
                          </label>
                          <input
                            type="text"
                            value={paymentForm.referenceNumber}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            placeholder={t("invoices.optional")}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t("invoices.transactionId")}
                          </label>
                          <input
                            type="text"
                            value={paymentForm.transactionId}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, transactionId: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            placeholder={t("invoices.optional")}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t("invoices.bankName")}
                          </label>
                          <input
                            type="text"
                            value={paymentForm.bankName}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, bankName: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            placeholder={t("invoices.optional")}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t("invoices.bankAccount")}
                          </label>
                          <input
                            type="text"
                            value={paymentForm.bankAccount}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, bankAccount: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            placeholder={t("invoices.optional")}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t("invoices.notes")}
                          </label>
                          <textarea
                            value={paymentForm.notes}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            rows="2"
                            placeholder={t("invoices.optionalNotes")}
                          />
                        </div>
                      </div>
                      {paymentError && (
                        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                          {paymentError}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={savingPayment}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
                        >
                          {savingPayment ? t("invoices.saving") : t("invoices.recordPayment")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPaymentForm(false);
                            setPaymentError(null);
                          }}
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                {loadingPayments ? (
                  <p className="text-sm text-slate-500">{t("invoices.loadingPayments")}</p>
                ) : invoicePayments.length === 0 ? (
                  <p className="text-sm text-slate-500">{t("invoices.noPayments")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">{t("invoices.paymentNumber")}</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">{t("invoices.date")}</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">{t("invoices.paymentAmount")}</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">{t("invoices.method")}</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">{t("common.status")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {invoicePayments.map((payment) => (
                          <tr key={payment.id}>
                            <td className="px-4 py-2 text-sm">{payment.paymentNumber}</td>
                            <td className="px-4 py-2 text-sm">{dayjs(payment.paymentDate).format("DD MMM YYYY")}</td>
                            <td className="px-4 py-2 text-sm font-medium">{formatCurrency(payment.paymentAmount, language === "ar" ? "ar-AE" : "en-AE")}</td>
                            <td className="px-4 py-2 text-sm capitalize">{payment.paymentMethod?.replace("_", " ") || "N/A"}</td>
                            <td className="px-4 py-2">
                              <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                                payment.status === "confirmed" ? "bg-green-100 text-green-800" :
                                payment.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                                "bg-gray-100 text-gray-800"
                              }`}>
                                {payment.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
