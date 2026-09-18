"use client";

import { useState, useTransition } from "react";
import { updateCategoryBudget } from "./actions";
import type { CurrencyCode } from "@/lib/database.types";

export function EditBudgetForm({
  categoryId,
  initialBudgetAmount,
  initialBudgetCurrency,
  initialOverride,
}: {
  categoryId: string;
  initialBudgetAmount: number;
  initialBudgetCurrency: CurrencyCode;
  initialOverride: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [budgetAmount, setBudgetAmount] = useState(String(initialBudgetAmount));
  const [budgetCurrency, setBudgetCurrency] = useState<CurrencyCode>(initialBudgetCurrency);
  const [useOverride, setUseOverride] = useState(initialOverride != null);
  const [overrideAmount, setOverrideAmount] = useState(initialOverride != null ? String(initialOverride) : "");

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-slate-500 hover:text-slate-700">
        Editar presupuesto
      </button>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountNumber = Number(budgetAmount);
    if (!amountNumber || amountNumber <= 0) {
      setError("Ingresá un presupuesto válido.");
      return;
    }
    const overrideNumber = useOverride ? Number(overrideAmount) : null;
    if (useOverride && (!overrideNumber || overrideNumber <= 0)) {
      setError("Ingresá un estimado final manual válido, o desmarcá el override.");
      return;
    }
    startTransition(async () => {
      try {
        await updateCategoryBudget(categoryId, {
          budgetAmount: amountNumber,
          budgetCurrency,
          estimatedFinalOverride: overrideNumber,
        });
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar el presupuesto.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Editar presupuesto</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-400 hover:text-slate-600">
          Cancelar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Presupuesto</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={budgetAmount}
            onChange={(e) => setBudgetAmount(e.target.value)}
            className="input"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Moneda</span>
          <select
            value={budgetCurrency}
            onChange={(e) => setBudgetCurrency(e.target.value as CurrencyCode)}
            className="input"
          >
            <option value="USD">USD</option>
            <option value="ARS">ARS</option>
          </select>
        </label>
      </div>

      <div className="space-y-2 rounded-lg bg-slate-50 p-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={useOverride}
            onChange={(e) => setUseOverride(e.target.checked)}
          />
          Forzar estimado final manualmente (override)
        </label>
        <p className="text-xs text-slate-400">
          Por defecto el estimado final se calcula automáticamente (pagado + saldo pendiente + presupuesto no
          comprometido). Activá esto sólo si necesitás reemplazar ese cálculo con un número propio.
        </p>
        {useOverride && (
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={overrideAmount}
            onChange={(e) => setOverrideAmount(e.target.value)}
            className="input"
            placeholder="Estimado final (USD)"
          />
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isPending ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
