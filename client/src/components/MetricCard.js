export default function MetricCard({ label, value, icon, accent = "bg-primary/10", trend, trendLabel, colorScheme = "default" }) {
  // Color schemes for different metric types
  const colorSchemes = {
    sales: {
      border: "border-emerald-200",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600"
    },
    expenses: {
      border: "border-rose-200",
      bg: "bg-rose-50",
      text: "text-rose-700",
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600"
    },
    profit: {
      border: "border-indigo-200",
      bg: "bg-indigo-50",
      text: "text-indigo-700",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600"
    },
    vat: {
      border: "border-amber-200",
      bg: "bg-amber-50",
      text: "text-amber-700",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600"
    },
    invoices: {
      border: "border-blue-200",
      bg: "bg-blue-50",
      text: "text-blue-700",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    default: {
      border: "border-slate-200",
      bg: "bg-white",
      text: "text-slate-900",
      iconBg: accent,
      iconColor: "text-slate-600"
    }
  };

  const colors = colorSchemes[colorScheme] || colorSchemes.default;

  return (
    <div className={`group rounded-xl border-2 ${colors.border} ${colors.bg} p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${colors.text} mb-2`}>{label}</p>
          <p className={`text-xl font-bold ${colors.text} leading-tight whitespace-nowrap overflow-hidden text-ellipsis`} title={value}>{value}</p>
          {trend !== undefined && trendLabel && (
            <div className={`mt-3 flex items-center gap-1.5 text-sm font-medium ${
              trend >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              <svg 
                className={`w-4 h-4 ${trend >= 0 ? '' : 'rotate-180'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>{Math.abs(trend)}%</span>
              <span className="text-slate-500 font-normal">{trendLabel}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${colors.iconBg} ${colors.iconColor} transition-transform duration-200 group-hover:scale-110`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

