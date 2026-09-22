import { loadProjectData } from "@/lib/data";
import {
  computeAllCategoryFinancials,
  computeProjectSummary,
  computeFundingSummary,
  computeCashFlow,
  computePeakFundingGap,
  formatUsd,
  formatAmount,
  formatDate,
  monthLabel,
} from "@/lib/finance";
import { KpiCard } from "@/components/Kpi";
import { FundingSourceButton, DeleteFundingSourceButton } from "./FundingSourceButton";
import type { FundingSource, FundingSourceStatus, FundingSourceType } from "@/lib/database.types";

const TYPE_LABELS: Record<FundingSourceType, string> = {
  caja_ahorro: "Caja de ahorro",
  reserva_financiera: "Reserva financiera",
  venta_activo: "Venta de activo",
  prestamo: "Préstamo",
  ingreso_futuro: "Ingreso futuro",
  credito: "Crédito",
  otro: "Otro",
};

const STATUS_LABELS: Record<FundingSourceStatus, string> = {
  disponible: "Disponible",
  confirmado_futuro: "Confirmado futuro",
  potencial: "Potencial",
  utilizado: "Utilizado",
  cancelado: "Cancelado",
};

const STATUS_BADGE: Record<FundingSourceStatus, string> = {
  disponible: "bg-emerald-100 text-emerald-700",
  confirmado_futuro: "bg-sky-100 text-sky-700",
  potencial: "bg-amber-100 text-amber-700",
  utilizado: "bg-slate-100 text-slate-500",
  cancelado: "bg-red-100 text-red-700",
};

