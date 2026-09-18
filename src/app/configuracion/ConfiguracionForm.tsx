"use client";

import { useState, useTransition } from "react";
import { updateProjectSettings } from "./actions";
import type { Project } from "@/lib/database.types";

export function ConfiguracionForm({ project }: { project: Project }) {
  const [name, setName] = useState(project.name);
  const [startDate, setStartDate] = useState(project.start_date ?? "");
  const [expectedEndDate, setExpectedEndDate] = useState(project.expected_end_date ?? "");
  const [currentFxRate, setCurrentFxRate] = useState(String(project.current_fx_rate));
  const [deviationThreshold, setDeviationThreshold] = useState(String(project.deviation_alert_threshold_pct));
  const [contingencyPct, setContingencyPct] = useState(String(project.contingency_pct));
  const [notes, setNotes] = useState(project.notes ?? "");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const fxRateNumber = Number(currentFxRate);
    const deviationNumber = Number(deviationThreshold);
    const contingencyNumber = Number(contingencyPct);
    if (!name.trim() || !fxRateNumber || Number.isNaN(deviationNumber) || Number.isNaN(contingencyNumber)) {
      setError("Revisá los campos: nombre, tipo de cambio, umbral de desvío y % de contingencia son obligatorios.");
      return;
    }

    startTransition(async () => {
      try {
        await updateProjectSettings(project.id, {
          name: name.trim(),
          start_date: startDate || null,
          expected_end_date: expectedEndDate || null,
          current_fx_rate: fxRateNumber,
          deviation_alert_threshold_pct: deviationNumber,
          contingency_pct: contingencyNumber,
          notes: notes.trim() || null,
        });
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar la configuración.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-700">Datos de la obra</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Nombre">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" required />
          </Field>
          <Field label="Fecha de inicio">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
          </Field>
          <Field label="Fecha estimada de fin">
            <input
              type="date"
              value={expectedEndDate}
              onChange={(e) => setExpectedEndDate(e.target.value)}
              className="input"
            />
          </Field>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700">Parámetros financieros</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field
            label="Tipo de cambio de referencia actual"
            hint="Se usa solo para valuar montos pendientes y proyectados. Los pagos ya registrados mantienen su propio tipo de cambio histórico."
          >
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={currentFxRate}
              onChange={(e) => setCurrentFxRate(e.target.value)}
              className="input"
              required
            />
          </Field>
          <Field label="Umbral de alerta de desvío (%)" hint="A partir de qué % de desvío un rubro pasa a alerta roja.">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={deviationThreshold}
              onChange={(e) => setDeviationThreshold(e.target.value)}
              className="input"
              required
            />
          </Field>
          <Field label="% de contingencia de obra" hint="Porcentaje reservado sobre el presupuesto para imprevistos.">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={contingencyPct}
              onChange={(e) => setContingencyPct(e.target.value)}
              className="input"
              required
            />
          </Field>
        </div>
      </div>

      <Field label="Observaciones (opcional)">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={3} />
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !error && <p className="text-sm text-emerald-600">Configuración guardada.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isPending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}
