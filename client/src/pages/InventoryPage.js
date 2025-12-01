import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import clsx from "clsx";
import useAuth from "../hooks/useAuth";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import { formatCurrency } from "../utils/formatters";

const createItemForm = () => ({
  name: "",
  sku: "",
  category: "",
  stock: "",
  costPrice: "",
  salePrice: "",
  supplier: "",
  reorderLevel: ""
});

const createSaleRow = () => ({
  item: "",
  quantity: 1,
  unitPrice: ""
});

const createSaleForm = () => ({
  date: dayjs().format("YYYY-MM-DD"),
  summary: "",
  notes: "",
  items: [createSaleRow()]
});

export default function InventoryPage({ language }) {
  const { t } = useTranslation();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [sales, setSales] = useState([]);
  const [itemForm, setItemForm] = useState(createItemForm);
  const [saleForm, setSaleForm] = useState(createSaleForm);
  const [savingItem, setSavingItem] = useState(false);
  const [savingSale, setSavingSale] = useState(false);
  const [error, setError] = useState(null);
  const [saleError, setSaleError] = useState(null);

  const canManageInventory = role === "admin";

  const loadData = async () => {
    setLoading(true);
    try {
      const [inventoryRes, salesRes] = await Promise.all([
        apiClient.get("/inventory"),
        apiClient.get("/inventory/sales")
      ]);
      setItems(inventoryRes.data);
      setSales(salesRes.data);
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleItemSubmit = async (event) => {
    event.preventDefault();
    if (!canManageInventory) return;
    setSavingItem(true);
    setError(null);
    try {
      const payload = {
        ...itemForm,
        stock: Number(itemForm.stock),
        costPrice: Number(itemForm.costPrice),
        salePrice: Number(itemForm.salePrice),
        reorderLevel: Number(itemForm.reorderLevel) || 0
      };
      const { data } = await apiClient.post("/inventory", payload);
      setItems((prev) => [data, ...prev]);
      setItemForm(createItemForm());
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setSavingItem(false);
    }
  };

  const handleSaleItemChange = (index, key, value) => {
    setSaleForm((prev) => {
      const updated = prev.items.map((row, idx) =>
        idx === index
          ? {
              ...row,
              [key]: key === "item" ? value : Number(value)
            }
          : row
      );
      return { ...prev, items: updated };
    });
  };

  const handleAddSaleRow = () => {
    setSaleForm((prev) => ({
      ...prev,
      items: [...prev.items, createSaleRow()]
    }));
  };

  const handleRemoveSaleRow = (index) => {
    setSaleForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }));
  };

  const selectedSaleItems = useMemo(
    () =>
      saleForm.items.map((saleRow) => {
        const item = items.find((inv) => inv.id === saleRow.item || inv._id === saleRow.item);
        return {
          ...saleRow,
          name: item?.name,
          stock: item?.stock || 0,
          unitPrice: saleRow.unitPrice || item?.salePrice || 0
        };
      }),
    [saleForm.items, items]
  );

  const saleTotals = useMemo(() => {
    const subtotal = selectedSaleItems.reduce(
      (sum, row) => sum + (row.quantity || 0) * (row.unitPrice || 0),
      0
    );
    const vat = subtotal * 0.05;
    const total = subtotal + vat;
    return { subtotal, vat, total };
  }, [selectedSaleItems]);

  const handleSaleSubmit = async (event) => {
    event.preventDefault();
    setSavingSale(true);
    setSaleError(null);
    
    // Validate that at least one item is selected
    const validItems = selectedSaleItems.filter(row => row.item && row.quantity > 0);
    if (validItems.length === 0) {
      setSaleError({ message: "Please select at least one item with quantity > 0" });
      setSavingSale(false);
      return;
    }
    
    try {
      const payload = {
        date: saleForm.date || dayjs().format("YYYY-MM-DD"),
        summary: saleForm.summary || "",
        notes: saleForm.notes || "",
        items: validItems.map((row) => ({
          item: Number(row.item) || row.item, // Ensure item ID is a number for backend
          quantity: Number(row.quantity),
          unitPrice: Number(row.unitPrice)
        }))
      };
      
      console.log("[Sale] Submitting sale:", payload);
      const { data } = await apiClient.post("/inventory/sales", payload);
      console.log("[Sale] Sale created successfully:", data);
      
      setSales((prev) => [data, ...prev]);
      setSaleForm(createSaleForm());
      setSaleError(null);
    } catch (err) {
      console.error("[Sale] Error creating sale:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to save sale";
      setSaleError({ message: errorMessage, original: err });
    } finally {
      setSavingSale(false);
    }
  };

  if (loading) {
    return <LoadingState message={t("common.loading")} />;
  }

  if (error && items.length === 0) {
    return (
      <EmptyState
        title="Failed to load inventory"
        description="Check your API connection."
        action={
          <button
            type="button"
            onClick={loadData}
            className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  return (
    <div className={clsx("space-y-6", language === "ar" && "rtl")}>
      {canManageInventory && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">{t("inventory.addItem")}</h2>
          <form onSubmit={handleItemSubmit} className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-600">
                  {t("inventory.itemName")}
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={itemForm.name}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">SKU</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={itemForm.sku}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, sku: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">{t("inventory.stock")}</label>
                <input
                  type="number"
                  min="0"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={itemForm.stock}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, stock: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">{t("inventory.salePrice")}</label>
                <input
                  type="number"
                  min="0"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={itemForm.salePrice}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, salePrice: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Cost Price</label>
                <input
                  type="number"
                  min="0"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={itemForm.costPrice}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, costPrice: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">{t("inventory.supplier")}</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={itemForm.supplier}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, supplier: e.target.value }))}
                />
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-600">
                {error.response?.data?.message || "Failed to save item"}
              </p>
            )}
            <button
              type="submit"
              disabled={savingItem}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
            >
              {savingItem ? t("common.loading") : t("common.save")}
            </button>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">{t("inventory.title")}</h2>
        {items.length === 0 ? (
          <EmptyState title="No inventory items" />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">
                    {t("inventory.itemName")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">{t("inventory.stock")}</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">
                    {t("inventory.salePrice")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">{t("inventory.supplier")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item) => (
                  <tr key={item.id || item._id}>
                    <td className="px-3 py-3 font-medium text-slate-700">{item.name}</td>
                    <td className="px-3 py-3 text-slate-600">{item.stock}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {formatCurrency(item.salePrice, language === "ar" ? "ar-AE" : "en-AE")}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{item.supplier || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-xl font-semibold text-slate-800">{t("inventory.recordSale")}</h2>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
            <div className="flex justify-between gap-6">
              <span>{t("invoices.subtotal")}:</span>
              <strong>
                {formatCurrency(saleTotals.subtotal, language === "ar" ? "ar-AE" : "en-AE")}
              </strong>
            </div>
            <div className="flex justify-between gap-6">
              <span>{t("invoices.vat")}:</span>
              <strong>
                {formatCurrency(saleTotals.vat, language === "ar" ? "ar-AE" : "en-AE")}
              </strong>
            </div>
            <div className="flex justify-between gap-6">
              <span>{t("invoices.total")}:</span>
              <strong>
                {formatCurrency(saleTotals.total, language === "ar" ? "ar-AE" : "en-AE")}
              </strong>
            </div>
          </div>
        </div>
        <form onSubmit={handleSaleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-600">Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={saleForm.date}
                onChange={(e) => setSaleForm((prev) => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">{t("inventory.summary")}</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={saleForm.summary}
                onChange={(e) => setSaleForm((prev) => ({ ...prev, summary: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">{t("inventory.recordSale")}</label>
            <div className="mt-2 space-y-3">
              {saleForm.items.map((row, idx) => (
                <div
                  key={idx}
                  className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-12"
                >
                  <div className="md:col-span-5">
                    <label className="text-xs font-medium text-slate-500">
                      {t("inventory.itemName")}
                    </label>
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      value={row.item}
                      onChange={(e) => handleSaleItemChange(idx, "item", e.target.value)}
                      required
                    >
                      <option value="">--</option>
                      {items.map((item) => (
                        <option key={item.id || item._id} value={item.id || item._id}>
                          {item.name} (stock: {item.stock})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-slate-500">
                      {t("inventory.stock")}
                    </label>
                    <div className="mt-3 text-sm text-slate-700">
                      {selectedSaleItems[idx]?.stock ?? "—"}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-slate-500">{t("inventory.quantity")}</label>
                    <input
                      type="number"
                      min="1"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      value={row.quantity}
                      onChange={(e) => handleSaleItemChange(idx, "quantity", e.target.value)}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-slate-500">{t("inventory.salePrice")}</label>
                    <input
                      type="number"
                      min="0"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      value={row.unitPrice}
                      onChange={(e) => handleSaleItemChange(idx, "unitPrice", e.target.value)}
                      required
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveSaleRow(idx)}
                      className="w-full rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                      disabled={saleForm.items.length === 1}
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddSaleRow}
                className="rounded-lg border border-primary px-3 py-1 text-sm font-medium text-primary transition hover:bg-primary hover:text-white"
              >
                {t("invoices.addItem")}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">{t("inventory.summary")}</label>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={saleForm.notes}
              onChange={(e) => setSaleForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          {saleError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">
                {saleError.message || saleError.response?.data?.message || "Failed to save sale"}
              </p>
              {process.env.NODE_ENV === 'development' && saleError.original && (
                <p className="mt-1 text-xs text-red-600">
                  {saleError.original.message}
                </p>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={savingSale}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
          >
            {savingSale ? t("common.loading") : t("common.save")}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">{t("inventory.recordSale")}</h2>
        {sales.length === 0 ? (
          <EmptyState title="No sales recorded" />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Date</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">
                    {t("inventory.summary")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">
                    {t("invoices.total")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sales.map((sale) => (
                  <tr key={sale.id || sale._id}>
                    <td className="px-3 py-3 text-slate-600">
                      {dayjs(sale.date).format("YYYY-MM-DD")}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{sale.summary || "—"}</td>
                    <td className="px-3 py-3 text-slate-700">
                      {formatCurrency(sale.totalSales, language === "ar" ? "ar-AE" : "en-AE")}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {sale.items
                        .map((item) => `${item.name} × ${item.quantity}`)
                        .join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

