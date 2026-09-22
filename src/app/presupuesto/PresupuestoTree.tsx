"use client";

import Link from "next/link";
import { useState } from "react";
import { buildChildrenIndex, formatPct, formatUsd, type CategoryFinancials } from "@/lib/finance";
import { SemaforoBadge } from "@/components/Kpi";
import type { Category } from "@/lib/database.types";

const DEVIATION_COLOR = {
  green: "text-emerald-600",
  yellow: "text-amber-600",
  red: "text-red-600",
  none: "text-slate-400",
};

export function PresupuestoTree({
  categories,
  financials,
}: {
  categories: Category[];
  financials: Record<string, CategoryFinancials>;
}) {
  const childrenByParent = buildChildrenIndex(categories);
  const roots = childrenByParent.get(null) ?? [];
  // Default: sólo grandes rubros a la vista, click para desplegar subrubros.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
            <th className="px-4 py-3">Rubro / Subrubro</th>
            <th className="px-4 py-3 text-right">Presupuesto</th>
            <th className="px-4 py-3 text-right">Comprometido</th>
            <th className="px-4 py-3 text-right">Pagado</th>
            <th className="px-4 py-3 text-right">Comprometido pendiente</th>
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
              expanded={expanded}
              onToggle={toggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategoryRows({
  category,
  depth,
  childrenByParent,
  financials,
  expanded,
  onToggle,
}: {
  category: Category;
  depth: number;
  childrenByParent: Map<string | null, Category[]>;
  financials: Record<string, CategoryFinancials>;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const f = financials[category.id];
  const children = childrenByParent.get(category.id) ?? [];
  const hasChildren = children.length > 0;
  const isOpen = expanded.has(category.id);
  if (!f) return null;

  return (
    <>
      <tr className={hasChildren ? "cursor-pointer hover:bg-slate-50" : "hover:bg-slate-50"} onClick={hasChildren ? () => onToggle(category.id) : undefined}>
        <td className="px-4 py-2.5" style={{ paddingLeft: `${16 + depth * 20}px` }}>
          {hasChildren && <span className="mr-1 inline-block w-3 text-slate-400">{isOpen ? "▾" : "▸"}</span>}
          <Link
            href={`/presupuesto/${category.id}`}
            onClick={(e) => e.stopPropagation()}
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
      {isOpen &&
        children.map((child) => (
          <CategoryRows
            key={child.id}
            category={child}
            depth={depth + 1}
            childrenByParent={childrenByParent}
            financials={financials}
            expanded={expanded}
            onToggle={onToggle}
          />
        ))}
    </>
  );
}
