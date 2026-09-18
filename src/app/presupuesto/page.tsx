import Link from "next/link";
import { loadProjectData } from "@/lib/data";
import {
  buildChildrenIndex,
  computeAllCategoryFinancials,
  computeProjectSummary,
  formatUsd,
  formatPct,
  type CategoryFinancials,
} from "@/lib/finance";
import { KpiCard, SemaforoBadge } from "@/components/Kpi";
import type { Category } from "@/lib/database.types";

const DEVIATION_COLOR = {
  green: "text-emerald-600",
  yellow: "text-amber-600",
  red: "text-red-600",
};

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

  const childrenByParent = buildChildrenIndex(data.categories);
  const roots = childrenByParent.get(null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Presupuesto</h1>
        <p className="text-sm text-slate-500">Presupuesto vs. comprometido, pagado y estimado final por rubro</p>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Presupuesto total" value={formatUsd(summary.budgetUsd)} />
        <KpiCard label="Estimado final" value={formatUsd(summary.eacUsd)} />
        <KpiCard label="Comprometido" value={formatUsd(summary.committedUsd)} />
        <KpiCard label="Pagado" value={formatUsd(summary.paidUsd)} />
        <KpiCard
          label="Saldo por pagar"
          value={formatUsd(summary.pendingBalanceUsd)}
          sublabel={summary.deviationPct !== null ? `Desvío ${formatPct(summary.deviationPct)}` : undefined}
          tone={summary.deviationUsd > 0 ? "negative" : "positive"}
        />
      </section>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-3">Rubro / Subrubro</th>
              <th className="px-4 py-3 text-right">Presupuesto</th>
              <th className="px-4 py-3 text-right">Comprometido</th>
              <th className="px-4 py-3 text-right">Pagado</th>
              <th className="px-4 py-3 text-right">Saldo</th>
              <th className="px-4 py-3 text-right">Estimado final</th>
              <th className="px-4 py-3 text-right">Desvío</th>
              <th className="px-4 py-3 text-center">Semáforo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {roots.map((root) => (
              <CategoryRows
                key={root.id}
                category={root}
                depth={0}
                childrenByParent={childrenByParent}
                financials={financials}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoryRows({
  category,
  depth,
  childrenByParent,
  financials,
}: {
  category: Category;
  depth: number;
  childrenByParent: Map<string | null, Category[]>;
  financials: Map<string, CategoryFinancials>;
}) {
  const f = financials.get(category.id);
  const children = childrenByParent.get(category.id) ?? [];
  if (!f) return null;

  return (
    <>
      <tr className="hover:bg-slate-50">
        <td className="px-4 py-2.5" style={{ paddingLeft: `${16 + depth * 20}px` }}>
          <Link
            href={`/presupuesto/${category.id}`}
            className={depth === 0 ? "font-semibold text-slate-900" : "text-slate-700"}
          >
            {category.name}
          </Link>
        </td>
        <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatUsd(f.budgetUsd)}</td>
        <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatUsd(f.committedUsd)}</td>
        <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatUsd(f.paidUsd)}</td>
        <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatUsd(f.pendingBalanceUsd)}</td>
        <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatUsd(f.eacUsd)}</td>
        <td className={`px-4 py-2.5 text-right tabular-nums ${DEVIATION_COLOR[f.status]}`}>
          {formatUsd(f.deviationUsd)}
          {f.deviationPct !== null && <span className="ml-1 text-xs">({formatPct(f.deviationPct)})</span>}
        </td>
        <td className="px-4 py-2.5 text-center">
          <SemaforoBadge status={f.status} />
        </td>
      </tr>
      {children.map((child) => (
        <CategoryRows
          key={child.id}
          category={child}
          depth={depth + 1}
          childrenByParent={childrenByParent}
          financials={financials}
        />
      ))}
    </>
  );
}
