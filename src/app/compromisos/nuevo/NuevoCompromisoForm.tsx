"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCommitment } from "../actions";
import type { CurrencyCode } from "@/lib/database.types";

interface SupplierOption {
  id: string;
  name: string;
}

interface CategoryOption {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface NuevoCompromisoFormProps {
  suppliers: SupplierOption[];
  categories: CategoryOption[];
}

interface InstallmentRow {
  dueDate: string;
  amount: string;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function NuevoCompromisoForm({ suppliers, categories }: NuevoCompromisoFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rubros = useMemo(() => categories.filter((c) => c.parent_id === null), [categories]);
  const [rubroId, setRubroId] = useState(rubros[0]?.id ?? "");
  const subrubros = useMemo(() => categories.filter((c) => c.parent_id === rubroId), [categories, rubroId]);
  const [subrubroId, setSubrubroId] = useState("");

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [contractDate, setContractDate] = useState(todayIso());
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [totalAmount, setTotalAmount] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("0");
  const [installmentCount, setInstallmentCount] = useState("0");
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");

  const categoryId = subrubroId || rubroId;

  function regenerateInstallments(count: number) {
    if (count <= 0) {
      setInstallments([]);
      return;
    }
    const total = Number(totalAmount) || 0;
    const advance = Number(advanceAmount) || 0;
    const remaining = Math.max(total - advance, 0);
    const base = Math.floor((remaining / count) * 100) / 100;
    const rows: InstallmentRow[] = [];
    let assigned = 0;
    for (let i = 0; i < count; i++) {
      const isLast = i === count - 1;
      const amount = isLast ? Math.round((remaining - assigned) * 100) / 100 : base;
      assigned += amount;
      rows.push({ dueDate: addDays(contractDate, 30 * (i + 1)), amount: amount.toFixed(2) });
    }
    setInstallments(rows);
  }

  function handleCountChange(value: string) {
    setInstallmentCount(value);
    const count = Math.max(0, Math.min(60, Math.round(Number(value) || 0)));
    regenerateInstallments(count);
  }

  function updateInstallment(index: number, field: "dueDate" | "amount", value: string) {
    setInstallments((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const total = Number(totalAmount);
    const advance = Number(advanceAmount) || 0;
    if (!supplierId || !categoryId || !description.trim() || !contractDate || !total) {
      setError("Completá proveedor, rubro, descripción, fecha e importe total.");
      return;
    }
    if (installments.some((row) => !row.dueDate || !Number(row.amount))) {
      setError("Completá fecha e importe en todas las cuotas.");
      return;
    }
    setIsPending(true);
    try {
      await createCommitment({
        supplierId,
        categoryId,
        description: description.trim(),
        contractDate,
        currency,
        totalAmount: total,
        advanceAmount: advance,
        paymentTerms: paymentTerms.trim() || null,
        notes: notes.trim() || null,
        installments: installments.map((row) => ({ dueDate: row.dueDate, amount: Number(row.amount) })),
      });
      router.push("/compromisos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el compromiso.");
      setIsPending(false);
    }
  }

  if (suppliers.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
        Todavía no hay proveedores cargados. Creá uno primero en{" "}
        <Link href="/proveedores" className="font-medium text-slate-900 hover:underline">
          Proveedores
        </Link>
        .
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Proveedor">
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input">
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fecha de contratación">
          <input
            type="date"
            value={contractDate}
            onChange={(e) => setContractDate(e.target.value)}
            className="input"
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Rubro">
          <select
            value={rubroId}
            onChange={(e) => {
              setRubroId(e.target.value);
              setSubrubroId("");
            }}
            className="input"
          >
            {rubros.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Subrubro">
          <select
            value={subrubroId}
            onChange={(e) => setSubrubroId(e.target.value)}
            className="input"
            disabled={subrubros.length === 0}
          >
            <option value="">{subrubros.length === 0 ? "—" : "General"}</option>
            {subrubros.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Descripción">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
          placeholder="Ej: Carpintería de aluminio - contrato"
          required
        />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Moneda">
          <select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)} className="input">
            <option value="USD">USD</option>
            <option value="ARS">ARS</option>
          </select>
        </Field>
        <Field label="Importe total contratado">
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
        <Field label="Anticipo">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(e.target.value)}
            className="input"
            placeholder="0.00"
          />
        </Field>
      </div>

      <Field label="Cantidad de cuotas (0 si todavía no hay calendario de pagos)">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={60}
          step={1}
          value={installmentCount}
          onChange={(e) => handleCountChange(e.target.value)}
          className="input"
        />
      </Field>

      {installments.length > 0 && (
        <div className="space-y-2 rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-medium text-slate-500">Cuotas</p>
          {installments.map((row, idx) => (
            <div key={idx} className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
              <span className="text-xs text-slate-400">#{idx + 1}</span>
              <input
                type="date"
                value={row.dueDate}
                onChange={(e) => updateInstallment(idx, "dueDate", e.target.value)}
                className="input"
                required
              />
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={row.amount}
                onChange={(e) => updateInstallment(idx, "amount", e.target.value)}
                className="input"
                required
              />
            </div>
          ))}
        </div>
      )}

      <Field label="Forma de pago (opcional)">
        <input
          type="text"
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.target.value)}
          className="input"
          placeholder="Ej: 30% anticipo, saldo contra entrega"
        />
      </Field>

      <Field label="Observaciones (opcional)">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} />
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isPending ? "Guardando..." : "Guardar compromiso"}
      </button>
    </form>
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
