import { loadProjectData } from "@/lib/data";
import { computeAllCategoryFinancials, computeProjectSummary, formatUsd, formatPct } from "@/lib/finance";
import { KpiCard } from "@/components/Kpi";
import { PresupuestoTree } from "./PresupuestoTree";

export default async function PresupuestoPage() {
  const data = await loadProjectData();
  const financials = computeAllCategoryFinancials(
    data.categories,
    data.commitments,
    data.payments,
    data.installmentsByCommitmentId,
    data.project
  );
  const summary = computeProjectSummary(data.categories, financials);
  const financialsRecord = Object.fromEntries(financials);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Presupuesto</h1>
        <p className="text-sm text-slate-500">Presupuesto vs. comprometido, pagado y estimado final por rubro</p>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-7">
        <KpiCard label="Presupuesto original" value={formatUsd(summary.budgetUsd)} />
        <KpiCard label="Estimado final (EAC)" value={formatUsd(summary.eacUsd)} />
        <KpiCard label="Comprometido total" value={formatUsd(summary.committedUsd)} />
        <KpiCard label="Pagado" value={formatUsd(summary.paidUsd)} />
        <KpiCard label="Comprometido pendiente" value={formatUsd(summary.pendingBalanceUsd)} />
        <KpiCard label="Pendiente de ejecutar" value={formatUsd(summary.remainingToExecuteUsd)} />
        <KpiCard
          label="Desvío vs. presupuesto"
          value={formatUsd(summary.deviationUsd)}
          sublabel={summary.deviationPct !== null ? formatPct(summary.deviationPct) : undefined}
          tone={summary.deviationUsd > 0 ? "negative" : "positive"}
        />
      </section>

      <PresupuestoTree categories={data.categories} financials={financialsRecord} />
    </div>
  );
}
