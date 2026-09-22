import type { FundingSource } from "@/lib/database.types";
import { toUsd } from "./currency";

export interface FundingSummary {
  /** "Disponible" — ya es líquido hoy, entra como caja inicial, no como ingreso mensual. */
  cashOnHandUsd: number;
  /** "Confirmado futuro" — entra en su fecha prevista. */
  confirmedFutureUsd: number;
  /** "Potencial" — escenario alternativo, nunca forma parte de la caja base. */
  potentialUsd: number;
  /** EAC total - Pagado total (pendiente de ejecutar de toda la obra). */
  pendingOfObraUsd: number;
  /** Parte de lo pendiente ya atada a un compromiso con cuotas. */
  committedPendingUsd: number;
  /** Parte de lo pendiente que todavía no tiene ni presupuesto comprometido. */
  uncommittedPendingUsd: number;
  /** cashOnHand + confirmedFuture - pendingOfObra: negativo = déficit. */
  baseGapUsd: number;
  /** baseGap + potentialUsd: qué tan cubierto queda el proyecto si se concreta lo potencial. */
  gapWithPotentialUsd: number;
}

function remainingUsd(source: FundingSource, refFxRate: number): number {
  return toUsd(source.total_amount - source.used_amount, source.currency, refFxRate);
}

export function computeFundingSummary(
  fundingSources: FundingSource[],
  pendingOfObraUsd: number,
  committedPendingUsd: number,
  refFxRate: number
): FundingSummary {
  const active = fundingSources.filter((f) => !f.deleted_at);

  const cashOnHandUsd = active
    .filter((f) => f.status === "disponible")
    .reduce((sum, f) => sum + remainingUsd(f, refFxRate), 0);
  const confirmedFutureUsd = active
    .filter((f) => f.status === "confirmado_futuro")
    .reduce((sum, f) => sum + remainingUsd(f, refFxRate), 0);
  const potentialUsd = active
    .filter((f) => f.status === "potencial")
    .reduce((sum, f) => sum + remainingUsd(f, refFxRate), 0);

  const uncommittedPendingUsd = Math.max(pendingOfObraUsd - committedPendingUsd, 0);
  const baseGapUsd = cashOnHandUsd + confirmedFutureUsd - pendingOfObraUsd;
  const gapWithPotentialUsd = baseGapUsd + potentialUsd;

  return {
    cashOnHandUsd,
    confirmedFutureUsd,
    potentialUsd,
    pendingOfObraUsd,
    committedPendingUsd,
    uncommittedPendingUsd,
    baseGapUsd,
    gapWithPotentialUsd,
  };
}
