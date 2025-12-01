import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import useAuth from "../hooks/useAuth";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import { formatCurrency } from "../utils/formatters";
import dayjs from "dayjs";

const TABS = {
  USERS: "users",
  EMPLOYEES: "employees",
  INVOICES: "invoices",
  EXPENSES: "expenses",
  INVENTORY: "inventory",
  SALES: "sales"
};

export default function AdminManagementPage({ language }) {
  const { t } = useTranslation();
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS.USERS);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});

  // Check if user is admin
  if (role !== "admin") {
    return (
      <div className="flex h-64 items-center justify-center">
        <EmptyState
          title="Access Denied"
          description="You must be an administrator to access this page."
        />
      </div>
    );
  }

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = "";
      switch (activeTab) {
        case TABS.USERS:
          endpoint = "/auth/users";
          break;
        case TABS.EMPLOYEES:
          endpoint = "/employees";
          break;
        case TABS.INVOICES:
          endpoint = "/invoices";
          break;
        case TABS.EXPENSES:
          endpoint = "/expenses";
          break;
        case TABS.INVENTORY:
          endpoint = "/inventory";
          break;
        case TABS.SALES:
          endpoint = "/inventory/sales";
          break;
        default:
          endpoint = "/auth/users";
      }
      const { data: responseData } = await apiClient.get(endpoint);
      setData(Array.isArray(responseData) ? responseData : []);
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err?.response?.data?.message || "Failed to load data");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, uid = null) => {
    if (!window.confirm("Are you sure you want to delete this item?")) {
      return;
    }

    try {
      let endpoint = "";
      if (activeTab === TABS.USERS) {
        endpoint = `/auth/users/${uid}`;
      } else if (activeTab === TABS.EMPLOYEES) {
        endpoint = `/employees/${id}`;
      } else if (activeTab === TABS.INVOICES) {
        endpoint = `/invoices/${id}`;
      } else if (activeTab === TABS.EXPENSES) {
        endpoint = `/expenses/${id}`;
      } else if (activeTab === TABS.INVENTORY) {
        endpoint = `/inventory/${id}`;
      } else if (activeTab === TABS.SALES) {
        endpoint = `/inventory/sales/${id}`;
      } else {
        return;
      }

      await apiClient.delete(endpoint);
      await loadData();
    } catch (err) {
      console.error("Error deleting:", err);
      alert(err?.response?.data?.message || "Failed to delete item");
    }
  };

  const handleUpdateRole = async (uid, newRole) => {
    try {
      await apiClient.patch(`/auth/users/${uid}/role`, { role: newRole });
      await loadData();
    } catch (err) {
      console.error("Error updating role:", err);
      alert(err?.response?.data?.message || "Failed to update role");
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setFormData(item);
  };

  const handleSave = async () => {
    try {
      let endpoint = "";
      if (activeTab === TABS.EMPLOYEES) {
        endpoint = `/employees/${editing.id}`;
        await apiClient.put(endpoint, formData);
      } else if (activeTab === TABS.INVOICES) {
        endpoint = `/invoices/${editing.id}`;
        await apiClient.put(endpoint, formData);
      } else if (activeTab === TABS.EXPENSES) {
        endpoint = `/expenses/${editing.id}`;
        await apiClient.put(endpoint, formData);
      } else if (activeTab === TABS.INVENTORY) {
        endpoint = `/inventory/${editing.id}`;
        await apiClient.put(endpoint, formData);
      }
      setEditing(null);
      setFormData({});
      await loadData();
    } catch (err) {
      console.error("Error updating:", err);
      alert(err?.response?.data?.message || "Failed to update item");
    }
  };

  const renderUsersTable = () => {
    if (loading) return <LoadingState />;
    if (data.length === 0) return <EmptyState title="No users found" />;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Last Login</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {data.map((user) => (
              <tr key={user.uid}>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">{user.email}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">{user.displayName || "-"}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <select
                    value={user.role}
                    onChange={(e) => handleUpdateRole(user.uid, e.target.value)}
                    className="rounded border border-slate-300 px-2 py-1 text-sm"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                  {user.lastLoginAt ? dayjs(user.lastLoginAt).format("YYYY-MM-DD HH:mm") : "Never"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <button
                    onClick={() => handleDelete(user.id, user.uid)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderEmployeesTable = () => {
    if (loading) return <LoadingState />;
    if (data.length === 0) return <EmptyState title="No employees found" />;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Position</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Salary</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Visa Expiry</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {data.map((employee) => (
              <tr key={employee.id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">{employee.name}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">{employee.position || "-"}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">
                  {formatCurrency(employee.salary || 0, language === "ar" ? "ar-AE" : "en-AE")}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                  {employee.visaExpiry ? dayjs(employee.visaExpiry).format("YYYY-MM-DD") : "-"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(employee)}
                      className="rounded bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(employee.id || employee._id)}
                      className="rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderInvoicesTable = () => {
    if (loading) return <LoadingState />;
    if (data.length === 0) return <EmptyState title="No invoices found" />;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {data.map((invoice) => (
              <tr key={invoice.id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">{invoice.customerName}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                  {dayjs(invoice.issueDate).format("YYYY-MM-DD")}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">
                  {formatCurrency(invoice.total || 0, language === "ar" ? "ar-AE" : "en-AE")}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <span className={`rounded-full px-2 py-1 text-xs ${
                    invoice.status === "paid" ? "bg-green-100 text-green-800" :
                    invoice.status === "sent" ? "bg-blue-100 text-blue-800" :
                    "bg-yellow-100 text-yellow-800"
                  }`}>
                    {invoice.status || "draft"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <button
                    onClick={() => handleDelete(invoice.id || invoice._id)}
                    className="rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderExpensesTable = () => {
    if (loading) return <LoadingState />;
    if (data.length === 0) return <EmptyState title="No expenses found" />;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {data.map((expense) => (
              <tr key={expense.id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">{expense.category || "-"}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                  {dayjs(expense.date).format("YYYY-MM-DD")}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">
                  {formatCurrency(expense.amount || 0, language === "ar" ? "ar-AE" : "en-AE")}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{expense.description || "-"}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(expense)}
                      className="rounded bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id || expense._id)}
                      className="rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderInventoryTable = () => {
    if (loading) return <LoadingState />;
    if (data.length === 0) return <EmptyState title="No inventory items found" />;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Sale Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {data.map((item) => {
              const itemId = item.id || item._id;
              return (
                <tr key={itemId}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">{item.name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">{item.stock || 0}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">
                    {formatCurrency(item.salePrice || 0, language === "ar" ? "ar-AE" : "en-AE")}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">{item.supplier || "-"}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="rounded bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(itemId)}
                        className="rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSalesTable = () => {
    if (loading) return <LoadingState />;
    if (data.length === 0) return <EmptyState title="No sales found" />;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Summary</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Total Sales</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">VAT</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Items</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {data.map((sale) => {
              const saleId = sale.id || sale._id;
              return (
                <tr key={saleId}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                    {dayjs(sale.date).format("YYYY-MM-DD HH:mm")}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">{sale.summary || "-"}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">
                    {formatCurrency(sale.totalSales || 0, language === "ar" ? "ar-AE" : "en-AE")}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                    {formatCurrency(sale.totalVAT || 0, language === "ar" ? "ar-AE" : "en-AE")}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                    {Array.isArray(sale.items) ? sale.items.length : 0} items
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <button
                      onClick={() => handleDelete(saleId)}
                      className="rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTable = () => {
    switch (activeTab) {
      case TABS.USERS:
        return renderUsersTable();
      case TABS.EMPLOYEES:
        return renderEmployeesTable();
      case TABS.INVOICES:
        return renderInvoicesTable();
      case TABS.EXPENSES:
        return renderExpensesTable();
      case TABS.INVENTORY:
        return renderInventoryTable();
      case TABS.SALES:
        return renderSalesTable();
      default:
        return <EmptyState title="Select a tab" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t("admin.title")}</h1>
        <button
          onClick={loadData}
          className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-dark"
        >
          {t("common.refresh")}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {Object.values(TABS).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              {t(`admin.tabs.${tab}`)}
            </button>
          ))}
        </nav>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        {renderTable()}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6">
            <h2 className="mb-4 text-xl font-bold">Edit {activeTab.slice(0, -1)}</h2>
            <div className="space-y-4">
              {Object.keys(formData).map((key) => {
                if (key === "id" || key === "createdAt" || key === "updatedAt" || key === "uid") return null;
                return (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-700">{key}</label>
                    <input
                      type="text"
                      value={formData[key] || ""}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditing(null);
                  setFormData({});
                }}
                className="rounded border border-slate-300 px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="rounded bg-primary px-4 py-2 text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

