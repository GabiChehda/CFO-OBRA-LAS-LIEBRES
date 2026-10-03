import { loadProjectData } from "@/lib/data";
import { buildPaymentFormOptions } from "@/lib/paymentFormOptions";
import { MovimientosTable } from "./MovimientosTable";

export default async function MovimientosPage() {
  const data = await loadProjectData();

  const categoryLabel = new Map<string, string>();
  for (const c of data.categories) {
    if (c.parent_id === null) {
      categoryLabel.set(c.id, c.name);
    }
  }
  for (const c of data.categories) {
    if (c.parent_id !== null) {
      const parentName = categoryLabel.get(c.parent_id) ?? "";
      categoryLabel.set(c.id, parentName ? `${parentName} > ${c.name}` : c.name);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Movimientos</h1>
        <p className="text-sm text-slate-500">Historial de pagos registrados, con filtros y exportación a CSV</p>
      </div>

      <MovimientosTable
        payments={data.payments}
        categories={data.categories.map((c) => ({ id: c.id, name: categoryLabel.get(c.id) ?? c.name }))}
        suppliers={data.suppliers.map((s) => ({ id: s.id, name: s.name }))}
        fundingSources={data.fundingSources.map((f) => ({ id: f.id, name: f.name }))}
        formOptions={buildPaymentFormOptions(data)}
      />
    </div>
  );
}
