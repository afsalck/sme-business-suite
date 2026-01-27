import { useEffect, useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import useAuth from "../hooks/useAuth";
import useCompany from "../hooks/useCompany";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import { formatCurrency } from "../utils/formatters";

// Shop types will be translated dynamically
const SHOP_TYPES = [
  { value: "cafe", key: "cafe", icon: "☕" },
  { value: "retail", key: "retailStore", icon: "🛍️" },
  { value: "restaurant", key: "restaurant", icon: "🍽️" },
  { value: "grocery", key: "groceryStore", icon: "🛒" },
  { value: "pharmacy", key: "pharmacy", icon: "💊" },
  { value: "electronics", key: "electronics", icon: "📱" },
  { value: "clothing", key: "clothingStore", icon: "👕" },
  { value: "general", key: "generalStore", icon: "🏪" }
];

export default function POSPage({ language }) {
  const { t } = useTranslation();
  const { role } = useAuth();
  const { company } = useCompany();
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [shopType, setShopType] = useState(() => {
    // Get from localStorage or default to 'general'
    try {
      return localStorage.getItem('pos_shop_type') || 'general';
    } catch (e) {
      // localStorage might not be available in some contexts
      return 'general';
    }
  });
  const barcodeInputRef = useRef(null);

  const canManage = role === "admin" || role === "staff";
  
  const currentShopType = SHOP_TYPES.find(st => st.value === shopType) || SHOP_TYPES[SHOP_TYPES.length - 1];
  const currentShopTypeLabel = currentShopType ? t(`pos.${currentShopType.key}`) : t("pos.generalStore");

  useEffect(() => {
    loadItems();
    // Auto-focus barcode input on mount
    const timer = setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/inventory");
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load items:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle barcode scanning - most scanners send Enter after the code
  const handleBarcodeInput = async (e) => {
    const value = e.target.value;
    
    // Update input value immediately
    setBarcodeInput(value);
    
    // Wait for Enter key (scanner sends Enter)
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmedValue = value.trim();
      if (trimmedValue) {
        await searchAndAddItem(trimmedValue);
        setBarcodeInput("");
      }
    }
  };

  const searchAndAddItem = async (barcode) => {
    try {
      // First try exact SKU match
      let item = items.find(i => i.sku === barcode);
      
      // If not found, search via API
      if (!item) {
        try {
          const { data } = await apiClient.get(`/inventory/search?sku=${encodeURIComponent(barcode)}`);
          item = data;
        } catch (apiErr) {
          // Item not found - show error
          setError({ message: t("pos.itemNotFound", { barcode }) });
          setTimeout(() => setError(null), 3000);
          return;
        }
      }

      // Check stock
      if (item.stock <= 0) {
        setError({ message: t("pos.itemOutOfStock", { name: item.name }) });
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Add to cart or increment quantity
      setCart(prevCart => {
        const existingItem = prevCart.find(c => c.id === item.id);
        if (existingItem) {
          // Increment quantity if already in cart
          return prevCart.map(c =>
            c.id === item.id
              ? { ...c, quantity: c.quantity + 1 }
              : c
          );
        } else {
          // Add new item to cart
          return [
            ...prevCart,
            {
              id: item.id,
              name: item.name,
              sku: item.sku,
              unitPrice: parseFloat(item.salePrice || 0),
              quantity: 1,
              stock: item.stock
            }
          ];
        }
      });

      // Clear error on success
      setError(null);
      
      // Refocus barcode input for next scan
      if (barcodeInputRef.current) {
        setTimeout(() => barcodeInputRef.current?.focus(), 100);
      }
    } catch (err) {
      console.error("Error adding item:", err);
      setError({ message: err.response?.data?.message || t("pos.failedToAddItem") });
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleManualAdd = (item) => {
    if (item.stock <= 0) {
      setError({ message: `"${item.name}" is out of stock` });
      setTimeout(() => setError(null), 3000);
      return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(c => c.id === item.id);
      if (existingItem) {
        return prevCart.map(c =>
          c.id === item.id
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      } else {
        return [
          ...prevCart,
          {
            id: item.id,
            name: item.name,
            sku: item.sku,
            unitPrice: parseFloat(item.salePrice || 0),
            quantity: 1,
            stock: item.stock
          }
        ];
      }
    });
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === itemId
          ? { ...item, quantity: Math.min(newQuantity, item.stock) }
          : item
      )
    );
  };

  const removeFromCart = (itemId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const vat = subtotal * 0.05; // UAE VAT 5%
    const total = subtotal + vat;
    return { subtotal, vat, total };
  }, [cart]);

  // Filter items for quick selection
  // Show all items with stock, but prioritize items matching shop type category
  // IMPORTANT: This hook must be called BEFORE any conditional returns
  const filteredItems = useMemo(() => {
    const allItems = items.filter(item => item.stock > 0);
    
    if (shopType === 'general') {
      return allItems;
    }
    
    // Try to match items by category
    const matchingItems = allItems.filter(item => {
      const itemCategory = (item.category || '').toLowerCase();
      const itemName = (item.name || '').toLowerCase();
      return itemCategory.includes(shopType) || itemName.includes(shopType);
    });
    
    // If we have matching items, show them first, then others
    if (matchingItems.length > 0) {
      const otherItems = allItems.filter(item => !matchingItems.find(m => m.id === item.id));
      return [...matchingItems, ...otherItems];
    }
    
    return allItems;
  }, [items, shopType]);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError({ message: t("pos.cartEmptyError") });
      setTimeout(() => setError(null), 3000);
      return;
    }

    setProcessing(true);
    try {
      const saleData = {
        date: new Date().toISOString(),
        summary: `${currentShopTypeLabel} Sale - ${new Date().toLocaleString()}`,
        items: cart.map(item => ({
          item: item.id, // Backend expects 'item' not 'itemId'
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        totalSales: totals.subtotal,
        totalVAT: totals.vat,
        notes: `${currentShopTypeLabel} POS Sale`
      };

      const response = await apiClient.post("/inventory/sales", saleData);
      const savedSale = response.data;
      
      // Clear cart and show success
      setCart([]);
      setBarcodeInput("");
      
      // Ask if user wants to print receipt
      const printReceipt = confirm(t("pos.saleCompleted"));
      if (printReceipt && savedSale) {
        try {
          // Download receipt PDF from server
          const response = await apiClient.get(`/inventory/sales/${savedSale.id}/pdf?lang=${language}`, {
            responseType: "blob"
          });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `receipt-${savedSale.id}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        } catch (err) {
          console.error("Error generating receipt PDF:", err);
          alert("Failed to generate receipt PDF. Please check the console for details.");
        }
      }
      
      // Reload items to update stock
      await loadItems();
      
      // Refocus barcode input
      if (barcodeInputRef.current) {
        setTimeout(() => barcodeInputRef.current?.focus(), 100);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError({ message: err.response?.data?.message || t("pos.failedToCompleteSale") });
      setTimeout(() => setError(null), 5000);
    } finally {
      setProcessing(false);
    }
  };

  const handleClearCart = () => {
    if (confirm(t("pos.clearCartConfirm"))) {
      setCart([]);
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }
  };

  const handleShopTypeChange = (newType) => {
    setShopType(newType);
    try {
      localStorage.setItem('pos_shop_type', newType);
    } catch (e) {
      // localStorage might not be available, ignore
      console.warn('Could not save shop type to localStorage:', e);
    }
  };

  // All hooks must be called before any conditional returns
  // Loading check goes here after all hooks
  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Left Side - Item Selection */}
      <div className="w-1/3 border-r border-slate-200 bg-white flex flex-col">
        {/* Shop Type Selector */}
        <div className="p-3 border-b border-slate-200 bg-slate-100">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            {t("pos.shopType")}
          </label>
          <select
            value={shopType}
            onChange={(e) => handleShopTypeChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:border-primary focus:outline-none"
          >
            {SHOP_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.icon} {t(`pos.${type.key}`)}
              </option>
            ))}
          </select>
        </div>
        
        {/* Barcode Scanner Input */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {t("pos.scanBarcodeOrEnterSKU")}
          </label>
          <input
            ref={barcodeInputRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={handleBarcodeInput}
            placeholder={t("pos.scanBarcodePlaceholder")}
            className="w-full px-4 py-3 text-lg border-2 border-slate-300 rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <p className="text-xs text-slate-500 mt-1">
            {t("pos.scanBarcodeHint")}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-4 mt-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error.message}
          </div>
        )}

        {/* Quick Item Selection */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            {t("pos.quickSelectItems")} ({filteredItems.length} {t("pos.available")})
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {filteredItems.slice(0, 12).map(item => (
              <button
                key={item.id}
                onClick={() => handleManualAdd(item)}
                disabled={item.stock <= 0}
                className="p-3 text-left border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-medium text-sm text-slate-900">{item.name}</div>
                <div className="text-xs text-slate-600 mt-1">
                  {formatCurrency(item.salePrice)} • {t("pos.stock")} {item.stock}
                </div>
                {item.sku && (
                  <div className="text-xs text-slate-400 mt-1">{t("inventory.sku")}: {item.sku}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Cart & Checkout */}
      <div className="flex-1 flex flex-col">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">{t("pos.cart")}</h2>
            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                className="text-sm text-red-600 hover:text-red-700"
              >
                {t("pos.clearCart")}
              </button>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <div className="text-center">
                <div className="text-4xl mb-2">🛒</div>
                <p>{t("pos.cartEmpty")}</p>
                <p className="text-sm mt-1">{t("pos.scanItemsHint")}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      {item.sku && (
                        <div className="text-xs text-slate-500">{t("inventory.sku")}: {item.sku}</div>
                      )}
                      <div className="text-sm text-slate-600 mt-1">
                        {formatCurrency(item.unitPrice)} × {item.quantity}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-lg border border-slate-300 hover:bg-slate-100 flex items-center justify-center"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={item.stock}
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="w-12 text-center border border-slate-300 rounded-lg py-1"
                        />
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="w-8 h-8 rounded-lg border border-slate-300 hover:bg-slate-100 flex items-center justify-center disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <div className="font-semibold text-slate-900">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-600 hover:text-red-700 ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Totals & Checkout */}
        <div className="border-t border-slate-200 bg-white p-4">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-slate-600">
              <span>{t("pos.subtotal")}</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{t("pos.vat5Percent")}</span>
              <span>{formatCurrency(totals.vat)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>{t("pos.total")}</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </div>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || processing}
            className="w-full py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {processing ? t("pos.processing") : `${t("pos.checkout")} - ${formatCurrency(totals.total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

