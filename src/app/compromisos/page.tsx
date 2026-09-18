import Link from "next/link";
import { loadProjectData } from "@/lib/data";
import { formatAmount, formatUsd } from "@/lib/finance";
import { commitmentPendingUsd, isSinCalendario, STATUS_LABELS, STATUS_STYLES } from "./lib";

export default async function CompromisosPage() {
  const data = await loadProjectData();
  const supplierName = new Map(data.suppliers.map((s) => [s.id, s.name]));
  const categoryName = new Map(data.categories.map((c) => [c.id, c.name]));
  const refFxRate = data.project.current_fx_rate;

  const commitments = [...data.commitments]
    .filter((c) => !c.deleted_at)
    .sort((a, b) => b.contract_date.localeCompare(a.contract_date));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Compromisos</h1>
          <p className="text-sm text-slate-500">Contratos con proveedores y su saldo pendiente</p>
        </div>
        <Link
          href="/compromisos/nuevo"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          + Nuevo compromiso
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Rubro</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Anticipo</th>
              <th className="px-4 py-3 text-right">Saldo pendiente</th>
              <th className="px-4 py-3 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {commitments.map((c) => {
              const installments = data.installmentsByCommitmentId.get(c.id) ?? [];
              const { pendingUsd, hasSchedule } = commitmentPendingUsd(c, installments, refFxRate);
              const sinCalendario = isSinCalendario(c, hasSchedule);
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/proveedores/${c.supplier_id}`} className="font-medium text-slate-900 hover:underline">
                      {supplierName.get(c.supplier_id) ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{categoryName.get(c.category_id) ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-800">
                    {c.description}
                    {sinCalendario && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        sin calendario
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                    {formatAmount(c.total_amount, c.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                    {formatAmount(c.advance_amount, c.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatUsd(pendingUsd)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status]}`}
                    >
                      {STATUS_LABELS[c.status]}
                    </span>
                  </td>
                </tr>
              );
            })}
            {commitments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">
                  Todavía no hay compromisos cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