export default async function FondosPage() {
  const data = await loadProjectData();
  const financials = computeAllCategoryFinancials(
    data.categories,
    data.commitments,
    data.payments,
    data.installmentsByCommitmentId,
    data.project
  );
  const summary = computeProjectSummary(data.categories, financials);
  const fundingSummary = computeFundingSummary(
    data.fundingSources,
    summary.remainingToExecuteUsd,
    summary.pendingBalanceUsd,
    data.project.current_fx_rate
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

  // Timeline: "fondos iniciales" de cada mes es la caja final del mes anterior
  // (el primero arranca de la caja disponible hoy — "disponible" nunca es un
  // ingreso mensual, ver computeCashFlow).
  const timeline = cashFlow.map((row, idx) => ({
    month: row.month,
    initialUsd: idx === 0 ? fundingSummary.cashOnHandUsd : cashFlow[idx - 1].cashBalanceUsd,
    confirmedFundingUsd: row.confirmedFundingUsd,
    outflowUsd: row.actualUsd + row.forecastUsd,
    finalUsd: row.cashBalanceUsd,
  }));

  const activeSources = data.fundingSources.filter((f) => !f.deleted_at);
  const potentialSources = activeSources.filter((f) => f.status === "potencial");
  const baseSources = activeSources.filter((f) => f.status !== "potencial");
  const undatedConfirmedCount = activeSources.filter((f) => f.status === "confirmado_futuro" && !f.available_date).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Fondos</h1>
        <p className="text-sm text-slate-500">Fuentes de fondeo y cobertura de las necesidades futuras de obra</p>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Caja disponible hoy" value={formatUsd(fundingSummary.cashOnHandUsd)} />
        <KpiCard label="Fondeo futuro confirmado" value={formatUsd(fundingSummary.confirmedFutureUsd)} />
        <KpiCard label="Fondeo potencial" value={formatUsd(fundingSummary.potentialUsd)} />
        <KpiCard label="Pendiente de obra" value={formatUsd(fundingSummary.pendingOfObraUsd)} />
        <KpiCard
          label={fundingSummary.baseGapUsd < 0 ? "Gap de fondeo base" : "Superávit base"}
          value={formatUsd(Math.abs(fundingSummary.baseGapUsd))}
          sublabel={
            fundingSummary.gapWithPotentialUsd >= 0
              ? `Superávit con potencial: ${formatUsd(fundingSummary.gapWithPotentialUsd)}`
              : `Gap con potencial: ${formatUsd(Math.abs(fundingSummary.gapWithPotentialUsd))}`
          }
          sublabelTone={fundingSummary.gapWithPotentialUsd >= 0 ? "positive" : "negative"}
          tone={fundingSummary.baseGapUsd < 0 ? "negative" : "positive"}
        />
        <div>
          <KpiCard
            label="Peak Funding Gap"
            value={formatUsd(Math.abs(peakGap.peakGapUsd))}
            sublabel={peakGap.peakGapMonth ? `Peak en ${monthLabel(peakGap.peakGapMonth)}` : "Sin déficit proyectado"}
            tone={peakGap.peakGapUsd < 0 ? "negative" : "positive"}
          />
          <p className={`mt-1 text-xs font-medium ${peakGap.firstNegativeMonth ? "text-red-600" : "text-slate-400"}`}>
            {peakGap.firstNegativeMonth
              ? `Caja negativa desde: ${monthLabel(peakGap.firstNegativeMonth)}`
              : "Caja nunca negativa (escenario base)"}
          </p>
        </div>
      </section>

      <p className="text-xs text-slate-400">
        Comprometido pendiente: {formatUsd(fundingSummary.committedPendingUsd)} · Todavía no comprometido:{" "}
        {formatUsd(fundingSummary.uncommittedPendingUsd)}
      </p>

      <section>
        <h2 className="mb-1 text-sm font-semibold text-slate-700">Timeline mensual de fondeo (escenario base)</h2>
        {undatedConfirmedCount > 0 && (
          <p className="mb-3 text-xs text-amber-700">
            {undatedConfirmedCount === 1 ? "Hay 1 fuente confirmada" : `Hay ${undatedConfirmedCount} fuentes confirmadas`}{" "}
            sin fecha (marcadas &ldquo;Confirmado sin fecha&rdquo; abajo) — suman al total de fondeo confirmado de
            arriba, pero no aparecen en ningún mes de esta tabla hasta que les cargues una fecha estimada.
          </p>
        )}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-3">Mes</th>
                <th className="px-4 py-3 text-right">Fondos iniciales</th>
                <th className="px-4 py-3 text-right">Fondeo confirmado</th>
                <th className="px-4 py-3 text-right">Salidas (real + forecast)</th>
                <th className="px-4 py-3 text-right">Saldo final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {timeline.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">
                    No hay datos de cash flow cargados.
                  </td>
                </tr>
              ) : (
                timeline.map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{monthLabel(row.month)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatUsd(row.initialUsd)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatUsd(row.confirmedFundingUsd)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatUsd(row.outflowUsd)}</td>
                    <td
                      className={`px-4 py-2.5 text-right tabular-nums font-medium ${
                        row.finalUsd < 0 ? "text-red-600" : "text-slate-900"
                      }`}
                    >
                      {formatUsd(row.finalUsd)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Fuentes de fondeo — escenario base</h2>
          <FundingSourceButton />
        </div>
        <FundingSourcesTable sources={baseSources} />
      </section>

      {potentialSources.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Fuentes potenciales — escenario alternativo</h2>
          <p className="mb-3 text-xs text-slate-400">
            No forman parte de la caja proyectada base; sólo se suman en el &ldquo;Gap incluyendo potencial&rdquo; de arriba.
          </p>
          <FundingSourcesTable sources={potentialSources} />
        </section>
      )}
    </div>
  );
}

function FundingSourcesTable({ sources }: { sources: FundingSource[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3 text-right">Monto total</th>
            <th className="px-4 py-3 text-right">Usado</th>
            <th className="px-4 py-3 text-right">Disponible</th>
            <th className="px-4 py-3">Fecha disp.</th>
            <th className="px-4 py-3 text-center">Estado</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sources.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-400">
                No hay fuentes de fondeo cargadas todavía.
              </td>
            </tr>
          ) : (
            sources.map((source) => {
              const remaining = source.total_amount - source.used_amount;
              return (
                <tr key={source.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{source.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{TYPE_LABELS[source.type]}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                    {formatAmount(source.total_amount, source.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                    {formatAmount(source.used_amount, source.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-900">
                    {formatAmount(remaining, source.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {source.available_date ? (
                      formatDate(source.available_date)
                    ) : source.status === "confirmado_futuro" ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Confirmado sin fecha
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[source.status]}`}
                    >
                      {STATUS_LABELS[source.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-3">
                      <FundingSourceButton source={source} />
                      <DeleteFundingSourceButton id={source.id} />
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
