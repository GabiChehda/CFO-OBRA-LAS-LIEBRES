import { loadProjectData } from "@/lib/data";
import { computeAllCategoryFinancials, computeCashFlow, computePeakFundingGap, monthLabel } from "@/lib/finance";
import { CashFlowChart } from "@/components/charts/CashFlowChart";
import { CashFlowTable, type MonthDetail } from "./CashFlowTable";

function monthKey(dateIso: string): string {
  return `${dateIso.slice(0, 7)}-01`;
}

export default async function CashFlowPage() {
  const data = await loadProjectData();
  const financials = computeAllCategoryFinancials(
    data.categories,
    data.commitments,
    data.payments,
    data.installmentsByCommitmentId,
    data.project
  );
  const cashFlow = computeCashFlow({
    categories: data.categories,
    financialsByCategory: financials,
    plan: data.cashflowPlan,
    commitments: data.commitments,
    installmentsByCommitmentId: data.installmentsByCommitmentId,
    payments: data.payments,
    fundingSources: data.fundingSources,
    refFxRate: data.project.current_fx_rate,
  });
  const peakGap = computePeakFundingGap(cashFlow);

  const categoryLabel = new Map<string, string>();
  for (const c of data.categories) {
    if (c.parent_id === null) categoryLabel.set(c.id, c.name);
  }
  for (const c of data.categories) {
    if (c.parent_id !== null) {
      const parentName = categoryLabel.get(c.parent_id) ?? "";
      categoryLabel.set(c.id, parentName ? `${parentName} > ${c.name}` : c.name);
    }
  }
  // Detalle por mes para el click-to-expand (sección 9): qué pagos reales, qué
  // cuotas comprometidas y qué líneas del plan original caen en ese mes.
  const monthDetails: Record<string, MonthDetail> = {};
  function detailFor(month: string): MonthDetail {
    if (!monthDetails[month]) monthDetails[month] = { payments: [], installments: [], planEntries: [] };
    return monthDetails[month];
  }

  for (const p of data.payments.filter((p) => !p.deleted_at)) {
    detailFor(monthKey(p.date)).payments.push({
      id: p.id,
      description: p.description,
      categoryName: categoryLabel.get(p.category_id) ?? "—",
      amountUsd: p.amount_usd,
      amount: p.amount,
      currency: p.currency,
    });
  }

  for (const commitment of data.commitments) {
    if (commitment.deleted_at || commitment.status === "cancelled") continue;
    const installments = data.installmentsByCommitmentId.get(commitment.id) ?? [];
    for (const installment of installments) {
      if (installment.status !== "pending") continue;
      detailFor(monthKey(installment.due_date)).installments.push({
        id: installment.id,
        description: commitment.description,
        categoryName: categoryLabel.get(commitment.category_id) ?? "—",
        dueDate: installment.due_date,
        amount: installment.amount,
        currency: commitment.currency,
      });
    }
  }

  for (const entry of data.cashflowPlan) {
    detailFor(monthKey(entry.month)).planEntries.push({
      categoryName: categoryLabel.get(entry.category_id) ?? "—",
      amount: entry.planned_amount,
      currency: entry.currency,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Cash Flow</h1>
        <p className="text-sm text-slate-500">Plan original, forecast vigente, pagos reales y fondeo, mes a mes</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        {peakGap.firstNegativeMonth ? (
          <p className="text-red-700">
            Primer mes con caja negativa: <strong>{monthLabel(peakGap.firstNegativeMonth)}</strong> · Peak Funding
            Gap: <strong>{Math.abs(peakGap.peakGapUsd).toLocaleString("es-AR", { maximumFractionDigits: 0 })} USD</strong>{" "}
            en {peakGap.peakGapMonth ? monthLabel(peakGap.peakGapMonth) : "—"}
          </p>
        ) : (
          <p className="text-emerald-700">La caja proyectada no se vuelve negativa con el fondeo base actual.</p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Evolución mensual</h3>
        <CashFlowChart data={cashFlow} />
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Detalle mensual</h3>
        <p className="mb-3 text-xs text-slate-400">Click en un mes para ver qué pagos, cuotas y plan original lo componen.</p>
        <CashFlowTable rows={cashFlow} monthDetails={monthDetails} />
      </section>
    </div>
  );
}
