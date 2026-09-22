"use client";

import { useState } from "react";
import { formatAmount, formatDate, formatUsd, monthLabel } from "@/lib/finance";
import type { CashFlowRow } from "@/lib/finance/cashflow";
import type { CurrencyCode } from "@/lib/database.types";

export interface MonthDetail {
  payments: { id: string; description: string; categoryName: string; amount: number; amountUsd: number; currency: CurrencyCode }[];
  installments: { id: string; description: string; categoryName: string; dueDate: string; amount: number; currency: CurrencyCode }[];
  planEntries: { categoryName: string; amount: number; currency: CurrencyCode }[];
}

export function CashFlowTable({ rows, monthDetails }: { rows: CashFlowRow[]; monthDetails: Record<string, MonthDetail> }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
            <th className="px-4 py-3">Mes</th>
            <th className="px-4 py-3 text-right">Plan original</th>
            <th className="px-4 py-3 text-right">Forecast vigente</th>
            <th className="px-4 py-3 text-right">Real</th>
            <th className="px-4 py-3 text-right">Fondeo confirmado</th>
            <th className="px-4 py-3 text-right">Caja final</th>
            <th className="px-4 py-3 text-right">Gap</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">
                No hay datos de cash flow cargados.
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const isOpen = expanded === row.month;
              const detail = monthDetails[row.month];
              const hasDetail = detail && (detail.payments.length > 0 || detail.installments.length > 0 || detail.planEntries.length > 0);
              return (
                <>
                  <tr
                    key={row.month}
                    onClick={() => setExpanded(isOpen ? null : row.month)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      <span className="mr-1 inline-block w-3 text-slate-400">{isOpen ? "▾" : "▸"}</span>
                      {monthLabel(row.month)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{formatUsd(row.planUsd)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-blue-700">{formatUsd(row.forecastUsd)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-900">{formatUsd(row.actualUsd)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700">{formatUsd(row.confirmedFundingUsd)}</td>
                    <td
                      className={`px-4 py-2.5 text-right tabular-nums font-medium ${
                        row.cashBalanceUsd < 0 ? "text-red-600" : "text-slate-900"
                      }`}
                    >
                      {formatUsd(row.cashBalanceUsd)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-red-600">
                      {row.gapUsd < 0 ? formatUsd(row.gapUsd) : "—"}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${row.month}-detail`}>
                      <td colSpan={7} className="bg-slate-50 px-4 py-4">
                        {!hasDetail ? (
                          <p className="text-xs text-slate-400">Sin pagos, cuotas ni plan original en este mes.</p>
                        ) : (
                          <div className="grid gap-4 md:grid-cols-3">
                            <DetailList title="Pagos reales">
                              {detail.payments.map((p) => (
                                <li key={p.id} className="flex justify-between gap-2">
                                  <span className="text-slate-600">
                                    {p.description}
                                    <span className="block text-[11px] text-slate-400">{p.categoryName}</span>
                                  </span>
                                  <span className="whitespace-nowrap tabular-nums text-slate-800">
                                    {formatAmount(p.amount, p.currency)}
                                  </span>
                                </li>
                              ))}
                            </DetailList>
                            <DetailList title="Cuotas comprometidas">
                              {detail.installments.map((i) => (
                                <li key={i.id} className="flex justify-between gap-2">
                                  <span className="text-slate-600">
                                    {i.description}
                                    <span className="block text-[11px] text-slate-400">
                                      {i.categoryName} · vence {formatDate(i.dueDate)}
                                    </span>
                                  </span>
                                  <span className="whitespace-nowrap tabular-nums text-slate-800">
                                    {formatAmount(i.amount, i.currency)}
                                  </span>
                                </li>
                              ))}
                            </DetailList>
                            <DetailList title="Plan original (referencia)">
                              {detail.planEntries.map((e, idx) => (
                                <li key={idx} className="flex justify-between gap-2">
                                  <span className="text-slate-600">{e.categoryName}</span>
                                  <span className="whitespace-nowrap tabular-nums text-slate-800">
                                    {formatAmount(e.amount, e.currency)}
                                  </span>
                                </li>
                              ))}
                            </DetailList>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function DetailList({ title, children }: { title: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-slate-500">{title}</p>
      {hasChildren ? (
        <ul className="space-y-1 text-xs">{children}</ul>
      ) : (
        <p className="text-xs text-slate-400">—</p>
      )}
    </div>
  );
}
