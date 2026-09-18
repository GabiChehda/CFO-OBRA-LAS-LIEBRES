import { config } from "dotenv";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";

config({ path: path.join(process.cwd(), ".env.local") });

// Datos reales tomados de "2026 - LasLiebres con CashFlow v1 (1).xlsx" (hojas "Cash Flow
// Obra", "Plan Financiamiento" y "Movimientos"). Ver el plan en
// ~/.claude/plans/deep-popping-wilkinson.md para el detalle de cómo se mapeó cada monto.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !publishableKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local");
}
const supabase = createClient<Database>(url, publishableKey, { db: { schema: "obra_liebres" } });

type CategorySeed = {
  name: string;
  budgetUsd?: number;
  children?: CategorySeed[];
};

const CATEGORY_TREE: CategorySeed[] = [
  {
    name: "Obra preliminar",
    children: [
      { name: "Proyecto" },
      { name: "Arquitectura" },
      { name: "Dirección de obra" },
      { name: "Permisos", budgetUsd: 8000 },
      { name: "Estudios" },
    ],
  },
  {
    name: "Obra gruesa",
    // Precio "llave en mano" del constructor (280 m² × USD 1.500/m², incluye honorarios).
    // Todavía no está desglosado por sub-rubro: se reparte a medida que se contrata.
    budgetUsd: 420000,
    children: [
      { name: "Movimiento de suelo" },
      { name: "Fundaciones" },
      { name: "Hormigón" },
      { name: "Albañilería" },
      { name: "Estructura" },
      { name: "Techos" },
    ],
  },
  {
    name: "Instalaciones",
    children: [
      { name: "Electricidad" },
      { name: "Sanitarios" },
      { name: "Gas" },
      { name: "Climatización" },
      { name: "Domótica" },
    ],
  },
  {
    name: "Terminaciones",
    children: [
      { name: "Pisos" },
      { name: "Revestimientos" },
      { name: "Pintura" },
      { name: "Carpinterías" },
      { name: "Aberturas" },
      { name: "Muebles" },
    ],
  },
  {
    name: "Equipamiento",
    children: [{ name: "Cocina" }, { name: "Baños" }, { name: "Electrodomésticos" }, { name: "Iluminación" }],
  },
  {
    name: "Exterior",
    // Pileta + riego, sin desglosar todavía entre los dos.
    budgetUsd: 50000,
    children: [
      { name: "Jardín" },
      { name: "Riego" },
      { name: "Piscina" },
      { name: "Galería" },
      { name: "Parrilla" },
      { name: "Cerco" },
      { name: "Acceso" },
    ],
  },
  {
    name: "Otros",
    // Expensas del obrador durante los ~18 meses de obra: no encaja en ningún sub-rubro
    // de la lista, así que queda a nivel del macro-rubro.
    budgetUsd: 25000,
    children: [
      { name: "Honorarios" },
      { name: "Impuestos" },
      { name: "Fletes" },
      { name: "Contingencia" },
      { name: "Imprevistos" },
    ],
  },
];

// Plan de cash flow mensual original (hoja "Cash Flow Obra"), en USD.
const CASHFLOW_PLAN: { category: string; month: string; amount: number }[] = [
  { category: "Permisos", month: "2026-06-01", amount: 2500 },
  { category: "Permisos", month: "2026-07-01", amount: 3000 },
  { category: "Permisos", month: "2026-08-01", amount: 2500 },

  { category: "Obra gruesa", month: "2026-08-01", amount: 20000 },
  { category: "Obra gruesa", month: "2026-09-01", amount: 38000 },
  { category: "Obra gruesa", month: "2026-10-01", amount: 42000 },
  { category: "Obra gruesa", month: "2026-11-01", amount: 46000 },
  { category: "Obra gruesa", month: "2026-12-01", amount: 52000 },
  { category: "Obra gruesa", month: "2027-01-01", amount: 46000 },
  { category: "Obra gruesa", month: "2027-02-01", amount: 46000 },
  { category: "Obra gruesa", month: "2027-03-01", amount: 42000 },
  { category: "Obra gruesa", month: "2027-04-01", amount: 40000 },
  { category: "Obra gruesa", month: "2027-05-01", amount: 30000 },
  { category: "Obra gruesa", month: "2027-06-01", amount: 18000 },

  { category: "Exterior", month: "2027-06-01", amount: 25000 },
  { category: "Exterior", month: "2027-07-01", amount: 25000 },

  ...["2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01", "2026-11-01", "2026-12-01",
     "2027-01-01", "2027-02-01", "2027-03-01", "2027-04-01", "2027-05-01", "2027-06-01"].map((month) => ({
    category: "Otros",
    month,
    amount: 1923,
  })),
  { category: "Otros", month: "2027-07-01", amount: 1924 },
];

