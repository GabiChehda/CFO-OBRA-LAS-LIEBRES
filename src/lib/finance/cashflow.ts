import type {
  BudgetCashflowPlanEntry,
  Category,
  Commitment,
  CommitmentInstallment,
  FundingSource,
  Payment,
} from "@/lib/database.types";
import { toUsd } from "./currency";
import { buildChildrenIndex, type CategoryFinancials } from "./categories";

export interface CashFlowRow {
  month: string; // 'YYYY-MM-01'
  /** Congelado desde el Excel de origen — nunca se recalcula (baseline comparativo). */
  planUsd: number;
  /** Comprometido pendiente (cuotas con fecha) + forecast no comprometido de acá en más. */
  forecastUsd: number;
  actualUsd: number;
  confirmedFundingUsd: number;
  cashBalanceUsd: number;
  /** <= 0 siempre; el déficit del mes cuando la caja proyectada es negativa. */
  gapUsd: number;
}

export interface PeakFundingGap {
  firstNegativeMonth: string | null;
  /** <= 0; el mínimo (más negativo) de `cashBalanceUsd` en toda la serie. */
  peakGapUsd: number;
  peakGapMonth: string | null;
}

function monthKey(dateIso: string): string {
  return `${dateIso.slice(0, 7)}-01`;
}

