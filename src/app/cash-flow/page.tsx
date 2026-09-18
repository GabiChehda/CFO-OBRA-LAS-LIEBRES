import { loadProjectData } from "@/lib/data";
import { computeCashFlow, formatUsd, monthLabel } from "@/lib/finance";
import { CashFlowChart } from "@/components/charts/CashFlowChart";

export default async function CashFlowPage() {
  const data = await loadProjectData();
  const cashFlow = computeCashFlow({
    plan: data.cashflowPlan,
    commitments: data.commitments,
    installmentsByCommitmentId: data.installmentsByCommitmentId,
    payments: data.payments,
    fundingSources: data.fundingSources,
    refFxRate: data.project.current_fx_rate,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Cash Flow</h1>
        <p className="text-sm text-slate-500">
          Presupuesto original, pagos comprometidos, pagos reales y fondeo, mes a mes
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Evolución mensual</h3>
        <CashFlowChart data={cashFlow} />
      </section>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-3">Mes</th>
              <th className="px-4 py-3 text-right">Presupuesto original</th>
              <th className="px-4 py-3 text-right">Pagos comprometidos</th>
              <th className="px-4 py-3 text-right">Pagos realizados</th>
              <th className="px-4 py-3 text-right">Fondeo</th>
              <th className="px-4 py-3 text-right">Caja final</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cashFlow.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-400">
                  No hay datos de cash flow cargados.
                </td>
              </tr>
            ) : (
              cashFlow.map((row) => (
                <tr key={row.month} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{monthLabel(row.month)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatUsd(row.originalUsd)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatUsd(row.forecastUsd)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatUsd(row.actualUsd)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatUsd(row.fundingUsd)}</td>
                  <td
                    className={`px-4 py-2.5 text-right tabular-nums font-medium ${
                      row.cashBalanceUsd < 0 ? "text-red-600" : "text-slate-900"
                    }`}
                  >
                    {formatUsd(row.cashBalanceUsd)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
