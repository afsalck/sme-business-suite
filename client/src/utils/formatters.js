export function formatCurrency(amount, locale = "en-AE", currency = "AED") {
  // Handle null, undefined, empty string, or NaN
  if (amount === null || amount === undefined || amount === "" || Number.isNaN(Number(amount))) {
    return "AED 0.00";
  }
  
  const numAmount = Number(amount);
  
  // Handle Infinity or negative infinity
  if (!isFinite(numAmount)) {
    return "AED 0.00";
  }
  
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numAmount);
}

export function formatDate(value, locale = "en-GB") {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(locale);
}

export function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

