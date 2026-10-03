"use client";

import { useMemo, useState, useTransition } from "react";
import { deletePayment } from "@/lib/actions/payments";
import { EditPagoButton } from "@/components/NuevoPagoButton";
import { formatAmount, formatDate, formatUsd } from "@/lib/finance";
import type { PaymentFormOptions } from "@/lib/paymentFormOptions";
import type { CurrencyCode, Payment, PaymentMethod, PaymentType } from "@/lib/database.types";

interface Option {
  id: string;
  name: string;
}

export interface MovimientosTableProps {
  payments: Payment[];
  categories: Option[];
  suppliers: Option[];
  fundingSources: Option[];
  formOptions: PaymentFormOptions;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transferencia_ars: "Transferencia ARS",
  transferencia_usd: "Transferencia USD",
  cash_ars: "Cash ARS",
  cash_usd: "Cash USD",
  tarjeta: "Tarjeta",
  cheque: "Cheque",
  otro: "Otro",
};

const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  anticipo: "Anticipo",
  pago_parcial: "Pago parcial",
  pago_final: "Pago final",
  compra_directa: "Compra directa",
  honorario: "Honorario",
  impuesto: "Impuesto",
  otro: "Otro",
};

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function MovimientosTable({ payments, categories, suppliers, fundingSources, formOptions }: MovimientosTableProps) {
  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const supplierName = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);
  const fundingSourceName = useMemo(() => new Map(fundingSources.map((f) => [f.id, f.name])), [fundingSources]);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode | "">("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [fundingSourceId, setFundingSourceId] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (dateFrom && p.date < dateFrom) return false;
      if (dateTo && p.date > dateTo) return false;
      if (categoryId && p.category_id !== categoryId) return false;
      if (supplierId && p.supplier_id !== supplierId) return false;
      if (currency && p.currency !== currency) return false;
      if (paymentMethod && p.payment_method !== paymentMethod) return false;
      if (fundingSourceId && p.funding_source_id !== fundingSourceId) return false;
      return true;
    });
  }, [payments, dateFrom, dateTo, categoryId, supplierId, currency, paymentMethod, fundingSourceId]);

  function handleDelete(paymentId: string) {
    if (!confirm("¿Eliminar este movimiento? Esta acción no se puede deshacer desde la interfaz.")) return;
    setDeletingId(paymentId);
    startTransition(async () => {
      try {
        await deletePayment(paymentId);
      } finally {
        setDeletingId(null);
      }
    });
  }

  function handleExportCsv() {
    const header = [
      "Fecha",
      "Concepto",
      "Proveedor",
      "Rubro",
      "Medio de pago",
      "Tipo",
      "Moneda",
      "Importe",
      "USD equivalente",
      "Fuente de fondos",
    ];
    const rows = filtered.map((p) => [
      formatDate(p.date),
      p.description,
      p.supplier_id ? supplierName.get(p.supplier_id) ?? "" : "",
      categoryName.get(p.category_id) ?? "",
      PAYMENT_METHOD_LABELS[p.payment_method],
      PAYMENT_TYPE_LABELS[p.payment_type],
      p.currency,
      String(p.amount),
      String(p.amount_usd.toFixed(2)),
      p.funding_source_id ? fundingSourceName.get(p.funding_source_id) ?? "" : "",
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `movimientos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Filtros</h2>
          <button
            onClick={handleExportCsv}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Exportar CSV
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Desde</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Hasta</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Rubro</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
              <option value="">Todos</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Proveedor</span>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input">
              <option value="">Todos</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Moneda</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode | "")} className="input">
              <option value="">Todas</option>
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Medio de pago</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod | "")}
              className="input"
            >
              <option value="">Todos</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Fuente de fondos</span>
            <select value={fundingSourceId} onChange={(e) => setFundingSourceId(e.target.value)} className="input">
              <option value="">Todas</option>
              {fundingSources.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Concepto</th>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Rubro</th>
              <th className="px-4 py-3">Medio de pago</th>
              <th className="px-4 py-3">Moneda</th>
              <th className="px-4 py-3 text-right">Importe</th>
              <th className="px-4 py-3 text-right">USD equivalente</th>
              <th className="px-4 py-3">Fuente de fondos</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-700">{formatDate(p.date)}</td>
                <td className="px-4 py-2.5 text-slate-700">
                  {p.description}
                  <span className="ml-2 text-xs text-slate-400">{PAYMENT_TYPE_LABELS[p.payment_type]}</span>
                </td>
                <td className="px-4 py-2.5 text-slate-700">
                  {p.supplier_id ? supplierName.get(p.supplier_id) ?? "—" : "—"}
                </td>
                <td className="px-4 py-2.5 text-slate-700">{categoryName.get(p.category_id) ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-700">{PAYMENT_METHOD_LABELS[p.payment_method]}</td>
                <td className="px-4 py-2.5 text-slate-700">{p.currency}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                  {formatAmount(p.amount, p.currency)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatUsd(p.amount_usd)}</td>
                <td className="px-4 py-2.5 text-slate-700">
                  {p.funding_source_id ? fundingSourceName.get(p.funding_source_id) ?? "—" : "—"}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <EditPagoButton
                      {...formOptions}
                      payment={{
                        id: p.id,
                        date: p.date,
                        categoryId: p.category_id,
                        supplierId: p.supplier_id,
                        description: p.description,
                        amount: p.amount,
                        currency: p.currency,
                        fxRate: p.fx_rate,
                        paymentMethod: p.payment_method,
                        paymentType: p.payment_type,
                        commitmentId: p.commitment_id,
                        commitmentInstallmentId: p.commitment_installment_id,
                        fundingSourceId: p.funding_source_id,
                        notes: p.notes,
                      }}
                    />
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={isPending && deletingId === p.id}
                      className="text-sm text-slate-500 hover:text-red-600 disabled:opacity-50"
                    >
                      {isPending && deletingId === p.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-sm text-slate-400">
                  No hay movimientos que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