// OJO: PostgREST hace UNION de las keys presentes en todos los objetos de un
// insert masivo y manda `null` explícito (no el DEFAULT de la columna) para las
// que falten en cada fila — por eso todas las filas repiten las mismas keys
// (used_amount/financial_cost/notes) aunque sean null, en vez de omitirlas.
const FUNDING_SOURCES = [
  {
    name: "Familia Cora – Lote",
    type: "otro" as const,
    total_amount: 295000,
    used_amount: 295000,
    status: "utilizado" as const,
    financial_cost: null,
    notes: "Aporte/regalo en especie de Familia Cora, aplicado a la compra del lote (fuera del presupuesto de obra).",
  },
  {
    name: "Ahorros Cora",
    type: "caja_ahorro" as const,
    total_amount: 50000,
    used_amount: 0,
    status: "disponible" as const,
    financial_cost: null,
    notes: null,
  },
  {
    name: "Ahorros Gabi",
    type: "caja_ahorro" as const,
    total_amount: 75000,
    used_amount: 0,
    status: "disponible" as const,
    financial_cost: null,
    notes: null,
  },
  {
    name: "Depto Salta",
    type: "venta_activo" as const,
    total_amount: 50000,
    used_amount: 0,
    status: "potencial" as const,
    financial_cost: null,
    notes: null,
  },
  {
    name: "Aporte Padres",
    type: "otro" as const,
    total_amount: 50000,
    used_amount: 0,
    status: "confirmado_futuro" as const,
    financial_cost: null,
    notes: "Aporte familiar, sin devolución prevista.",
  },
  {
    name: "Flujo Futuro – Trabajo",
    type: "ingreso_futuro" as const,
    total_amount: 100000,
    used_amount: 0,
    status: "potencial" as const,
    financial_cost: null,
    notes: "Estimado de ahorro/ingresos próximos 12-24 meses.",
  },
  {
    name: "Préstamo Hipotecario UVA",
    type: "credito" as const,
    total_amount: 150000,
    used_amount: 0,
    status: "confirmado_futuro" as const,
    financial_cost: "UVA + 6% anual nominal, cuota ~USD 1.266/mes a 15 años",
    notes: null,
  },
  {
    name: "Línea Chile Fer P",
    type: "credito" as const,
    total_amount: 16000,
    used_amount: 0,
    status: "potencial" as const,
    financial_cost: "0,81% mensual a 5 años",
    notes: null,
  },
  {
    name: "Cash Out eXCFO",
    type: "otro" as const,
    total_amount: 30000,
    used_amount: 0,
    status: "potencial" as const,
    financial_cost: null,
    notes: null,
  },
];

