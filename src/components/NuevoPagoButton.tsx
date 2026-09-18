"use client";

import { useMemo, useState, useTransition } from "react";
import { createPayment } from "@/lib/actions/payments";
import type { CurrencyCode, PaymentMethod, PaymentType } from "@/lib/database.types";

interface CategoryOption {
  id: string;
  name: string;
  parent_id: string | null;
}

interface SupplierOption {
  id: string;
  name: string;
}

interface CommitmentOption {
  id: string;
  description: string;
  supplier_id: string;
  category_id: string;
  currency: CurrencyCode;
}

interface InstallmentOption {
  id: string;
  due_date: string;
  amount: number;
  status: "pending" | "paid";
}

interface FundingSourceOption {
  id: string;
  name: string;
}

export interface NuevoPagoButtonProps {
  categories: CategoryOption[];
  suppliers: SupplierOption[];
  commitments: CommitmentOption[];
  installmentsByCommitment: Record<string, InstallmentOption[]>;
  fundingSources: FundingSourceOption[];
  defaultFxRate: number;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "transferencia_ars", label: "Transferencia ARS" },
  { value: "transferencia_usd", label: "Transferencia USD" },
  { value: "cash_ars", label: "Cash ARS" },
  { value: "cash_usd", label: "Cash USD" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "cheque", label: "Cheque" },
  { value: "otro", label: "Otro" },
];

const PAYMENT_TYPES: { value: PaymentType; label: string }[] = [
  { value: "anticipo", label: "Anticipo" },
  { value: "pago_parcial", label: "Pago parcial" },
  { value: "pago_final", label: "Pago final" },
  { value: "compra_directa", label: "Compra directa" },
  { value: "honorario", label: "Honorario" },
  { value: "impuesto", label: "Impuesto" },
  { value: "otro", label: "Otro" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function NuevoPagoButton(props: NuevoPagoButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 md:bottom-6 md:right-6"
      >
        + Nuevo pago
      </button>
      {open && <NuevoPagoModal {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function NuevoPagoModal(props: NuevoPagoButtonProps & { onClose: () => void }) {
  const { categories, suppliers, commitments, installmentsByCommitment, fundingSources, defaultFxRate, onClose } =
    props;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const rubros = useMemo(() => categories.filter((c) => c.parent_id === null), [categories]);
  const [rubroId, setRubroId] = useState(rubros[0]?.id ?? "");
  const subrubros = useMemo(() => categories.filter((c) => c.parent_id === rubroId), [categories, rubroId]);
  const [subrubroId, setSubrubroId] = useState("");

  const [supplierId, setSupplierId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [fxRate, setFxRate] = useState(String(defaultFxRate));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transferencia_usd");
  const [paymentType, setPaymentType] = useState<PaymentType>("pago_parcial");
  const [commitmentId, setCommitmentId] = useState("");
  const [installmentId, setInstallmentId] = useState("");
  const [fundingSourceId, setFundingSourceId] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayIso());

  const supplierCommitments = useMemo(
    () => commitments.filter((c) => !supplierId || c.supplier_id === supplierId),
    [commitments, supplierId]
  );
  const pendingInstallments = useMemo(
    () => (installmentsByCommitment[commitmentId] ?? []).filter((i) => i.status === "pending"),
    [installmentsByCommitment, commitmentId]
  );

  const categoryId = subrubroId || rubroId;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountNumber = Number(amount);
    const fxRateNumber = Number(fxRate);
    if (!categoryId || !description.trim() || !amountNumber || !fxRateNumber) {
      setError("Completá rubro, concepto, importe y tipo de cambio.");
      return;
    }
    startTransition(async () => {
      try {
        await createPayment({
          date,
          categoryId,
          supplierId: supplierId || null,
          description: description.trim(),
          amount: amountNumber,
          currency,
          fxRate: fxRateNumber,
          paymentMethod,
          paymentType,
          commitmentId: commitmentId || null,
          commitmentInstallmentId: installmentId || null,
          fundingSourceId: fundingSourceId || null,
          notes: notes.trim() || null,
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar el pago.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 md:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl md:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Nuevo pago</h2>
          <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600">
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
                required
              />
            </Field>
            <Field label="Importe">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input"
                placeholder="0.00"
                autoFocus
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Moneda">
              <select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)} className="input">
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </Field>
            <Field label="Tipo de cambio (ARS/USD)">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={fxRate}
                onChange={(e) => setFxRate(e.target.value)}
                className="input"
                required
              />
            </Field>
          </div>

          <Field label="Concepto">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              placeholder="Ej: Anticipo carpintería aluminio"
              required
            />
          </Field>

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

          <Field label="Proveedor (opcional)">
            <select
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value);
                setCommitmentId("");
                setInstallmentId("");
              }}
              className="input"
            >
              <option value="">Sin proveedor</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          {supplierCommitments.length > 0 && (
            <Field label="Asociar a compromiso (opcional)">
              <select
                value={commitmentId}
                onChange={(e) => {
                  setCommitmentId(e.target.value);
                  setInstallmentId("");
                }}
                className="input"
              >
                <option value="">No asociar</option>
                {supplierCommitments.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.description}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {commitmentId && pendingInstallments.length > 0 && (
            <Field label="Cuota que salda (opcional)">
              <select value={installmentId} onChange={(e) => setInstallmentId(e.target.value)} className="input">
                <option value="">No saldar ninguna cuota puntual</option>
                {pendingInstallments.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.due_date} — {i.amount.toLocaleString("es-AR")}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Medio de pago">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="input"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo de movimiento">
              <select value={paymentType} onChange={(e) => setPaymentType(e.target.value as PaymentType)} className="input">
                {PAYMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Fuente de fondos (opcional)">
            <select value={fundingSourceId} onChange={(e) => setFundingSourceId(e.target.value)} className="input">
              <option value="">Sin especificar</option>
              {fundingSources.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
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
            {isPending ? "Guardando..." : "Guardar pago"}
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
