import type { Commitment } from "@/lib/database.types";

export { commitmentPendingUsd } from "@/lib/finance";

export function isSinCalendario(commitment: Commitment, hasSchedule: boolean): boolean {
  return !hasSchedule && commitment.total_amount - commitment.advance_amount > 0;
}

export const STATUS_LABELS: Record<Commitment["status"], string> = {
  active: "Activo",
  completed: "Completado",
  cancelled: "Cancelado",
};

export const STATUS_STYLES: Record<Commitment["status"], string> = {
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
};
