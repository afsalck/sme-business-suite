export function formatCurrency(amount, locale = "en-AE", currency = "AED") {
  if (Number.isNaN(Number(amount))) {
    return "AED 0.00";
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency
  }).format(amount);
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

