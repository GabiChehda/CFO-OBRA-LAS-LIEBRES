import Link from "next/link";
import { notFound } from "next/navigation";
import { loadProjectData } from "@/lib/data";
import {
  buildChildrenIndex,
  computeAllCategoryFinancials,
  formatUsd,
  formatAmount,
  formatPct,
  formatDate,
} from "@/lib/finance";
import { KpiCard, SemaforoBadge } from "@/components/Kpi";
import { EditBudgetForm } from "../EditBudgetForm";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  transferencia_ars: "Transferencia ARS",
  transferencia_usd: "Transferencia USD",
  cash_ars: "Cash ARS",
  cash_usd: "Cash USD",
  tarjeta: "Tarjeta",
  cheque: "Cheque",
  otro: "Otro",
};

const COMMITMENT_STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  completed: "Completado",
  cancelled: "Cancelado",
};

/** Saldo pendiente de un compromiso para mostrar en la tabla: si tiene cuotas
 * cargadas, suma las pendientes; si no, total menos anticipo. En la moneda del
 * compromiso (no se convierte a USD acá, es sólo para el detalle visual). */
function commitmentPending(commitmentId: string, totalAmount: number, advanceAmount: number, installmentsByCommitmentId: Map<string, { amount: number; status: string }[]>) {
  const installments = installmentsByCommitmentId.get(commitmentId) ?? [];
  if (installments.length > 0) {
    return installments.filter((i) => i.status === "pending").reduce((sum, i) => sum + i.amount, 0);
  }
  return Math.max(totalAmount - advanceAmount, 0);
}

export default async function CategoryDetailPage({ params }: { params: Promise<{ categoryId: string }> }) {
  const { categoryId } = await params;
  const data = await loadProjectData();

  const category = data.categories.find((c) => c.id === categoryId);
  if (!category) notFound();

  const financials = computeAllCategoryFinancials(
    data.categories,
    data.commitments,
    data.payments,
    data.installmentsByCommitmentId,
    data.project
  );
  const f = financials.get(categoryId);
  if (!f) notFound();

  const childrenByParent = buildChildrenIndex(data.categories);
  const subrubros = childrenByParent.get(categoryId) ?? [];
  const parent = category.parent_id ? data.categories.find((c) => c.id === category.parent_id) : null;

  const ownCommitments = data.commitments.filter((c) => !c.deleted_at && c.category_id === categoryId);
  const ownPayments = data.payments
    .filter((p) => !p.deleted_at && p.category_id === categoryId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const supplierIds = new Set<string>([
    ...data.suppliers.filter((s) => s.category_id === categoryId).map((s) => s.id),
    ...ownCommitments.map((c) => c.supplier_id),
  ]);
  const ownSuppliers = data.suppliers.filter((s) => supplierIds.has(s.id));
  const supplierNameById = new Map(data.suppliers.map((s) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <div>
        {parent && (
          <Link href={`/presupuesto/${parent.id}`} className="text-sm text-slate-500 hover:text-slate-700">
            ← {parent.name}
          </Link>
        )}
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">{category.name}</h1>
          <SemaforoBadge status={f.status} />
        </div>
        <p className="text-sm text-slate-500">
          {f.isParent ? "Rubro (incluye subrubros)" : "Subrubro"}
          {f.eacIsOverride && " · Estimado final con override manual"}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Presupuesto original" value={formatUsd(f.budgetUsd)} />
        <KpiCard label="Comprometido total" value={formatUsd(f.committedUsd)} />
        <KpiCard label="Pagado" value={formatUsd(f.paidUsd)} />
        <KpiCard
          label="Estimado final (EAC)"
          value={formatUsd(f.eacUsd)}
          sublabel={f.eacIsOverride ? "Override manual" : "Calculado automáticamente"}
        />
      </section>

      <section className="grid grid-cols-3 gap-3">
        <KpiCard label="Comprometido pendiente" value={formatUsd(f.pendingBalanceUsd)} />
        <KpiCard label="Pendiente de ejecutar" value={formatUsd(f.remainingToExecuteUsd)} />
        <KpiCard
          label="Desvío vs. presupuesto"
          value={formatUsd(f.deviationUsd)}
          sublabel={f.deviationPct !== null ? formatPct(f.deviationPct) : undefined}
          tone={f.deviationUsd > 0 ? "negative" : "positive"}
        />
      </section>

      <EditBudgetForm
        categoryId={category.id}
        initialBudgetAmount={category.budget_amount}
        initialBudgetCurrency={category.budget_currency}
        initialOverride={category.estimated_final_amount_override}
      />

      {subrubros.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Subrubros</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3 text-right">Presupuesto</th>
                  <th className="px-4 py-3 text-right">Estimado final</th>
                  <th className="px-4 py-3 text-center">Semáforo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subrubros.map((s) => {
                  const sf = financials.get(s.id);
                  if (!sf) return null;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <Link href={`/presupuesto/${s.id}`} className="text-slate-700 hover:text-slate-900">
                          {s.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatUsd(sf.budgetUsd)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatUsd(sf.eacUsd)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <SemaforoBadge status={sf.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Proveedores</h2>
        {ownSuppliers.length === 0 ? (
          <p className="text-sm text-slate-400">Sin proveedores asociados a este rubro.</p>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-100">
              {ownSuppliers.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-slate-700">{s.name}</span>
                  <span className="text-xs text-slate-400">{s.usual_currency}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Compromisos</h2>
        {ownCommitments.length === 0 ? (
          <p className="text-sm text-slate-400">Sin compromisos cargados en este rubro.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-3">Proveedor / Descripción</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Anticipo</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ownCommitments.map((c) => {
                  const pending = commitmentPending(
                    c.id,
                    c.total_amount,
                    c.advance_amount,
                    data.installmentsByCommitmentId
                  );
                  return (
                    <tr key={c.id}>
                      <td className="px-4 py-2.5">
                        <p className="text-slate-800">{c.description}</p>
                        <p className="text-xs text-slate-400">{supplierNameById.get(c.supplier_id) ?? "—"}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                        {formatAmount(c.total_amount, c.currency)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                        {formatAmount(c.advance_amount, c.currency)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                        {formatAmount(pending, c.currency)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{COMMITMENT_STATUS_LABELS[c.status]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Pagos</h2>
        {ownPayments.length === 0 ? (
          <p className="text-sm text-slate-400">Sin pagos registrados en este rubro.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Concepto</th>
                  <th className="px-4 py-3 text-right">Importe</th>
                  <th className="px-4 py-3">Medio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ownPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5 text-slate-600">{formatDate(p.date)}</td>
                    <td className="px-4 py-2.5 text-slate-800">{p.description}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                      {formatAmount(p.amount, p.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{PAYMENT_METHOD_LABELS[p.payment_method]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
