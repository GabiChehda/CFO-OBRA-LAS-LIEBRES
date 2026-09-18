"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getCurrentProject } from "@/lib/project";
import type { CurrencyCode, FundingSourceStatus, FundingSourceType } from "@/lib/database.types";

export interface FundingSourceInput {
  name: string;
  type: FundingSourceType;
  currency: CurrencyCode;
  totalAmount: number;
  usedAmount: number;
  availableDate: string | null;
  status: FundingSourceStatus;
  financialCost: string | null;
  notes: string | null;
}

export async function createFundingSource(input: FundingSourceInput) {
  const supabase = getSupabaseClient();
  const project = await getCurrentProject();

  const { error } = await supabase.from("funding_sources").insert({
    project_id: project.id,
    name: input.name,
    type: input.type,
    currency: input.currency,
    total_amount: input.totalAmount,
    used_amount: input.usedAmount,
    available_date: input.availableDate,
    status: input.status,
    financial_cost: input.financialCost,
    notes: input.notes,
  });
  if (error) throw error;

  revalidatePath("/", "layout");
}

// Sección 12/13: Gabriel actualiza estas fuentes a mano (montos usados, estado,
// fecha de disponibilidad) a medida que la obra avanza, no hay cálculo automático.
export async function updateFundingSource(id: string, input: FundingSourceInput) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("funding_sources")
    .update({
      name: input.name,
      type: input.type,
      currency: input.currency,
      total_amount: input.totalAmount,
      used_amount: input.usedAmount,
      available_date: input.availableDate,
      status: input.status,
      financial_cost: input.financialCost,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/", "layout");
}

export async function deleteFundingSource(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("funding_sources")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/", "layout");
}
