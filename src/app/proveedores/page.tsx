import Link from "next/link";
import { loadProjectData } from "@/lib/data";
import { NuevoProveedorButton } from "./NuevoProveedorButton";

export default async function ProveedoresPage() {
  const data = await loadProjectData();
  const categoryName = new Map(data.categories.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Proveedores</h1>
          <p className="text-sm text-slate-500">Contactos y rubro habitual de cada proveedor</p>
        </div>
        <NuevoProveedorButton
          categories={data.categories.map((c) => ({ id: c.id, name: c.name, parent_id: c.parent_id }))}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Rubro habitual</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Moneda</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link href={`/proveedores/${s.id}`} className="font-medium text-slate-900 hover:underline">
                    {s.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-slate-600">
                  {s.category_id ? categoryName.get(s.category_id) ?? "—" : "—"}
                </td>
                <td className="px-4 py-2.5 text-slate-600">
                  {s.contact_name || s.phone || s.email ? (
                    <div className="space-y-0.5">
                      {s.contact_name && <p>{s.contact_name}</p>}
                      {(s.phone || s.email) && (
                        <p className="text-xs text-slate-400">{[s.phone, s.email].filter(Boolean).join(" · ")}</p>
                      )}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-600">{s.usual_currency}</td>
              </tr>
            ))}
            {data.suppliers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400">
                  Todavía no hay proveedores cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
