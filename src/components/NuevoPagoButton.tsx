"use client";

import { useMemo, useState, useTransition } from "react";
import { createPayment, updatePayment, type CreatePaymentInput } from "@/lib/actions/payments";
import { createSupplier } from "@/app/proveedores/actions";
import type { PaymentFormOptions } from "@/lib/paymentFormOptions";
import type { CurrencyCode, PaymentMethod, PaymentType } from "@/lib/database.types";

const NEW_SUPPLIER = "__new__";

export interface PaymentRecord {
  id: string;
  date: string;
  categoryId: string;
  supplierId: string | null;
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

export function NuevoPagoButton(props: PaymentFormOptions) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 md:bottom-6 md:right-6"
      >
        + Nuevo pago
      </button>
      {open && <PagoModal {...props} mode="create" onClose={() => setOpen(false)} />}
    </>
  );
}

export function EditPagoButton(props: PaymentFormOptions & { payment: PaymentRecord }) {
  const [open, setOpen] = useState(false);
  const { payment, ...options } = props;

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs text-slate-400 hover:text-slate-700">
        Editar
      </button>
      {open && <PagoModal {...options} mode="edit" initial={payment} onClose={() => setOpen(false)} />}
    </>
  );
}

function PagoModal(
  props: PaymentFormOptions & { onClose: () => void } & (
      | { mode: "create"; initial?: undefined }
      | { mode: "edit"; initial: PaymentRecord }
    )
) {
  const { categories, suppliers, commitments, installmentsByCommitment, fundingSources, defaultFxRate, onClose, mode, initial } =
    props;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const rubros = useMemo(() => categories.filter((c) => c.parent_id === null), [categories]);
  const initialRubro = useMemo(() => {
    if (!initial) return rubros[0]?.id ?? "";
    const own = categories.find((c) => c.id === initial.categoryId);
    return own?.parent_id ?? initial.categoryId;
  }, [initial, categories, rubros]);
  const initialSubrubro = useMemo(() => {
    if (!initial) return "";
    const own = categories.find((c) => c.id === initial.categoryId);
    return own?.parent_id ? initial.categoryId : "";
  }, [initial, categories]);

  const [rubroId, setRubroId] = useState(initialRubro);
  const subrubros = useMemo(() => categories.filter((c) => c.parent_id === rubroId), [categories, rubroId]);
  const [subrubroId, setSubrubroId] = useState(initialSubrubro);

  const [supplierId, setSupplierId] = useState(initial?.supplierId ?? "");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierCurrency, setNewSupplierCurrency] = useState<CurrencyCode>("USD");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [currency, setCurrency] = useState<CurrencyCode>(initial?.currency ?? "USD");
  const [fxRate, setFxRate] = useState(String(initial?.fxRate ?? defaultFxRate));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initial?.paymentMethod ?? "transferencia_usd");
  const [paymentType, setPaymentType] = useState<PaymentType>(initial?.paymentType ?? "pago_parcial");
  const [commitmentId, setCommitmentId] = useState(initial?.commitmentId ?? "");
  const [installmentId, setInstallmentId] = useState(initial?.commitmentInstallmentId ?? "");
  const [fundingSourceId, setFundingSourceId] = useState(initial?.fundingSourceId ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [date, setDate] = useState(initial?.date ?? todayIso());

  const supplierCommitments = useMemo(
    () => commitments.filter((c) => !supplierId || supplierId === NEW_SUPPLIER || c.supplier_id === supplierId),
    [commitments, supplierId]
  );
  const pendingInstallments = useMemo(() => {
    const list = installmentsByCommitment[commitmentId] ?? [];
    // La cuota que este pago ya saldó queda marcada "paid" — igual debe
    // seguir apareciendo en el combo al editar, si no, la selección actual
    // desaparece de las opciones.
    return list.filter((i) => i.status === "pending" || i.id === initial?.commitmentInstallmentId);
  }, [installmentsByCommitment, commitmentId, initial]);

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
    if (supplierId === NEW_SUPPLIER && !newSupplierName.trim()) {
      setError("Ingresá el nombre del nuevo proveedor.");
      return;
    }

    startTransition(async () => {
      try {
        let finalSupplierId: string | null = supplierId || null;
        if (supplierId === NEW_SUPPLIER) {
          const created = await createSupplier({ name: newSupplierName.trim(), usualCurrency: newSupplierCurrency });
          finalSupplierId = created.id;
        }

        const payload: CreatePaymentInput = {
          date,
          categoryId,
          supplierId: finalSupplierId,
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
        };

        if (mode === "edit") {
          await updatePayment(initial.id, payload);
        } else {
          await createPayment(payload);
        }
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
          <h2 className="text-base font-semibold text-slate-900">{mode === "edit" ? "Editar pago" : "Nuevo pago"}</h2>
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
              <option value={NEW_SUPPLIER}>+ Nuevo proveedor...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          {supplierId === NEW_SUPPLIER && (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
              <Field label="Nombre del proveedor">
                <input
                  type="text"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="input"
                  placeholder="Ej: Carpintería Pérez"
                  required
                />
              </Field>
              <Field label="Moneda habitual">
                <select
                  value={newSupplierCurrency}
                  onChange={(e) => setNewSupplierCurrency(e.target.value as CurrencyCode)}
                  className="input"
                >
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </Field>
            </div>
          )}

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
            {isPending ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Guardar pago"}
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
