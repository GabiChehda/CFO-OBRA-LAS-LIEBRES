"use client";

import { useTransition } from "react";
import { deletePayment } from "@/lib/actions/payments";
import { EditPagoButton } from "@/components/NuevoPagoButton";
import { formatAmount, formatDate } from "@/lib/finance";
import type { PaymentFormOptions } from "@/lib/paymentFormOptions";
import type { CurrencyCode, PaymentMethod, PaymentType } from "@/lib/database.types";

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

export interface PagoRow {
  id: string;
  date: string;
  categoryId: string;
  categoryName: string;
  supplierId: string | null;
  supplierName: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  fxRate: number;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  commitmentId: string | null;
  commitmentInstallmentId: string | null;
  fundingSourceId: string | null;
  notes: string | null;
}

export function PagosTable({ rows, formOptions }: { rows: PagoRow[]; formOptions: PaymentFormOptions }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar este pago? Queda archivado, no se borra del histórico.")) return;
    startTransition(async () => {
      await deletePayment(id);
    });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Concepto</th>
            <th className="px-4 py-3">Rubro</th>
            <th className="px-4 py-3">Proveedor</th>
            <th className="px-4 py-3 text-right">Importe</th>
            <th className="px-4 py-3">Medio / Tipo</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">
                Todavía no hay pagos cargados. Usá &ldquo;+ Nuevo pago&rdquo; para cargar el primero.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-600">{formatDate(row.date)}</td>
                <td className="px-4 py-2.5 text-slate-800">{row.description}</td>
                <td className="px-4 py-2.5 text-slate-600">{row.categoryName}</td>
                <td className="px-4 py-2.5 text-slate-600">{row.supplierName}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-800">
                  {formatAmount(row.amount, row.currency)}
                </td>
                <td className="px-4 py-2.5 text-slate-600">
                  {PAYMENT_METHOD_LABELS[row.paymentMethod]}
                  <span className="block text-[11px] text-slate-400">{PAYMENT_TYPE_LABELS[row.paymentType]}</span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-3">
                    <EditPagoButton
                      {...formOptions}
                      payment={{
                        id: row.id,
                        date: row.date,
                        categoryId: row.categoryId,
                        supplierId: row.supplierId,
                        description: row.description,
                        amount: row.amount,
                        currency: row.currency,
                        fxRate: row.fxRate,
                        paymentMethod: row.paymentMethod,
                        paymentType: row.paymentType,
                        commitmentId: row.commitmentId,
                        commitmentInstallmentId: row.commitmentInstallmentId,
                        fundingSourceId: row.fundingSourceId,
                        notes: row.notes,
                      }}
                    />
                    <button
                      onClick={() => handleDelete(row.id)}
                      disabled={isPending}
                      className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
