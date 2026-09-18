"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getCurrentProject } from "@/lib/project";
import type { CurrencyCode } from "@/lib/database.types";

export interface SupplierInput {
  name: string;
  categoryId?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  usualCurrency: CurrencyCode;
  notes?: string | null;
}

export async function createSupplier(input: SupplierInput) {
  const supabase = getSupabaseClient();
  const project = await getCurrentProject();

  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      project_id: project.id,
      name: input.name,
      category_id: input.categoryId ?? null,
      contact_name: input.contactName ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      usual_currency: input.usualCurrency,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  revalidatePath("/", "layout");
  return data;
}

export async function updateSupplier(id: string, input: SupplierInput) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("suppliers")
    .update({
      name: input.name,
      category_id: input.categoryId ?? null,
      contact_name: input.contactName ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      usual_currency: input.usualCurrency,
      notes: input.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/", "layout");
}
