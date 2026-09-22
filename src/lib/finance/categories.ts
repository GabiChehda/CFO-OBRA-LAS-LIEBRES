import type {
  Category,
  Commitment,
  CommitmentInstallment,
  Payment,
  Project,
} from "@/lib/database.types";
import { toUsd } from "./currency";

export type Semaforo = "green" | "yellow" | "red" | "none";

export interface CategoryFinancials {
  categoryId: string;
  /** true si esta fila tiene subrubros (agrega sus totales). */
  isParent: boolean;
  budgetUsd: number;
  committedUsd: number;
  paidUsd: number;
  /** Saldo pendiente por pagar de compromisos activos (no de compras directas). */
  pendingBalanceUsd: number;
  eacUsd: number;
  eacIsOverride: boolean;
  /** EAC - Pagado: lo que falta ejecutar del estimado final, con o sin compromiso. */
  remainingToExecuteUsd: number;
  deviationUsd: number;
  deviationPct: number | null;
  status: Semaforo;
  hasCommitmentWithoutSchedule: boolean;
}

export function buildChildrenIndex(categories: Category[]): Map<string | null, Category[]> {
  const byParent = new Map<string | null, Category[]>();
  for (const c of categories) {
    const key = c.parent_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(c);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.sort_order - b.sort_order);
  return byParent;
}

export function getSelfAndDescendantIds(
  categoryId: string,
  childrenByParent: Map<string | null, Category[]>
): string[] {
  const ids = [categoryId];
  const children = childrenByParent.get(categoryId) ?? [];
  for (const child of children) {
    ids.push(...getSelfAndDescendantIds(child.id, childrenByParent));
  }
  return ids;
}

/** Semáforo (sección 5), con un cuarto estado "none" para rubros sin
 * presupuesto ni ningún movimiento — no son un desvío, son un rubro que
 * todavía no arrancó, y no deberían leerse como "En línea" (verde). */
function getStatus(
  budgetUsd: number,
  committedUsd: number,
  paidUsd: number,
  eacUsd: number,
  deviationPct: number | null,
  thresholdPct: number
): Semaforo {
  if (budgetUsd === 0 && committedUsd === 0 && paidUsd === 0) return "none";
  if (eacUsd <= budgetUsd) return "green"; // EAC nunca es menor al presupuesto salvo override manual
  if (budgetUsd === 0) return "red"; // hay gasto/compromiso sin ningún presupuesto asignado
  if (deviationPct !== null && deviationPct * 100 <= thresholdPct) return "yellow";
  return "red";
}

/** Saldo pendiente de un compromiso: si tiene cuotas cargadas, la suma de las
 * pendientes; si no tiene ninguna, el total menos el anticipo (y se marca para
 * la alerta de "contrato sin calendario" de la sección 20). */
export function commitmentPendingUsd(
  commitment: Commitment,
  installments: CommitmentInstallment[],
  refFxRate: number
): { pendingUsd: number; hasSchedule: boolean } {
  if (installments.length > 0) {
    const pending = installments
      .filter((i) => i.status === "pending")
      .reduce((sum, i) => sum + i.amount, 0);
    return { pendingUsd: toUsd(pending, commitment.currency, refFxRate), hasSchedule: true };
  }
  const pending = Math.max(commitment.total_amount - commitment.advance_amount, 0);
  return { pendingUsd: toUsd(pending, commitment.currency, refFxRate), hasSchedule: false };
}

