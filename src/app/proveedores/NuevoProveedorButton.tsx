"use client";

import { useMemo, useState } from "react";
import { createSupplier } from "./actions";
import type { CurrencyCode } from "@/lib/database.types";

interface CategoryOption {
  id: string;
  name: string;
  parent_id: string | null;
}

export function NuevoProveedorButton({ categories }: { categories: CategoryOption[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      >
        + Proveedor
      </button>
      {open && <NuevoProveedorModal categories={categories} onClose={() => setOpen(false)} />}
    </>
  );
}

function categoryLabel(c: CategoryOption, byId: Map<string, CategoryOption>): string {
  if (!c.parent_id) return c.name;
  const parent = byId.get(c.parent_id);
  return parent ? `${parent.name} — ${c.name}` : c.name;
}

function NuevoProveedorModal({ categories, onClose }: { categories: CategoryOption[]; onClose: () => void }) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => categoryLabel(a, byId).localeCompare(categoryLabel(b, byId))),
    [categories, byId]
  );

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [usualCurrency, setUsualCurrency] = useState<CurrencyCode>("USD");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Completá el nombre del proveedor.");
      return;
    }
    setIsPending(true);
    try {
      await createSupplier({
        name: name.trim(),
        categoryId: categoryId || null,
        contactName: contactName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        usualCurrency,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el proveedor.");
      setIsPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 md:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl md:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Nuevo proveedor</h2>
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
              autoFocus
              required
            />
          </Field>

          <Field label="Rubro habitual (opcional)">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
              <option value="">Sin rubro</option>
              {sortedCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {categoryLabel(c, byId)}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Contacto (opcional)">
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Moneda habitual">
              <select
                value={usualCurrency}
                onChange={(e) => setUsualCurrency(e.target.value as CurrencyCode)}
                className="input"
              >
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono (opcional)">
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
            </Field>
            <Field label="Email (opcional)">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
            </Field>
          </div>

          <Field label="Notas (opcional)">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isPending ? "Guardando..." : "Guardar proveedor"}
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
