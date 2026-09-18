import { loadProjectData } from "@/lib/data";
import { NuevoCompromisoForm } from "./NuevoCompromisoForm";

export default async function NuevoCompromisoPage() {
  const data = await loadProjectData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Nuevo compromiso</h1>
        <p className="text-sm text-slate-500">Registrá un contrato con un proveedor y su calendario de pagos</p>
      </div>
      <NuevoCompromisoForm
        suppliers={data.suppliers.map((s) => ({ id: s.id, name: s.name }))}
        categories={data.categories.map((c) => ({ id: c.id, name: c.name, parent_id: c.parent_id }))}
      />
    </div>
  );
}
