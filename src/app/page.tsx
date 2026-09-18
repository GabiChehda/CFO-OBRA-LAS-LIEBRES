import Link from "next/link";
import { loadProjectData } from "@/lib/data";
import {
  computeAllCategoryFinancials,
  computeProjectSummary,
  computeFundingSummary,
  computeCashFlow,
  computeAlerts,
  formatUsd,
  formatPct,
  formatDate,
} from "@/lib/finance";
import { KpiCard, SemaforoBadge } from "@/components/Kpi";
import { BudgetVsEstimateChart } from "@/components/charts/BudgetVsEstimateChart";
import { CashFlowChart } from "@/components/charts/CashFlowChart";
import { BudgetDistributionChart } from "@/components/charts/BudgetDistributionChart";

export default async function DashboardPage() {
  const data = await loadProjectData();
  const financials = computeAllCategoryFinancials(
    data.categories,
    data.commitments,
    data.payments,
    data.installmentsByCommitmentId,
    data.project
  );
  const summary = computeProjectSummary(data.categories, financials);
  const fundingSummary = computeFundingSummary(data.fundingSources, summary.pendingBalanceUsd, data.project.current_fx_rate);
  const cashFlow = computeCashFlow({
    plan: data.cashflowPlan,
    commitments: data.commitments,
    installmentsByCommitmentId: data.installmentsByCommitmentId,
    payments: data.payments,
    fundingSources: data.fundingSources,
    refFxRate: data.project.current_fx_rate,
  });
  const alerts = computeAlerts({
    categories: data.categories,
    financialsByCategory: financials,
    commitments: data.commitments,
    installmentsByCommitmentId: data.installmentsByCommitmentId,
    cashFlow,
  });

  const roots = data.categories.filter((c) => c.parent_id === null);
  const budgetVsEstimate = roots.map((c) => {
    const f = financials.get(c.id)!;
    return { name: c.name, presupuesto: Math.round(f.budgetUsd), estimado: Math.round(f.eacUsd) };
  });
  const distribution = roots.map((c) => ({ name: c.name, value: Math.round(financials.get(c.id)!.budgetUsd) }));

  const today = new Date();
  const upcomingPayments = data.commitments
    .filter((c) => !c.deleted_at && c.status === "active")
    .flatMap((c) => (data.installmentsByCommitmentId.get(c.id) ?? []).map((i) => ({ commitment: c, installment: i })))
    .filter((row) => row.installment.status === "pending")
    .filter((row) => {
      const days = (new Date(`${row.installment.due_date}T00:00:00Z`).getTime() - today.getTime()) / 86400000;
      return days >= -3650 && days <= 30;
    })
    .sort((a, b) => a.installment.due_date.localeCompare(b.installment.due_date))
    .slice(0, 6);

  const semaforoCounts = { green: 0, yellow: 0, red: 0 };
  for (const c of roots) {
    const status = financials.get(c.id)!.status;
    semaforoCounts[status]++;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">{data.project.name}</p>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Presupuesto total" value={formatUsd(summary.budgetUsd)} />
        <KpiCard label="Estimado actual" value={formatUsd(summary.eacUsd)} />
        <KpiCard label="Comprometido" value={formatUsd(summary.committedUsd)} />
        <KpiCard label="Pagado acumulado" value={formatUsd(summary.paidUsd)} />
        <KpiCard label="Saldo por pagar" value={formatUsd(summary.pendingBalanceUsd)} />
        <KpiCard
          label="Desvío proyectado"
          value={formatUsd(summary.deviationUsd)}
          sublabel={summary.deviationPct !== null ? formatPct(summary.deviationPct) : undefined}
          tone={summary.deviationUsd > 0 ? "negative" : "positive"}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Liquidez</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Fondos disponibles" value={formatUsd(fundingSummary.availableTodayUsd)} />
          <KpiCard label="Fondeo futuro confirmado" value={formatUsd(fundingSummary.confirmedFutureUsd)} />
          <KpiCard label="Necesidad futura (comprometido)" value={formatUsd(fundingSummary.futureNeedUsd)} />
          <KpiCard
            label={fundingSummary.gapUsd > 0 ? "Gap de fondeo" : "Superávit de fondeo"}
            value={formatUsd(Math.abs(fundingSummary.gapUsd))}
            tone={fundingSummary.gapUsd > 0 ? "negative" : "positive"}
          />
        </div>
      </section>

      <section className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <span className="font-medium text-slate-700">Semáforo de rubros:</span>
        <span className="flex items-center gap-1"><SemaforoBadge status="green" /> {semaforoCounts.green}</span>
        <span className="flex items-center gap-1"><SemaforoBadge status="yellow" /> {semaforoCounts.yellow}</span>
        <span className="flex items-center gap-1"><SemaforoBadge status="red" /> {semaforoCounts.red}</span>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Presupuesto vs. Estimado final por rubro</h3>
          <BudgetVsEstimateChart data={budgetVsEstimate} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Distribución del presupuesto</h3>
          <BudgetDistributionChart data={distribution} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Cash flow mensual</h3>
        <CashFlowChart data={cashFlow} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Próximos pagos</h3>
          {upcomingPayments.length === 0 ? (
            <p className="text-sm text-slate-400">No hay cuotas pendientes cargadas.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcomingPayments.map(({ commitment, installment }) => (
                <li key={installment.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{commitment.description}</p>
                    <p className="text-xs text-slate-400">{formatDate(installment.due_date)}</p>
                  </div>
                  <span className="tabular-nums text-slate-700">
                    {installment.amount.toLocaleString("es-AR")} {commitment.currency}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Alertas</h3>
          {alerts.length === 0 ? (
            <p className="text-sm text-slate-400">Sin alertas activas.</p>
          ) : (
            <ul className="space-y-2">
              {alerts.slice(0, 8).map((alert, idx) => (
                <li key={idx} className="text-sm">
                  <Link
                    href={alert.href ?? "#"}
                    className={`block rounded-lg px-3 py-2 ${
                      alert.severity === "danger" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {alert.message}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
