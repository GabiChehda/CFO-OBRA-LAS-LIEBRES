import type { FundingSource } from "@/lib/database.types";
import { toUsd } from "./currency";

export interface FundingSummary {
  availableTodayUsd: number;
  confirmedFutureUsd: number;
  potentialUsd: number;
  totalFundingUsd: number;
  futureNeedUsd: number;
  gapUsd: number;
}

function remainingUsd(source: FundingSource, refFxRate: number): number {
  return toUsd(source.total_amount - source.used_amount, source.currency, refFxRate);
}

export function computeFundingSummary(
  fundingSources: FundingSource[],
  /** Suma de saldos pendientes por compromisos (sección 12: "pagos pendientes proyectados"). */
  futureNeedUsd: number,
  refFxRate: number
): FundingSummary {
  const active = fundingSources.filter((f) => !f.deleted_at && f.status !== "cancelado");

  const availableTodayUsd = active
    .filter((f) => f.status === "disponible")
    .reduce((sum, f) => sum + remainingUsd(f, refFxRate), 0);
  const confirmedFutureUsd = active
    .filter((f) => f.status === "confirmado_futuro")
    .reduce((sum, f) => sum + remainingUsd(f, refFxRate), 0);
  const potentialUsd = active
    .filter((f) => f.status === "potencial")
    .reduce((sum, f) => sum + remainingUsd(f, refFxRate), 0);

  const totalFundingUsd = availableTodayUsd + confirmedFutureUsd + potentialUsd;
  const gapUsd = futureNeedUsd - (availableTodayUsd + confirmedFutureUsd);

  return { availableTodayUsd, confirmedFutureUsd, potentialUsd, totalFundingUsd, futureNeedUsd, gapUsd };
}
