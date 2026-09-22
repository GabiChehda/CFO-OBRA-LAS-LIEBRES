import { loadProjectData } from "@/lib/data";
import { PagosTable } from "./PagosTable";

export default async function PagosPage() {
  const data = await loadProjectData();

  const categoryLabel = new Map<string, string>();
  for (const c of data.categories) {
    if (c.parent_id === null) categoryLabel.set(c.id, c.name);
  }
  for (const c of data.categories) {
    if (c.parent_id !== null) {
      const parentName = categoryLabel.get(c.parent_id) ?? "";
      categoryLabel.set(c.id, parentName ? `${parentName} > ${c.name}` : c.name);
    }
  }
  const supplierName = new Map(data.suppliers.map((s) => [s.id, s.name]));

  const rows = data.payments
    .filter((p) => !p.deleted_at)
    .map((p) => ({
      id: p.id,
      date: p.date,
      description: p.description,
      categoryName: categoryLabel.get(p.category_id) ?? "—",
      supplierName: p.supplier_id ? supplierName.get(p.supplier_id) ?? "—" : "—",
      amount: p.amount,
      currency: p.currency,
      paymentMethod: p.payment_method,
      paymentType: p.payment_type,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Pagos</h1>
        <p className="text-sm text-slate-500">
          Historial de pagos — usá el botón &ldquo;+ Nuevo pago&rdquo; (abajo a la derecha) para cargar uno nuevo
        </p>
      </div>

      <PagosTable rows={rows} />
    </div>
  );
}
