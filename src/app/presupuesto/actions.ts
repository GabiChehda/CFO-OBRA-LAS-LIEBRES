"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { CurrencyCode } from "@/lib/database.types";

export interface UpdateCategoryBudgetInput {
  budgetAmount: number;
  budgetCurrency: CurrencyCode;
  estimatedFinalOverride: number | null;
}

// Sección 25: budget_amount sólo cambia por esta acción explícita del usuario,
// nunca en base al EAC calculado ni a ningún otro derivado.
export async function updateCategoryBudget(categoryId: string, input: UpdateCategoryBudgetInput) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("categories")
    .update({
      budget_amount: input.budgetAmount,
      budget_currency: input.budgetCurrency,
      estimated_final_amount_override: input.estimatedFinalOverride,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId);
  if (error) throw error;

  revalidatePath("/", "layout");
}
