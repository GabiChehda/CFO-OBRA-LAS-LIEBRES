"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getCurrentProject } from "@/lib/project";
import type { CurrencyCode } from "@/lib/database.types";

export interface CreateCommitmentInstallmentInput {
  dueDate: string;
  amount: number;
}

export interface CreateCommitmentInput {
  supplierId: string;
  categoryId: string;
  description: string;
  contractDate: string;
  currency: CurrencyCode;
  totalAmount: number;
  advanceAmount: number;
  paymentTerms?: string | null;
  notes?: string | null;
  installments: CreateCommitmentInstallmentInput[];
}

export async function createCommitment(input: CreateCommitmentInput) {
  const supabase = getSupabaseClient();
  const project = await getCurrentProject();

  const { data: commitment, error } = await supabase
    .from("commitments")
    .insert({
      project_id: project.id,
      supplier_id: input.supplierId,
      category_id: input.categoryId,
      description: input.description,
      contract_date: input.contractDate,
      currency: input.currency,
      total_amount: input.totalAmount,
      advance_amount: input.advanceAmount,
      payment_terms: input.paymentTerms ?? null,
      notes: input.notes ?? null,
      status: "active",
    })
    .select()
    .single();
  if (error) throw error;

  // Cantidad de cuotas = 0 es un caso válido (PRD sección 20: dispara la
  // alerta "contrato sin calendario"), así que simplemente no insertamos nada.
  if (input.installments.length > 0) {
    const { error: installmentsError } = await supabase.from("commitment_installments").insert(
      input.installments.map((i) => ({
        commitment_id: commitment.id,
        due_date: i.dueDate,
        amount: i.amount,
        status: "pending" as const,
      }))
    );
    if (installmentsError) throw installmentsError;
  }

  revalidatePath("/", "layout");
  return commitment;
}
