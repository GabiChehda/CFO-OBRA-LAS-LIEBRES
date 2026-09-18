"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase/client";

export interface UpdateProjectSettingsInput {
  name: string;
  start_date: string | null;
  expected_end_date: string | null;
  current_fx_rate: number;
  deviation_alert_threshold_pct: number;
  contingency_pct: number;
  notes: string | null;
}

export async function updateProjectSettings(projectId: string, input: UpdateProjectSettingsInput) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("projects")
    .update({
      name: input.name,
      start_date: input.start_date,
      expected_end_date: input.expected_end_date,
      current_fx_rate: input.current_fx_rate,
      deviation_alert_threshold_pct: input.deviation_alert_threshold_pct,
      contingency_pct: input.contingency_pct,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);
  if (error) throw error;

  // El fx de referencia y los umbrales afectan cálculos en todas las pantallas
  // (presupuesto, cashflow, alertas), no solo esta, por eso el revalidate es de layout.
  revalidatePath("/", "layout");
}
