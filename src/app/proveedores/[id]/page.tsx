import Link from "next/link";
import { notFound } from "next/navigation";
import { loadProjectData } from "@/lib/data";
import { toUsd, formatUsd, formatAmount, formatDate } from "@/lib/finance";
import { KpiCard } from "@/components/Kpi";
import { commitmentPendingUsd, isSinCalendario, STATUS_LABELS, STATUS_STYLES } from "@/app/compromisos/lib";

export default async function ProveedorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadProjectData();
  const supplier = data.suppliers.find((s) => s.id === id);
  if (!supplier) notFound();

  const categoryName = supplier.category_id
    ? data.categories.find((c) => c.id === supplier.category_id)?.name ?? "—"
    : "—";

  const refFxRate = data.project.current_fx_rate;
  const supplierCommitments = data.commitments.filter((c) => c.supplier_id === id && !c.deleted_at);
  // Sección 8/18: "total contratado" se agrega igual que en presupuesto/categorías
  // (se excluyen los compromisos cancelados, sí se incluyen completados).
  const contractedCommitments = supplierCommitments.filter((c) => c.status !== "cancelled");

  const totalContratadoUsd = contractedCommitments.reduce(
    (sum, c) => sum + toUsd(c.total_amount, c.currency, refFxRate),
    0
  );

  const supplierPayments = data.payments.filter((p) => p.supplier_id === id && !p.deleted_at);
  const totalPagadoUsd = supplierPayments.reduce((sum, p) => sum + p.amount_usd, 0);
  const saldoPendienteUsd = Math.max(totalContratadoUsd - totalPagadoUsd, 0);

  const nextPayment = contractedCommitments
    .filter((c) => c.status === "active")
    .flatMap((c) => (data.installmentsByCommitmentId.get(c.id) ?? []).map((i) => ({ commitment: c, installment: i })))
    .filter((row) => row.installment.status === "pending")
    .sort((a, b) => a.installment.due_date.localeCompare(b.installment.due_date))[0];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/proveedores" className="text-sm text-slate-500 hover:underline">
          ← Proveedores
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{supplier.name}</h1>
        <p className="text-sm text-slate-500">
          {categoryName} · Moneda habitual {supplier.usual_currency}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <div>
          <p className="text-xs font-medium text-slate-500">Contacto</p>
          <p className="mt-1 text-sm text-slate-800">{supplier.contact_name || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Teléfono</p>
          <p className="mt-1 text-sm text-slate-800">{supplier.phone || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Email</p>
          <p className="mt-1 text-sm text-slate-800">{supplier.email || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Notas</p>
          <p className="mt-1 text-sm text-slate-800">{supplier.notes || "—"}</p>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total contratado" value={formatUsd(totalContratadoUsd)} />
        <KpiCard label="Total pagado" value={formatUsd(totalPagadoUsd)} />
        <KpiCard
          label="Saldo pendiente"
          value={formatUsd(saldoPendienteUsd)}
          tone={saldoPendienteUsd > 0 ? "negative" : "positive"}
        />
        <KpiCard
          label="Próximo pago"
          value={
            nextPayment
              ? `${nextPayment.installment.amount.toLocaleString("es-AR")} ${nextPayment.commitment.currency}`
              : "—"
          }
          sublabel={nextPayment ? formatDate(nextPayment.installment.due_date) : "Sin cuotas pendientes"}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Compromisos</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Rubro</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Saldo</th>
                <th className="px-4 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {supplierCommitments.map((c) => {
                const installments = data.installmentsByCommitmentId.get(c.id) ?? [];
                const { pendingUsd, hasSchedule } = commitmentPendingUsd(c, installments, refFxRate);
                const sinCalendario = isSinCalendario(c, hasSchedule);
                const rubro = data.categories.find((cat) => cat.id === c.category_id)?.name ?? "—";
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-800">{c.description}</td>
                    <td className="px-4 py-2.5 text-slate-600">{rubro}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                      {formatAmount(c.total_amount, c.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                      {formatUsd(pendingUsd)}
                      {sinCalendario && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          sin calendario
                        </span>
                      )}
                    </td>
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
              {supplierCommitments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">
                    Sin compromisos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Historial de pagos</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Concepto</th>
                <th className="px-4 py-3 text-right">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {supplierPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-600">{formatDate(p.date)}</td>
                  <td className="px-4 py-2.5 text-slate-800">{p.description}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                    {formatAmount(p.amount, p.currency)}
                  </td>
                </tr>
              ))}
              {supplierPayments.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-400">
                    Sin pagos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