function nextMonthKey(month: string): string {
  const d = new Date(`${month}T00:00:00Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
}

function addToMap(map: Map<string, number>, key: string, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function remainingUsd(source: FundingSource, refFxRate: number): number {
  return toUsd(source.total_amount - source.used_amount, source.currency, refFxRate);
}

/** El corazón del forecast (ver conversación de diseño): por rubro,
 * `Real + Comprometido pendiente + Forecast no comprometido = EAC` siempre
 * (el EAC nunca es menor a pagado+comprometido, así que la resta nunca es
 * negativa). Ese "no comprometido" se reparte SOLO sobre los meses actuales/
 * futuros del Plan Original de ese rubro, proporcional a su propio peso — así
 * un mes pasado que no se ejecutó ni comprometió no desaparece, se traslada
 * hacia adelante (la resta ya lo dejó afuera de "pagado"/"comprometido", y al
 * repartir sólo entre meses futuros, ese monto migra ahí solo). Si no quedan
 * meses futuros en el plan de ese rubro (o nunca tuvo plan cargado), todo el
 * saldo va provisoriamente al mes siguiente al actual.
 *
 * Se procesa un sub-rubro (hoja) por vez, nunca un rubro padre: en este
 * modelo de datos todo el presupuesto vive en las hojas (los macro-rubros
 * quedan en 0 y son 100% la suma de sus hijos — ver EditBudgetForm/seed), así
 * que iterar hojas cubre el EAC completo sin duplicar nada. Si algún día un
 * padre vuelve a cargar presupuesto propio (sin desglosar en hijos), ese
 * monto no se vería reflejado acá — sólo en los totales de /presupuesto.
 */
function computeUncommittedForecastByMonth(params: {
  categories: Category[];
  financialsByCategory: Map<string, CategoryFinancials>;
  plan: BudgetCashflowPlanEntry[];
  refFxRate: number;
  currentMonthKey: string;
}): Map<string, number> {
  const { categories, financialsByCategory, plan, refFxRate, currentMonthKey } = params;
  const result = new Map<string, number>();

  const planByCategory = new Map<string, Map<string, number>>();
  for (const entry of plan) {
    if (!planByCategory.has(entry.category_id)) planByCategory.set(entry.category_id, new Map());
    addToMap(planByCategory.get(entry.category_id)!, monthKey(entry.month), toUsd(entry.planned_amount, entry.currency, refFxRate));
  }

  const childrenByParent = buildChildrenIndex(categories);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const leafCategoryIds = categories
    .filter((c) => (childrenByParent.get(c.id) ?? []).length === 0)
    .map((c) => c.id);

  // Una hoja nueva puede no tener plan propio (p.ej. sub-rubros agregados
  // después del import original del Excel). En ese caso hereda la curva
  // temporal del ancestro más cercano que sí tenga plan — sigue siendo mejor
  // proxy de "cuándo" que asumir el próximo mes a ciegas.
  function findPlanShape(categoryId: string): Map<string, number> | undefined {
    let current: string | undefined = categoryId;
    while (current) {
      const shape = planByCategory.get(current);
      if (shape) return shape;
      current = categoryById.get(current)?.parent_id ?? undefined;
    }
    return undefined;
  }

  for (const categoryId of leafCategoryIds) {
    const f = financialsByCategory.get(categoryId);
    if (!f) continue;
    const uncommittedUsd = Math.max(f.eacUsd - f.paidUsd - f.pendingBalanceUsd, 0);
    if (uncommittedUsd === 0) continue;

    const categoryPlan = findPlanShape(categoryId) ?? new Map<string, number>();
    const futureEntries = [...categoryPlan.entries()].filter(([month]) => month >= currentMonthKey);
    const sumFuture = futureEntries.reduce((sum, [, amount]) => sum + amount, 0);

    if (sumFuture > 0) {
      for (const [month, amount] of futureEntries) {
        addToMap(result, month, uncommittedUsd * (amount / sumFuture));
      }
    } else {
      addToMap(result, nextMonthKey(currentMonthKey), uncommittedUsd);
    }
  }

  return result;
}

export function computeCashFlow(params: {
  categories: Category[];
  financialsByCategory: Map<string, CategoryFinancials>;
  plan: BudgetCashflowPlanEntry[];
  commitments: Commitment[];
  installmentsByCommitmentId: Map<string, CommitmentInstallment[]>;
  payments: Payment[];
  fundingSources: FundingSource[];
  refFxRate: number;
  today?: Date;
}): CashFlowRow[] {
  const { categories, financialsByCategory, plan, commitments, installmentsByCommitmentId, payments, fundingSources, refFxRate } =
    params;
  const today = params.today ?? new Date();
  const currentMonthKey = monthKey(today.toISOString());

  const planByMonth = new Map<string, number>();
  for (const entry of plan) {
    addToMap(planByMonth, monthKey(entry.month), toUsd(entry.planned_amount, entry.currency, refFxRate));
  }

  const actualByMonth = new Map<string, number>();
  for (const p of payments.filter((p) => !p.deleted_at)) {
    addToMap(actualByMonth, monthKey(p.date), p.amount_usd);
  }

  // "Comprometido": cuotas pendientes ubicadas en su fecha prevista de pago.
  const committedByMonth = new Map<string, number>();
  const commitmentsById = new Map(commitments.map((c) => [c.id, c]));
  for (const [commitmentId, installments] of installmentsByCommitmentId) {
    const commitment = commitmentsById.get(commitmentId);
    if (!commitment || commitment.status === "cancelled" || commitment.deleted_at) continue;
    for (const installment of installments) {
      if (installment.status !== "pending") continue;
      addToMap(committedByMonth, monthKey(installment.due_date), toUsd(installment.amount, commitment.currency, refFxRate));
    }
  }

  const uncommittedForecastByMonth = computeUncommittedForecastByMonth({
    categories,
    financialsByCategory,
    plan,
    refFxRate,
    currentMonthKey,
  });

  // Fondeo: "disponible" es caja inicial (nunca un ingreso mensual); sólo
  // "confirmado_futuro" entra como ingreso mensual, y SÓLO si tiene
  // `available_date` — uno sin fecha sigue contando en el total de "fondeo
  // confirmado" (ver computeFundingSummary), pero no se ubica en ningún mes
  // de la curva hasta que se cargue una fecha real (nunca asumir el mes
  // actual: eso ensuciaba la proyección con un dato inventado).
  // "potencial"/"utilizado"/"cancelado" no participan de la caja base.
  let initialCashUsd = 0;
  const confirmedFundingByMonth = new Map<string, number>();
  for (const source of fundingSources.filter((f) => !f.deleted_at)) {
    if (source.status === "disponible") {
      initialCashUsd += remainingUsd(source, refFxRate);
    } else if (source.status === "confirmado_futuro" && source.available_date) {
      addToMap(confirmedFundingByMonth, monthKey(source.available_date), remainingUsd(source, refFxRate));
    }
  }

  const allMonths = new Set<string>([
    ...planByMonth.keys(),
    ...actualByMonth.keys(),
    ...committedByMonth.keys(),
    ...uncommittedForecastByMonth.keys(),
    ...confirmedFundingByMonth.keys(),
    currentMonthKey,
  ]);
  const sortedMonths = [...allMonths].sort();
  const [firstMonth] = sortedMonths;
  const lastMonth = sortedMonths[sortedMonths.length - 1];

  const filledMonths: string[] = [];
  let cursor = new Date(`${firstMonth}T00:00:00Z`);
  const end = new Date(`${lastMonth}T00:00:00Z`);
  while (cursor <= end) {
    filledMonths.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  let runningFunding = initialCashUsd;
  let runningOutflow = 0;

  return filledMonths.map((month) => {
    const planUsd = planByMonth.get(month) ?? 0;
    const actualUsd = actualByMonth.get(month) ?? 0;
    const forecastUsd = (committedByMonth.get(month) ?? 0) + (uncommittedForecastByMonth.get(month) ?? 0);
    const confirmedFundingUsd = confirmedFundingByMonth.get(month) ?? 0;

    runningFunding += confirmedFundingUsd;
    runningOutflow += actualUsd + forecastUsd;
    const cashBalanceUsd = runningFunding - runningOutflow;

    return {
      month,
      planUsd,
      forecastUsd,
      actualUsd,
      confirmedFundingUsd,
      cashBalanceUsd,
      gapUsd: Math.min(cashBalanceUsd, 0),
    };
  });
}

export function computePeakFundingGap(rows: CashFlowRow[]): PeakFundingGap {
  let firstNegativeMonth: string | null = null;
  let peakGapUsd = 0;
  let peakGapMonth: string | null = null;

  for (const row of rows) {
    if (row.cashBalanceUsd < 0 && firstNegativeMonth === null) firstNegativeMonth = row.month;
    if (row.cashBalanceUsd < peakGapUsd) {
      peakGapUsd = row.cashBalanceUsd;
      peakGapMonth = row.month;
    }
  }

  return { firstNegativeMonth, peakGapUsd, peakGapMonth };
}
