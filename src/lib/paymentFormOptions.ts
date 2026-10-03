import type { ProjectData } from "@/lib/data";
import type { CurrencyCode } from "@/lib/database.types";

// Bundle compartido por el botón global "+ Nuevo pago" y por "Editar" en
// Pagos/Movimientos — mismas opciones de rubro/proveedor/compromiso/fondeo.
export interface PaymentFormOptions {
  categories: { id: string; name: string; parent_id: string | null }[];
  suppliers: { id: string; name: string }[];
  commitments: { id: string; description: string; supplier_id: string; category_id: string; currency: CurrencyCode }[];
  installmentsByCommitment: Record<string, { id: string; due_date: string; amount: number; status: "pending" | "paid" }[]>;
  fundingSources: { id: string; name: string }[];
  defaultFxRate: number;
}

export function buildPaymentFormOptions(data: ProjectData): PaymentFormOptions {
  return {
    categories: data.categories.map((c) => ({ id: c.id, name: c.name, parent_id: c.parent_id })),
    suppliers: data.suppliers.map((s) => ({ id: s.id, name: s.name })),
    commitments: data.commitments
      .filter((c) => c.status === "active" && !c.deleted_at)
      .map((c) => ({
        id: c.id,
        description: c.description,
        supplier_id: c.supplier_id,
        category_id: c.category_id,
        currency: c.currency,
      })),
    installmentsByCommitment: Object.fromEntries(
      [...data.installmentsByCommitmentId.entries()].map(([id, list]) => [
        id,
        list.map((i) => ({ id: i.id, due_date: i.due_date, amount: i.amount, status: i.status })),
      ])
    ),
    fundingSources: data.fundingSources.map((f) => ({ id: f.id, name: f.name })),
    defaultFxRate: data.project.current_fx_rate,
  };
}
