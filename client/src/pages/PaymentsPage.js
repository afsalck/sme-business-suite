import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import clsx from "clsx";
import useAuth from "../hooks/useAuth";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import { formatCurrency } from "../utils/formatters";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "online", label: "Online" },
  { value: "other", label: "Other" }
];

const createPaymentForm = () => ({
  invoiceId: "",
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

export default function PaymentsPage({ language }) {
  const { t } = useTranslation();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(createPaymentForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterInvoiceId, setFilterInvoiceId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [summary, setSummary] = useState(null);

  const isAdmin = role === "admin" || role === "accountant";

  // Load payments
  const loadPayments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterInvoiceId) params.invoiceId = filterInvoiceId;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      console.log("[Payments] Loading payments with params:", params);
      const response = await apiClient.get("/payments", { params });
      console.log("[Payments] Response:", response);
      console.log("[Payments] Response data:", response.data);
      console.log("[Payments] Number of payments:", Array.isArray(response.data) ? response.data.length : "Not an array");
      
      const paymentsList = response.data || [];
      setPayments(paymentsList);
      
      if (paymentsList.length === 0) {
        console.log("[Payments] No payments found in response");
      }
    } catch (err) {
      console.error("[Payments] Failed to load payments:", err);
      console.error("[Payments] Error response:", err.response);
      console.error("[Payments] Error data:", err.response?.data);
      setError(err.response?.data?.message || "Failed to load payments");
      setPayments([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Load invoices for dropdown
  const loadInvoices = async () => {
    try {
      const response = await apiClient.get("/invoices", {
        params: { limit: 1000, status: "" } // Get all invoices
      });
      setInvoices(response.data?.invoices || []);
    } catch (err) {
      console.error("Failed to load invoices:", err);
    }
  };

  // Load summary
  const loadSummary = async () => {
    try {
      const params = {};
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      const response = await apiClient.get("/payments/summary", { params });
      setSummary(response.data);
    } catch (err) {
      console.error("Failed to load summary:", err);
    }
  };

  useEffect(() => {
    loadPayments();
    loadInvoices();
    loadSummary();
  }, [filterStatus, filterInvoiceId, fromDate, toDate]);

  // Get invoice details when selected - fetch fresh data from API
  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      if (form.invoiceId) {
        try {
          // Fetch fresh invoice data to get accurate outstanding amount
          const response = await apiClient.get(`/invoices/${form.invoiceId}`);
          const invoice = response.data;
          setSelectedInvoice(invoice);
          if (invoice) {
            const outstanding = parseFloat(invoice.outstandingAmount || invoice.totalWithVAT || 0);
            setForm((prev) => ({
              ...prev,
              paymentAmount: outstanding > 0 ? outstanding.toFixed(2) : ""
            }));
          }
        } catch (err) {
          console.error("Failed to fetch invoice details:", err);
          // Fallback to cached invoice data
          const invoice = invoices.find((inv) => inv.id === parseInt(form.invoiceId));
          setSelectedInvoice(invoice);
          if (invoice) {
            const outstanding = parseFloat(invoice.outstandingAmount || invoice.totalWithVAT || 0);
            setForm((prev) => ({
              ...prev,
              paymentAmount: outstanding > 0 ? outstanding.toFixed(2) : ""
            }));
          }
        }
      } else {
        setSelectedInvoice(null);
      }
    };

    fetchInvoiceDetails();
  }, [form.invoiceId]);

  const handleEdit = (payment) => {
    setForm({
      invoiceId: payment.invoiceId?.toString() || "",
      paymentDate: dayjs(payment.paymentDate).format("YYYY-MM-DD"),
      paymentAmount: payment.paymentAmount?.toString() || "",
      paymentMethod: payment.paymentMethod || "bank_transfer",
      currency: payment.currency || "AED",
      referenceNumber: payment.referenceNumber || "",
      transactionId: payment.transactionId || "",
      bankName: payment.bankName || "",
      bankAccount: payment.bankAccount || "",
      notes: payment.notes || ""
    });
    setEditingPaymentId(payment.id);
    setShowForm(true);
    setSelectedInvoice(payment.invoice || null);
  };

  const handleCancelEdit = () => {
    setForm(createPaymentForm());
    setEditingPaymentId(null);
    setShowForm(false);
    setSelectedInvoice(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!form.invoiceId || !form.paymentAmount) {
        throw new Error("Invoice and payment amount are required");
      }

      let response;
      if (editingPaymentId) {
        // Update existing payment
        response = await apiClient.put(`/payments/${editingPaymentId}`, form);
        setPayments((prev) =>
          prev.map((p) => (p.id === editingPaymentId ? response.data : p))
        );
        alert("Payment updated successfully!");
      } else {
        // Create new payment
        response = await apiClient.post("/payments", form);
        setPayments((prev) => [response.data, ...prev]);
        alert("Payment created successfully!");
      }

      setForm(createPaymentForm());
      setShowForm(false);
      setSelectedInvoice(null);
      setEditingPaymentId(null);
      loadSummary();
      // Reload invoices to get updated outstanding amounts
      loadInvoices();
    } catch (err) {
      console.error(`Failed to ${editingPaymentId ? "update" : "create"} payment:`, err);
      setError(err.response?.data?.message || `Failed to ${editingPaymentId ? "update" : "create"} payment`);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPayment = async (paymentId) => {
    if (!window.confirm("Are you sure you want to confirm this payment? This will create an accounting entry.")) {
      return;
    }

    try {
      await apiClient.post(`/payments/${paymentId}/confirm`);
      loadPayments();
      loadSummary();
      alert("Payment confirmed successfully!");
    } catch (err) {
      console.error("Failed to confirm payment:", err);
      alert(err.response?.data?.message || "Failed to confirm payment");
    }
  };

  const handleStatusChange = async (paymentId, newStatus) => {
    const statusLabels = {
      confirmed: "confirm",
      failed: "mark as failed",
      cancelled: "cancel",
      refunded: "refund"
    };
    
    const action = statusLabels[newStatus] || "update status";
    if (!confirm(`Are you sure you want to ${action} this payment?`)) {
      return;
    }

    try {
      await apiClient.patch(`/payments/${paymentId}/status`, { status: newStatus });
      loadPayments();
      loadSummary();
      // Reload invoices to get updated outstanding amounts
      loadInvoices();
      alert(`Payment status updated to ${newStatus} successfully!`);
    } catch (err) {
      console.error("Failed to update payment status:", err);
      alert(err.response?.data?.message || "Failed to update payment status");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      case "refunded":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentMethodLabel = (method) => {
    return PAYMENT_METHODS.find((m) => m.value === method)?.label || method;
  };

  if (loading && payments.length === 0) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="text-sm text-slate-600 mt-1">Track and manage invoice payments</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              if (showForm) {
                handleCancelEdit();
              } else {
                setShowForm(true);
              }
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
          >
            {showForm ? "Cancel" : "+ New Payment"}
          </button>
        )}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-slate-600">Total Received</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalReceived || 0)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-slate-600">Total Payments</div>
            <div className="text-2xl font-bold text-slate-900">
              {summary.totalPayments || 0}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-slate-600">Pending Amount</div>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(summary.totalPending || 0)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-slate-600">Pending Count</div>
            <div className="text-2xl font-bold text-slate-900">
              {summary.pendingCount || 0}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Invoice</label>
            <select
              value={filterInvoiceId}
              onChange={(e) => setFilterInvoiceId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="">All Invoices</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} - {inv.customerName}
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Create/Edit Payment Form */}
      {showForm && isAdmin && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            {editingPaymentId ? "Edit Payment" : "Create New Payment"}
          </h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Invoice <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.invoiceId}
                  onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Select Invoice</option>
                  {invoices
                    .filter((inv) => {
                      // When editing, show all invoices. When creating, only show invoices with outstanding amounts
                      if (editingPaymentId) return true;
                      const outstanding = parseFloat(inv.outstandingAmount || inv.totalWithVAT || 0);
                      return outstanding > 0.01;
                    })
                    .map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - {inv.customerName} {!editingPaymentId && `(Outstanding: ${formatCurrency(inv.outstandingAmount || inv.totalWithVAT || 0)})`}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.paymentDate}
                  onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.paymentAmount}
                  onChange={(e) => setForm({ ...form, paymentAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="0.00"
                />
                {selectedInvoice && (
                  <p className="text-xs text-slate-500 mt-1">
                    Outstanding: {formatCurrency(selectedInvoice.outstandingAmount || selectedInvoice.totalWithVAT || 0)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={form.referenceNumber}
                  onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Bank reference, cheque number, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Transaction ID
                </label>
                <input
                  type="text"
                  value={form.transactionId}
                  onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Online payment transaction ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Emirates NBD"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bank Account</label>
                <input
                  type="text"
                  value={form.bankAccount}
                  onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Account number"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  rows="3"
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                {saving
                  ? editingPaymentId
                    ? "Updating..."
                    : "Creating..."
                  : editingPaymentId
                  ? "Update Payment"
                  : "Create Payment"}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payments Table */}
      {payments.length === 0 ? (
        <EmptyState message="No payments found" />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Payment #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Invoice
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Outstanding
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Method
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {payment.paymentNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {payment.invoice?.invoiceNumber || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {payment.invoice?.customerName || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {dayjs(payment.paymentDate).format("DD MMM YYYY")}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      {formatCurrency(payment.paymentAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">
                      {payment.invoice?.outstandingAmount !== undefined && payment.invoice?.outstandingAmount !== null
                        ? formatCurrency(payment.invoice.outstandingAmount)
                        : payment.invoice?.totalWithVAT
                        ? formatCurrency(payment.invoice.totalWithVAT)
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {getPaymentMethodLabel(payment.paymentMethod)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          "px-2 py-1 text-xs font-medium rounded-full",
                          getStatusColor(payment.status)
                        )}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleEdit(payment)}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Edit
                            </button>
                            {payment.status === "pending" && (
                              <button
                                onClick={() => handleConfirmPayment(payment.id)}
                                className="text-sm text-green-600 hover:text-green-700 font-medium"
                              >
                                Confirm
                              </button>
                            )}
                            {payment.status !== "failed" && payment.status !== "cancelled" && payment.status !== "refunded" && (
                              <select
                                value={payment.status}
                                onChange={(e) => handleStatusChange(payment.id, e.target.value)}
                                className="text-xs px-2 py-1 border border-slate-300 rounded text-slate-700 bg-white"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value={payment.status} disabled>
                                  Change Status
                                </option>
                                {payment.status !== "confirmed" && (
                                  <option value="confirmed">Mark as Confirmed</option>
                                )}
                                {payment.status !== "failed" && (
                                  <option value="failed">Mark as Failed</option>
                                )}
                                {payment.status !== "cancelled" && (
                                  <option value="cancelled">Cancel</option>
                                )}
                                {payment.status !== "refunded" && (
                                  <option value="refunded">Refund</option>
                                )}
                              </select>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

