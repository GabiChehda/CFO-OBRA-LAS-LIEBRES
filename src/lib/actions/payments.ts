"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getCurrentProject } from "@/lib/project";
import { toArs, toUsd } from "@/lib/finance/currency";
import type { CurrencyCode, PaymentMethod, PaymentType } from "@/lib/database.types";

export interface CreatePaymentInput {
  date: string;
  categoryId: string;
  supplierId?: string | null;
  description: string;
  amount: number;
  currency: CurrencyCode;
  fxRate: number;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  commitmentId?: string | null;
  commitmentInstallmentId?: string | null;
  fundingSourceId?: string | null;
  notes?: string | null;
}

export async function createPayment(input: CreatePaymentInput) {
  const supabase = getSupabaseClient();
  const project = await getCurrentProject();

  const amount_usd = toUsd(input.amount, input.currency, input.fxRate);
  const amount_ars = toArs(input.amount, input.currency, input.fxRate);

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      project_id: project.id,
      category_id: input.categoryId,
      supplier_id: input.supplierId ?? null,
      commitment_id: input.commitmentId ?? null,
      commitment_installment_id: input.commitmentInstallmentId ?? null,
      funding_source_id: input.fundingSourceId ?? null,
      date: input.date,
      description: input.description,
      currency: input.currency,
      amount: input.amount,
      fx_rate: input.fxRate,
      amount_usd,
      amount_ars,
      payment_method: input.paymentMethod,
      payment_type: input.paymentType,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  // Sección 25: un pago asociado a una cuota la salda automáticamente, lo que
  // reduce el saldo pendiente del rubro en el próximo cálculo de financials.
  if (input.commitmentInstallmentId) {
    const { error: installmentError } = await supabase
      .from("commitment_installments")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", input.commitmentInstallmentId);
    if (installmentError) throw installmentError;
  }

  if (input.fundingSourceId) {
    const { data: source, error: sourceError } = await supabase
      .from("funding_sources")
      .select("*")
      .eq("id", input.fundingSourceId)
      .single();
    if (sourceError) throw sourceError;
    if (source) {
      const usedDelta =
        source.currency === input.currency ? input.amount : source.currency === "USD" ? amount_usd : amount_ars;
      const { error: updateError } = await supabase
        .from("funding_sources")
        .update({ used_amount: source.used_amount + usedDelta, updated_at: new Date().toISOString() })
        .eq("id", source.id);
      if (updateError) throw updateError;
    }
  }

  revalidatePath("/", "layout");
  return payment;
}

/** Edita un pago ya cargado. A diferencia de crear, acá hay que revertir
 * primero los efectos secundarios del pago viejo (cuota que saldaba, monto
 * usado de su fuente de fondos) antes de aplicar los nuevos — si no, un pago
 * reasignado a otra cuota/fuente dejaría basura en la anterior. */
export async function updatePayment(paymentId: string, input: CreatePaymentInput) {
  const supabase = getSupabaseClient();

  const { data: existing, error: fetchError } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .single();
  if (fetchError) throw fetchError;
  if (!existing) throw new Error("Pago no encontrado.");

  const amount_usd = toUsd(input.amount, input.currency, input.fxRate);
  const amount_ars = toArs(input.amount, input.currency, input.fxRate);

  if (existing.commitment_installment_id && existing.commitment_installment_id !== input.commitmentInstallmentId) {
    const { error } = await supabase
      .from("commitment_installments")
      .update({ status: "pending", updated_at: new Date().toISOString() })
      .eq("id", existing.commitment_installment_id);
    if (error) throw error;
  }
  if (input.commitmentInstallmentId && input.commitmentInstallmentId !== existing.commitment_installment_id) {
    const { error } = await supabase
      .from("commitment_installments")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", input.commitmentInstallmentId);
    if (error) throw error;
  }

  if (existing.funding_source_id) {
    const { data: oldSource, error } = await supabase
      .from("funding_sources")
      .select("*")
      .eq("id", existing.funding_source_id)
      .single();
    if (error) throw error;
    if (oldSource) {
      const oldDelta =
        oldSource.currency === existing.currency
          ? existing.amount
          : oldSource.currency === "USD"
            ? existing.amount_usd
            : existing.amount_ars;
      const { error: updErr } = await supabase
        .from("funding_sources")
        .update({ used_amount: oldSource.used_amount - oldDelta, updated_at: new Date().toISOString() })
        .eq("id", oldSource.id);
      if (updErr) throw updErr;
    }
  }

  if (input.fundingSourceId) {
    const { data: newSource, error } = await supabase
      .from("funding_sources")
      .select("*")
      .eq("id", input.fundingSourceId)
      .single();
    if (error) throw error;
    if (newSource) {
      const newDelta =
        newSource.currency === input.currency ? input.amount : newSource.currency === "USD" ? amount_usd : amount_ars;
      const { error: updErr } = await supabase
        .from("funding_sources")
        .update({ used_amount: newSource.used_amount + newDelta, updated_at: new Date().toISOString() })
        .eq("id", newSource.id);
      if (updErr) throw updErr;
    }
  }

  const { error: updateError } = await supabase
    .from("payments")
    .update({
      date: input.date,
      category_id: input.categoryId,
      supplier_id: input.supplierId ?? null,
      commitment_id: input.commitmentId ?? null,
      commitment_installment_id: input.commitmentInstallmentId ?? null,
      funding_source_id: input.fundingSourceId ?? null,
      description: input.description,
      currency: input.currency,
      amount: input.amount,
      fx_rate: input.fxRate,
      amount_usd,
      amount_ars,
      payment_method: input.paymentMethod,
      payment_type: input.paymentType,
      notes: input.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId);
  if (updateError) throw updateError;

  revalidatePath("/", "layout");
}

export async function deletePayment(paymentId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("payments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", paymentId);
  if (error) throw error;
  revalidatePath("/", "layout");
}