async function main() {
  const { data: existing } = await supabase.from("projects").select("id").limit(1).maybeSingle();
  if (existing) {
    console.log("Ya existe un proyecto — no se vuelve a sembrar. Borrá las tablas si querés reiniciar.");
    return;
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      name: "Obra Las Liebres",
      base_currency: "USD",
      current_fx_rate: 1530,
      deviation_alert_threshold_pct: 10,
      contingency_pct: 5,
      notes:
        "Lote aportado por Familia Cora (USD ~295.000, año 0) — no forma parte del presupuesto de obra.",
    })
    .select()
    .single();
  if (projectError || !project) throw projectError ?? new Error("No se pudo crear el proyecto");
  console.log(`Proyecto creado: ${project.id}`);

  const categoryIdByName = new Map<string, string>();
  let sortOrder = 0;
  for (const macro of CATEGORY_TREE) {
    const { data: parent, error: parentError } = await supabase
      .from("categories")
      .insert({
        project_id: project.id,
        parent_id: null,
        name: macro.name,
        budget_amount: macro.budgetUsd ?? 0,
        budget_currency: "USD",
        sort_order: sortOrder++,
      })
      .select()
      .single();
    if (parentError || !parent) throw parentError ?? new Error(`No se pudo crear ${macro.name}`);
    categoryIdByName.set(macro.name, parent.id);

    let childOrder = 0;
    for (const child of macro.children ?? []) {
      const { data: childRow, error: childError } = await supabase
        .from("categories")
        .insert({
          project_id: project.id,
          parent_id: parent.id,
          name: child.name,
          budget_amount: child.budgetUsd ?? 0,
          budget_currency: "USD",
          sort_order: childOrder++,
        })
        .select()
        .single();
      if (childError || !childRow) throw childError ?? new Error(`No se pudo crear ${child.name}`);
      categoryIdByName.set(child.name, childRow.id);
    }
  }
  console.log(`${categoryIdByName.size} rubros/subrubros creados.`);

  const planRows = CASHFLOW_PLAN.map((entry) => {
    const categoryId = categoryIdByName.get(entry.category);
    if (!categoryId) throw new Error(`Categoría de cash flow no encontrada: ${entry.category}`);
    return {
      project_id: project.id,
      category_id: categoryId,
      month: entry.month,
      planned_amount: entry.amount,
      currency: "USD" as const,
    };
  });
  const { error: planError } = await supabase.from("budget_cashflow_plan").insert(planRows);
  if (planError) throw planError;
  console.log(`${planRows.length} filas de cash flow original cargadas.`);

  const { error: fundingError } = await supabase
    .from("funding_sources")
    .insert(FUNDING_SOURCES.map((f) => ({ ...f, project_id: project.id, currency: "USD" as const })));
  if (fundingError) throw fundingError;
  console.log(`${FUNDING_SOURCES.length} fuentes de fondeo cargadas.`);

  const honorariosId = categoryIdByName.get("Honorarios")!;
  const permisosId = categoryIdByName.get("Permisos")!;
  const REAL_PAYMENTS = [
    {
      category_id: honorariosId,
      date: "2026-07-10",
      description: "Honorarios Nico",
      currency: "USD" as const,
      amount: 2000,
      fx_rate: 1530,
      amount_usd: 2000,
      amount_ars: 2000 * 1530,
      payment_method: "cash_usd" as const,
      payment_type: "honorario" as const,
    },
    {
      category_id: permisosId,
      date: "2026-09-14",
      description: "Gastos trámites municipalidad",
      currency: "ARS" as const,
      amount: 600000,
      fx_rate: 1530,
      amount_usd: 600000 / 1530,
      amount_ars: 600000,
      payment_method: "cash_ars" as const,
      payment_type: "impuesto" as const,
    },
    {
      category_id: permisosId,
      date: "2026-09-15",
      description: "Gastos trámites municipalidad",
      currency: "ARS" as const,
      amount: 600000,
      fx_rate: 1530,
      amount_usd: 600000 / 1530,
      amount_ars: 600000,
      payment_method: "transferencia_ars" as const,
      payment_type: "impuesto" as const,
    },
  ];
  const { error: paymentsError } = await supabase
    .from("payments")
    .insert(REAL_PAYMENTS.map((p) => ({ ...p, project_id: project.id })));
  if (paymentsError) throw paymentsError;
  console.log(`${REAL_PAYMENTS.length} pagos reales cargados.`);

  console.log("Seed completo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
