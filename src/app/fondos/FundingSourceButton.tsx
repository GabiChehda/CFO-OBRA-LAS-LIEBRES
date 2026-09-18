"use client";

import { useState, useTransition } from "react";
import { createFundingSource, deleteFundingSource, updateFundingSource } from "./actions";
import type { CurrencyCode, FundingSource, FundingSourceStatus, FundingSourceType } from "@/lib/database.types";

const TYPE_OPTIONS: { value: FundingSourceType; label: string }[] = [
  { value: "caja_ahorro", label: "Caja de ahorro" },
  { value: "reserva_financiera", label: "Reserva financiera" },
  { value: "venta_activo", label: "Venta de activo" },
  { value: "prestamo", label: "Préstamo" },
  { value: "ingreso_futuro", label: "Ingreso futuro" },
  { value: "credito", label: "Crédito" },
  { value: "otro", label: "Otro" },
];

const STATUS_OPTIONS: { value: FundingSourceStatus; label: string }[] = [
  { value: "disponible", label: "Disponible" },
  { value: "confirmado_futuro", label: "Confirmado futuro" },
  { value: "potencial", label: "Potencial" },
  { value: "utilizado", label: "Utilizado" },
  { value: "cancelado", label: "Cancelado" },
];

export function FundingSourceButton({ source }: { source?: FundingSource }) {
  const [open, setOpen] = useState(false);
  const isEdit = !!source;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          isEdit
            ? "text-sm text-slate-500 hover:text-slate-700"
            : "rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        }
      >
        {isEdit ? "Editar" : "+ Fuente de fondeo"}
      </button>
      {open && <FundingSourceModal source={source} onClose={() => setOpen(false)} />}
    </>
  );
}

export function DeleteFundingSourceButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("¿Eliminar esta fuente de fondeo?")) return;
    startTransition(async () => {
      await deleteFundingSource(id);
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
    >
      {isPending ? "..." : "Eliminar"}
    </button>
  );
}

function FundingSourceModal({ source, onClose }: { source?: FundingSource; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(source?.name ?? "");
  const [type, setType] = useState<FundingSourceType>(source?.type ?? "caja_ahorro");
  const [currency, setCurrency] = useState<CurrencyCode>(source?.currency ?? "USD");
  const [totalAmount, setTotalAmount] = useState(source ? String(source.total_amount) : "");
  const [usedAmount, setUsedAmount] = useState(source ? String(source.used_amount) : "0");
  const [availableDate, setAvailableDate] = useState(source?.available_date ?? "");
  const [status, setStatus] = useState<FundingSourceStatus>(source?.status ?? "disponible");
  const [financialCost, setFinancialCost] = useState(source?.financial_cost ?? "");
  const [notes, setNotes] = useState(source?.notes ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const totalNumber = Number(totalAmount);
    const usedNumber = Number(usedAmount) || 0;
    if (!name.trim() || !totalNumber || totalNumber <= 0) {
      setError("Completá nombre y monto total.");
      return;
    }

    const input = {
      name: name.trim(),
      type,
      currency,
      totalAmount: totalNumber,
      usedAmount: usedNumber,
      availableDate: availableDate || null,
      status,
      financialCost: financialCost.trim() || null,
      notes: notes.trim() || null,
    };

    startTransition(async () => {
      try {
        if (source) {
          await updateFundingSource(source.id, input);
        } else {
          await createFundingSource(input);
        }
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar la fuente de fondeo.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 md:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl md:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            {source ? "Editar fuente de fondeo" : "Nueva fuente de fondeo"}
          </h2>
          <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600">
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Nombre">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Ej: Plazo fijo Banco X"
              autoFocus
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select value={type} onChange={(e) => setType(e.target.value as FundingSourceType)} className="input">
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estado">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FundingSourceStatus)}
                className="input"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto total">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="input"
                placeholder="0.00"
                required
              />
            </Field>
            <Field label="Moneda">
              <select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)} className="input">
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </Field>
          </div>

          <Field label="Monto usado">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={usedAmount}
              onChange={(e) => setUsedAmount(e.target.value)}
              className="input"
              placeholder="0.00"
            />
          </Field>

          <Field label="Fecha de disponibilidad (opcional)">
            <input
              type="date"
              value={availableDate}
              onChange={(e) => setAvailableDate(e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Costo financiero (opcional)">
            <input
              type="text"
              value={financialCost}
              onChange={(e) => setFinancialCost(e.target.value)}
              className="input"
              placeholder="Ej: TNA 45%"
            />
          </Field>

          <Field label="Observaciones (opcional)">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isPending ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
