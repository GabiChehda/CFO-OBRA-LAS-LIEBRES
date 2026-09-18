// Tipos escritos a mano, en espejo de supabase/migrations/0001_init.sql.
// Sin CLI/Docker local disponible no corremos `supabase gen types`; el schema es chico
// y estable, así que mantener esto a mano es más simple que agregar tooling extra.
//
// IMPORTANTE: todo acá abajo usa `type`, no `interface`. @supabase/supabase-js 2.116
// resuelve el generic Database a través de una cadena larga de conditional types, y con
// `interface` esa inferencia colapsa silenciosamente a `never` en cada `.insert()`/
// `.update()` (bug de identidad de tipos con `interface` vs `type` en TS). Verificado con
// una reproducción mínima — no cambiar esto a `interface` sin volver a probarlo.

export type CurrencyCode = "ARS" | "USD";

export type CommitmentStatus = "active" | "completed" | "cancelled";

export type InstallmentStatus = "pending" | "paid";

export type PaymentMethod =
  | "transferencia_ars"
  | "transferencia_usd"
  | "cash_ars"
  | "cash_usd"
  | "tarjeta"
  | "cheque"
  | "otro";

export type PaymentType =
  | "anticipo"
  | "pago_parcial"
  | "pago_final"
  | "compra_directa"
  | "honorario"
  | "impuesto"
  | "otro";

export type FundingSourceType =
  | "caja_ahorro"
  | "reserva_financiera"
  | "venta_activo"
  | "prestamo"
  | "ingreso_futuro"
  | "credito"
  | "otro";

export type FundingSourceStatus =
  | "disponible"
  | "confirmado_futuro"
  | "potencial"
  | "utilizado"
  | "cancelado";

export type Project = {
  id: string;
  name: string;
  start_date: string | null;
  expected_end_date: string | null;
  base_currency: CurrencyCode;
  current_fx_rate: number;
  deviation_alert_threshold_pct: number;
  contingency_pct: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  budget_amount: number;
  budget_currency: CurrencyCode;
  estimated_final_amount_override: number | null;
  sort_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Supplier = {
  id: string;
  project_id: string;
  name: string;
  category_id: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  usual_currency: CurrencyCode;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Commitment = {
  id: string;
  project_id: string;
  supplier_id: string;
  category_id: string;
  description: string;
  contract_date: string;
  currency: CurrencyCode;
  total_amount: number;
  advance_amount: number;
  payment_terms: string | null;
  status: CommitmentStatus;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CommitmentInstallment = {
  id: string;
  commitment_id: string;
  due_date: string;
  amount: number;
  status: InstallmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FundingSource = {
  id: string;
  project_id: string;
  name: string;
  type: FundingSourceType;
  currency: CurrencyCode;
  total_amount: number;
  used_amount: number;
  available_date: string | null;
  status: FundingSourceStatus;
  financial_cost: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  project_id: string;
  category_id: string;
  supplier_id: string | null;
  commitment_id: string | null;
  commitment_installment_id: string | null;
  funding_source_id: string | null;
  date: string;
  description: string;
  currency: CurrencyCode;
  amount: number;
  fx_rate: number;
  amount_usd: number;
  amount_ars: number;
  payment_method: PaymentMethod;
  payment_type: PaymentType;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BudgetCashflowPlanEntry = {
  id: string;
  project_id: string;
  category_id: string;
  month: string;
  planned_amount: number;
  currency: CurrencyCode;
  created_at: string;
};

export type Attachment = {
  id: string;
  project_id: string;
  payment_id: string | null;
  commitment_id: string | null;
  file_path: string;
  file_name: string;
  created_at: string;
};

// El schema se llama `obra_liebres` (no `public`) porque este proyecto Supabase
// es compartido con otra app — ver supabase/migrations/0001_init.sql.
export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  obra_liebres: {
    Tables: {
      projects: { Row: Project; Insert: Partial<Project> & { name: string }; Update: Partial<Project>; Relationships: [] };
      categories: { Row: Category; Insert: Partial<Category> & { project_id: string; name: string }; Update: Partial<Category>; Relationships: [] };
      suppliers: { Row: Supplier; Insert: Partial<Supplier> & { project_id: string; name: string }; Update: Partial<Supplier>; Relationships: [] };
      commitments: { Row: Commitment; Insert: Partial<Commitment> & { project_id: string; supplier_id: string; category_id: string; description: string; total_amount: number }; Update: Partial<Commitment>; Relationships: [] };
      commitment_installments: { Row: CommitmentInstallment; Insert: Partial<CommitmentInstallment> & { commitment_id: string; due_date: string; amount: number }; Update: Partial<CommitmentInstallment>; Relationships: [] };
      funding_sources: { Row: FundingSource; Insert: Partial<FundingSource> & { project_id: string; name: string }; Update: Partial<FundingSource>; Relationships: [] };
      payments: { Row: Payment; Insert: Partial<Payment> & { project_id: string; category_id: string; description: string; currency: CurrencyCode; amount: number; fx_rate: number; amount_usd: number; amount_ars: number; payment_method: PaymentMethod; payment_type: PaymentType }; Update: Partial<Payment>; Relationships: [] };
      attachments: { Row: Attachment; Insert: Partial<Attachment> & { project_id: string; file_path: string; file_name: string }; Update: Partial<Attachment>; Relationships: [] };
      budget_cashflow_plan: { Row: BudgetCashflowPlanEntry; Insert: Partial<BudgetCashflowPlanEntry> & { project_id: string; category_id: string; month: string; planned_amount: number }; Update: Partial<BudgetCashflowPlanEntry>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