export function computeAllCategoryFinancials(
  categories: Category[],
  commitments: Commitment[],
  payments: Payment[],
  installmentsByCommitmentId: Map<string, CommitmentInstallment[]>,
  project: Project
): Map<string, CategoryFinancials> {
  const childrenByParent = buildChildrenIndex(categories);
  const refFxRate = project.current_fx_rate;
  const result = new Map<string, CategoryFinancials>();

  const activeCommitments = commitments.filter((c) => !c.deleted_at && c.status !== "cancelled");
  const activePayments = payments.filter((p) => !p.deleted_at);

  for (const category of categories) {
    const ids = new Set(getSelfAndDescendantIds(category.id, childrenByParent));
    const isParent = (childrenByParent.get(category.id) ?? []).length > 0;

    const categoryCommitments = activeCommitments.filter((c) => ids.has(c.category_id));
    const categoryPayments = activePayments.filter((p) => ids.has(p.category_id));

    const budgetUsd = categories
      .filter((c) => ids.has(c.id))
      .reduce((sum, c) => sum + toUsd(c.budget_amount, c.budget_currency, refFxRate), 0);

    const committedUsd = categoryCommitments.reduce(
      (sum, c) => sum + toUsd(c.total_amount, c.currency, refFxRate),
      0
    );
    const paidUsd = categoryPayments.reduce((sum, p) => sum + p.amount_usd, 0);

    let pendingBalanceUsd = 0;
    let hasCommitmentWithoutSchedule = false;
    for (const c of categoryCommitments) {
      const { pendingUsd, hasSchedule } = commitmentPendingUsd(
        c,
        installmentsByCommitmentId.get(c.id) ?? [],
        refFxRate
      );
      pendingBalanceUsd += pendingUsd;
      if (!hasSchedule && c.total_amount - c.advance_amount > 0) hasCommitmentWithoutSchedule = true;
    }

    // Presupuesto y pagos son dimensiones distintas (punto 1): un pago dentro
    // de lo presupuestado no debe inflar el EAC. El EAC sólo sube por encima
    // del presupuesto vigente cuando lo realmente comprometido+pagado lo
    // supera — nunca por sumar el pago "arriba" del presupuesto restante.
    const override = categories.find((c) => c.id === category.id)?.estimated_final_amount_override;
    const autoEac = Math.max(budgetUsd, paidUsd + pendingBalanceUsd);
    const eacUsd = override ?? autoEac;
    const remainingToExecuteUsd = eacUsd - paidUsd;

    const deviationUsd = eacUsd - budgetUsd;
    const deviationPct = budgetUsd > 0 ? deviationUsd / budgetUsd : null;

    result.set(category.id, {
      categoryId: category.id,
      isParent,
      budgetUsd,
      committedUsd,
      paidUsd,
      pendingBalanceUsd,
      eacUsd,
      eacIsOverride: override != null,
      remainingToExecuteUsd,
      deviationUsd,
      deviationPct,
      status: getStatus(budgetUsd, committedUsd, paidUsd, eacUsd, deviationPct, project.deviation_alert_threshold_pct),
      hasCommitmentWithoutSchedule,
    });
  }

  return result;
}

export interface ProjectSummary {
  budgetUsd: number;
  eacUsd: number;
  committedUsd: number;
  paidUsd: number;
  pendingBalanceUsd: number;
  remainingToExecuteUsd: number;
  deviationUsd: number;
  deviationPct: number | null;
}

export function computeProjectSummary(
  categories: Category[],
  financialsByCategory: Map<string, CategoryFinancials>
): ProjectSummary {
  const roots = categories.filter((c) => c.parent_id === null);
  const totals = roots.reduce(
    (acc, c) => {
      const f = financialsByCategory.get(c.id);
      if (!f) return acc;
      acc.budgetUsd += f.budgetUsd;
      acc.eacUsd += f.eacUsd;
      acc.committedUsd += f.committedUsd;
      acc.paidUsd += f.paidUsd;
      acc.pendingBalanceUsd += f.pendingBalanceUsd;
      return acc;
    },
    { budgetUsd: 0, eacUsd: 0, committedUsd: 0, paidUsd: 0, pendingBalanceUsd: 0 }
  );
  const deviationUsd = totals.eacUsd - totals.budgetUsd;
  const deviationPct = totals.budgetUsd > 0 ? deviationUsd / totals.budgetUsd : null;
  const remainingToExecuteUsd = totals.eacUsd - totals.paidUsd;
  return { ...totals, remainingToExecuteUsd, deviationUsd, deviationPct };
}
