import type { CurrencyCode } from "@/lib/database.types";

/** ARS→USD usa el fx_rate provisto (histórico si es un pago ya registrado, de
 * referencia si es un monto pendiente/presupuestado — ver sección 3 del PRD). */
export function toUsd(amount: number, currency: CurrencyCode, fxRate: number): number {
  return currency === "USD" ? amount : amount / fxRate;
}

export function toArs(amount: number, currency: CurrencyCode, fxRate: number): number {
  return currency === "ARS" ? amount : amount * fxRate;
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatArs(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatAmount(amount: number, currency: CurrencyCode): string {
  return currency === "USD" ? formatUsd(amount) : formatArs(amount);
}

export function formatPct(value: number, digits = 1): string {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(digits)}%`;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function monthLabel(monthIso: string): string {
  const [y, m] = monthIso.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, 1));
  const label = date.toLocaleDateString("es-AR", { month: "short", year: "2-digit", timeZone: "UTC" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
