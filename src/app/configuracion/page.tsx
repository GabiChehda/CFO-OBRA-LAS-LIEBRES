import { getCurrentProject } from "@/lib/project";
import { ConfiguracionForm } from "./ConfiguracionForm";

export default async function ConfiguracionPage() {
  const project = await getCurrentProject();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Configuración</h1>
        <p className="text-sm text-slate-500">Parámetros generales de la obra</p>
      </div>

      <ConfiguracionForm project={project} />

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">Importar presupuesto inicial</h2>
        <p className="mt-2 text-sm text-slate-500">
          Para esta primera versión, la carga inicial de rubros, presupuesto y cash flow se hace corriendo{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-700">npm run seed</code> desde la
          terminal. Todavía no hace falta un importador de archivos en la interfaz.
        </p>
      </div>
    </div>
  );
}
