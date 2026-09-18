import { getSupabaseClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/database.types";

// V1 es de un solo proyecto ("Obra Las Liebres"), pero el schema ya soporta
// varios (project_id en todas las tablas) para no tener que migrar después.
export async function getCurrentProject(): Promise<Project> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(
      "No hay ningún proyecto cargado todavía. Corré `npm run seed` para crear 'Obra Las Liebres'."
    );
  }
  return data;
}
