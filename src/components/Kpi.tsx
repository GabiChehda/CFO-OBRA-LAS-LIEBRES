export function KpiCard({
  label,
  value,
  sublabel,
  tone = "default",
  sublabelTone = "default",
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "default" | "positive" | "negative";
  sublabelTone?: "default" | "positive" | "negative";
}) {
  const valueColor = tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-600" : "text-slate-900";
  const sublabelColor =
    sublabelTone === "positive" ? "text-emerald-600" : sublabelTone === "negative" ? "text-red-600" : "text-slate-400";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${valueColor}`}>{value}</p>
      {sublabel && <p className={`mt-0.5 text-xs font-medium ${sublabelColor}`}>{sublabel}</p>}
    </div>
  );
}

const SEMAFORO_STYLES = {
  green: "bg-emerald-100 text-emerald-700",
  yellow: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  none: "bg-slate-100 text-slate-500",
};

export function SemaforoBadge({ status }: { status: "green" | "yellow" | "red" | "none" }) {
  const labels = { green: "En línea", yellow: "Atención", red: "Desvío", none: "Sin presupuesto" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SEMAFORO_STYLES[status]}`}>
      {labels[status]}
    </span>
  );
}
