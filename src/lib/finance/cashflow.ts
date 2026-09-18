import type {
  BudgetCashflowPlanEntry,
  Commitment,
  CommitmentInstallment,
  FundingSource,
  Payment,
} from "@/lib/database.types";
import { toUsd } from "./currency";

export interface CashFlowRow {
  month: string; // 'YYYY-MM-01'
  originalUsd: number;
  forecastUsd: number;
  actualUsd: number;
  fundingUsd: number;
  cashBalanceUsd: number;
}

function monthKey(dateIso: string): string {
  return `${dateIso.slice(0, 7)}-01`;
}

function addToMap(map: Map<string, number>, key: string, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

export function computeCashFlow(params: {
  plan: BudgetCashflowPlanEntry[];
  commitments: Commitment[];
  installmentsByCommitmentId: Map<string, CommitmentInstallment[]>;
  payments: Payment[];
  fundingSources: FundingSource[];
  refFxRate: number;
}): CashFlowRow[] {
  const { plan, commitments, installmentsByCommitmentId, payments, fundingSources, refFxRate } = params;

  const originalByMonth = new Map<string, number>();
  for (const entry of plan) {
    addToMap(originalByMonth, monthKey(entry.month), toUsd(entry.planned_amount, entry.currency, refFxRate));
  }

  const actualByMonth = new Map<string, number>();
  for (const p of payments.filter((p) => !p.deleted_at)) {
    addToMap(actualByMonth, monthKey(p.date), p.amount_usd);
  }

  const pendingCommittedByMonth = new Map<string, number>();
  const commitmentsById = new Map(commitments.map((c) => [c.id, c]));
  for (const [commitmentId, installments] of installmentsByCommitmentId) {
    const commitment = commitmentsById.get(commitmentId);
    if (!commitment || commitment.status === "cancelled" || commitment.deleted_at) continue;
    for (const installment of installments) {
      if (installment.status !== "pending") continue;
      addToMap(
        pendingCommittedByMonth,
        monthKey(installment.due_date),
        toUsd(installment.amount, commitment.currency, refFxRate)
      );
    }
  }

  const fundingByMonth = new Map<string, number>();
  let undatedFundingUsd = 0;
  for (const source of fundingSources.filter((f) => !f.deleted_at && f.status !== "cancelado")) {
    const remaining = toUsd(source.total_amount - source.used_amount, source.currency, refFxRate);
    if (source.available_date) {
      addToMap(fundingByMonth, monthKey(source.available_date), remaining);
    } else {
      undatedFundingUsd += remaining;
    }
  }

  const allMonths = new Set<string>([
    ...originalByMonth.keys(),
    ...actualByMonth.keys(),
    ...pendingCommittedByMonth.keys(),
    ...fundingByMonth.keys(),
  ]);
  if (allMonths.size === 0) return [];
  const sortedMonths = [...allMonths].sort();
  const [firstMonth] = sortedMonths;
  const lastMonth = sortedMonths[sortedMonths.length - 1];

  // Fuentes sin fecha de disponibilidad se consideran ya disponibles hoy: se
  // suman como ingreso del primer mes (no como un "saldo inicial" invisible),
  // así "Fondos iniciales + Ingresos − Pagos = Saldo final" cierra en la tabla.
  if (undatedFundingUsd > 0) {
    addToMap(fundingByMonth, firstMonth, undatedFundingUsd);
  }

  const filledMonths: string[] = [];
  let cursor = new Date(`${firstMonth}T00:00:00Z`);
  const end = new Date(`${lastMonth}T00:00:00Z`);
  while (cursor <= end) {
    filledMonths.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  let runningFunding = 0;
  let runningOutflow = 0;

  return filledMonths.map((month) => {
    const actualUsd = actualByMonth.get(month) ?? 0;
    const forecastUsd = actualUsd + (pendingCommittedByMonth.get(month) ?? 0);
    const originalUsd = originalByMonth.get(month) ?? 0;
    const fundingUsd = fundingByMonth.get(month) ?? 0;

    runningFunding += fundingUsd;
    runningOutflow += forecastUsd;

    return {
      month,
      originalUsd,
      forecastUsd,
      actualUsd,
      fundingUsd,
      cashBalanceUsd: runningFunding - runningOutflow,
    };
  });
}
