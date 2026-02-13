import { useEffect, useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import useAuth from "../hooks/useAuth";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import { formatCurrency } from "../utils/formatters";

const SHOP_TYPES = [
  { value: "cafe", label: "Cafe", icon: "☕" },
  { value: "retail", label: "Retail Store", icon: "🛍️" },
  { value: "restaurant", label: "Restaurant", icon: "🍽️" },
  { value: "grocery", label: "Grocery Store", icon: "🛒" },
  { value: "pharmacy", label: "Pharmacy", icon: "💊" },
  { value: "electronics", label: "Electronics", icon: "📱" },
  { value: "clothing", label: "Clothing Store", icon: "👕" },
  { value: "general", label: "General Store", icon: "🏪" }
];

export default function POSPage({ language }) {
  const { t } = useTranslation();
  const { role } = useAuth();
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [shopType, setShopType] = useState(() => {
    // Get from localStorage or default to 'general'
    return localStorage.getItem('pos_shop_type') || 'general';
  });
  const barcodeInputRef = useRef(null);

  const canManage = role === "admin" || role === "staff";
  
  const currentShopType = SHOP_TYPES.find(st => st.value === shopType) || SHOP_TYPES[SHOP_TYPES.length - 1];

  useEffect(() => {
    loadItems();
    // Auto-focus barcode input on mount
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
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
    const value = e.target.value.trim();
    
    // Wait for Enter key (scanner sends Enter) or if input is long enough (some scanners don't send Enter)
    if (e.key === "Enter" || (value.length >= 8 && !value.includes(" "))) {
      e.preventDefault();
      await searchAndAddItem(value);
      setBarcodeInput("");
    } else {
      setBarcodeInput(value);
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
          setError({ message: `Item with barcode "${barcode}" not found` });
          setTimeout(() => setError(null), 3000);
          return;
        }
      }

      // Check stock
      if (item.stock <= 0) {
        setError({ message: `"${item.name}" is out of stock` });
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
      setError({ message: err.response?.data?.message || "Failed to add item" });
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

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError({ message: "Cart is empty" });
      setTimeout(() => setError(null), 3000);
      return;
    }

    setProcessing(true);
    try {
      const saleData = {
        date: new Date().toISOString(),
        summary: `${currentShopType.label} Sale - ${new Date().toLocaleString()}`,
        items: cart.map(item => ({
          itemId: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.unitPrice * item.quantity
        })),
        totalSales: totals.subtotal,
        totalVAT: totals.vat,
        notes: `${currentShopType.label} POS Sale`
      };

      await apiClient.post("/inventory/sales", saleData);
      
      // Clear cart and show success
      setCart([]);
      setBarcodeInput("");
      alert("Sale completed successfully!");
      
      // Reload items to update stock
      await loadItems();
      
      // Refocus barcode input
      if (barcodeInputRef.current) {
        setTimeout(() => barcodeInputRef.current?.focus(), 100);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError({ message: err.response?.data?.message || "Failed to complete sale" });
      setTimeout(() => setError(null), 5000);
    } finally {
      setProcessing(false);
    }
  };

  const handleClearCart = () => {
    if (window.confirm("Clear all items from cart?")) {
      setCart([]);
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  // Filter items for quick selection (popular items or all)
  const popularItems = items.filter(item => item.stock > 0).slice(0, 12);
  
  // Filter items by category if shop type is set
  const filteredItems = shopType !== 'general' 
    ? items.filter(item => {
        // If item has category, try to match with shop type
        const itemCategory = (item.category || '').toLowerCase();
        return itemCategory.includes(shopType) || item.stock > 0;
      })
    : items.filter(item => item.stock > 0);

  const handleShopTypeChange = (newType) => {
    setShopType(newType);
    localStorage.setItem('pos_shop_type', newType);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Left Side - Item Selection */}
      <div className="w-1/3 border-r border-slate-200 bg-white flex flex-col">
        {/* Shop Type Selector */}
        <div className="p-3 border-b border-slate-200 bg-slate-100">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Shop Type
          </label>
          <select
            value={shopType}
            onChange={(e) => handleShopTypeChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:border-primary focus:outline-none"
          >
            {SHOP_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Barcode Scanner Input */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Scan Barcode or Enter SKU
          </label>
          <input
            ref={barcodeInputRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={handleBarcodeInput}
            placeholder="Scan barcode or type SKU..."
            className="w-full px-4 py-3 text-lg border-2 border-slate-300 rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <p className="text-xs text-slate-500 mt-1">
            Scan barcode or type SKU and press Enter
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
            Quick Select Items ({filteredItems.length} available)
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
                  {formatCurrency(item.salePrice)} • Stock: {item.stock}
                </div>
                {item.sku && (
                  <div className="text-xs text-slate-400 mt-1">SKU: {item.sku}</div>
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
            <h2 className="text-xl font-bold text-slate-900">Cart</h2>
            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clear Cart
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
                <p>Cart is empty</p>
                <p className="text-sm mt-1">Scan items or select from quick items</p>
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
                        <div className="text-xs text-slate-500">SKU: {item.sku}</div>
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
              <span>Subtotal:</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>VAT (5%):</span>
              <span>{formatCurrency(totals.vat)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total:</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </div>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || processing}
            className="w-full py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {processing ? "Processing..." : `Checkout - ${formatCurrency(totals.total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

