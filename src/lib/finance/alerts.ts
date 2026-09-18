import type { Category, Commitment, CommitmentInstallment } from "@/lib/database.types";
import type { CategoryFinancials } from "./categories";
import type { CashFlowRow } from "./cashflow";

export type AlertType =
  | "presupuesto_excedido"
  | "proximo_pago"
  | "falta_fondeo"
  | "contrato_sin_calendario";

export interface Alert {
  type: AlertType;
  severity: "warning" | "danger";
  message: string;
  href?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeAlerts(params: {
  categories: Category[];
  financialsByCategory: Map<string, CategoryFinancials>;
  commitments: Commitment[];
  installmentsByCommitmentId: Map<string, CommitmentInstallment[]>;
  cashFlow: CashFlowRow[];
  today?: Date;
}): Alert[] {
  const { categories, financialsByCategory, commitments, installmentsByCommitmentId, cashFlow } = params;
  const today = params.today ?? new Date();
  const alerts: Alert[] = [];

  for (const category of categories) {
    const f = financialsByCategory.get(category.id);
    if (!f || f.isParent) continue;
    if (f.eacUsd > f.budgetUsd && f.budgetUsd > 0) {
      alerts.push({
        type: "presupuesto_excedido",
        severity: f.status === "red" ? "danger" : "warning",
        message: `${category.name}: estimado final supera el presupuesto en ${(
          f.deviationUsd
        ).toLocaleString("es-AR", { maximumFractionDigits: 0 })} USD`,
        href: `/presupuesto/${category.id}`,
      });
    }
  }

  for (const commitment of commitments) {
    if (commitment.deleted_at || commitment.status !== "active") continue;
    const installments = installmentsByCommitmentId.get(commitment.id) ?? [];
    const pending = installments.filter((i) => i.status === "pending");
    for (const installment of pending) {
      const due = new Date(`${installment.due_date}T00:00:00Z`);
      const daysUntil = Math.round((due.getTime() - today.getTime()) / DAY_MS);
      if (daysUntil <= 7 && daysUntil >= 0) {
        alerts.push({
          type: "proximo_pago",
          severity: "danger",
          message: `Pago de ${commitment.description} vence en ${daysUntil} día(s) (${installment.due_date})`,
          href: "/compromisos",
        });
      } else if (daysUntil > 7 && daysUntil <= 30) {
        alerts.push({
          type: "proximo_pago",
          severity: "warning",
          message: `Pago de ${commitment.description} vence el ${installment.due_date}`,
          href: "/compromisos",
        });
      }
    }
    if (installments.length === 0 && commitment.total_amount - commitment.advance_amount > 0) {
      alerts.push({
        type: "contrato_sin_calendario",
        severity: "warning",
        message: `${commitment.description} no tiene cuotas/fechas de pago cargadas`,
        href: "/compromisos",
      });
    }
  }

  const todayMonth = `${today.toISOString().slice(0, 7)}-01`;
  const futureNegative = cashFlow.find((row) => row.month >= todayMonth && row.cashBalanceUsd < 0);
  if (futureNegative) {
    alerts.push({
      type: "falta_fondeo",
      severity: "danger",
      message: `El saldo de caja proyectado se vuelve negativo en ${futureNegative.month.slice(0, 7)}`,
      href: "/fondos",
    });
  }

  return alerts;
}
