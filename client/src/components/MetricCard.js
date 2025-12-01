export default function MetricCard({ label, value, icon, accent = "bg-primary/10" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
        </div>
        {icon ? (
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${accent}`}>
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}

