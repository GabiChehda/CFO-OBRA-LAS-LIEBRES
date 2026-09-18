-- Obra Las Liebres — schema inicial
-- Ver PRD sección 24 (modelo de datos) y sección 25 (reglas críticas de negocio).
--
-- Este proyecto Supabase es compartido con otra aplicación. Para no tocar ni
-- colisionar con sus tablas/tipos, todo lo de Obra Las Liebres vive en su propio
-- schema de Postgres (`obra_liebres`) en vez de `public`. No hay ningún DROP ni
-- ALTER sobre objetos existentes — sólo CREATE (schema/tipos/tablas/índices), y
-- todo con `if not exists` donde aplica para poder re-ejecutar sin romper nada.

create schema if not exists obra_liebres;
set search_path to obra_liebres;

create extension if not exists pgcrypto;

create type currency_code as enum ('ARS', 'USD');
create type commitment_status as enum ('active', 'completed', 'cancelled');
create type installment_status as enum ('pending', 'paid');
create type payment_method as enum (
  'transferencia_ars', 'transferencia_usd', 'cash_ars', 'cash_usd', 'tarjeta', 'cheque', 'otro'
);
create type payment_type as enum (
  'anticipo', 'pago_parcial', 'pago_final', 'compra_directa', 'honorario', 'impuesto', 'otro'
);
create type funding_source_type as enum (
  'caja_ahorro', 'reserva_financiera', 'venta_activo', 'prestamo', 'ingreso_futuro', 'credito', 'otro'
);
create type funding_source_status as enum (
  'disponible', 'confirmado_futuro', 'potencial', 'utilizado', 'cancelado'
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  expected_end_date date,
  base_currency currency_code not null default 'USD',
  current_fx_rate numeric(14, 4) not null default 1000,
  deviation_alert_threshold_pct numeric(6, 2) not null default 10,
  contingency_pct numeric(6, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  parent_id uuid references categories(id) on delete cascade,
  name text not null,
  budget_amount numeric(14, 2) not null default 0,
  budget_currency currency_code not null default 'USD',
  estimated_final_amount_override numeric(14, 2),
  sort_order int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index categories_project_id_idx on categories(project_id);
create index categories_parent_id_idx on categories(parent_id);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  category_id uuid references categories(id) on delete set null,
  contact_name text,
  phone text,
  email text,
  usual_currency currency_code not null default 'USD',
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index suppliers_project_id_idx on suppliers(project_id);
create index suppliers_category_id_idx on suppliers(category_id);

create table commitments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  supplier_id uuid not null references suppliers(id) on delete restrict,
  category_id uuid not null references categories(id) on delete restrict,
  description text not null,
  contract_date date not null default current_date,
  currency currency_code not null default 'USD',
  total_amount numeric(14, 2) not null,
  advance_amount numeric(14, 2) not null default 0,
  payment_terms text,
  status commitment_status not null default 'active',
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index commitments_project_id_idx on commitments(project_id);
create index commitments_supplier_id_idx on commitments(supplier_id);
create index commitments_category_id_idx on commitments(category_id);

create table commitment_installments (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references commitments(id) on delete cascade,
  due_date date not null,
  amount numeric(14, 2) not null,
  status installment_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index commitment_installments_commitment_id_idx on commitment_installments(commitment_id);
create index commitment_installments_due_date_idx on commitment_installments(due_date);

create table funding_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  type funding_source_type not null default 'otro',
  currency currency_code not null default 'USD',
  total_amount numeric(14, 2) not null default 0,
  used_amount numeric(14, 2) not null default 0,
  available_date date,
  status funding_source_status not null default 'disponible',
  financial_cost text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index funding_sources_project_id_idx on funding_sources(project_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  category_id uuid not null references categories(id) on delete restrict,
  supplier_id uuid references suppliers(id) on delete set null,
  commitment_id uuid references commitments(id) on delete set null,
  commitment_installment_id uuid references commitment_installments(id) on delete set null,
  funding_source_id uuid references funding_sources(id) on delete set null,
  date date not null default current_date,
  description text not null,
  currency currency_code not null,
  amount numeric(14, 2) not null,
  -- ARS por USD vigente al momento del pago; nunca se recalcula (FX histórico fijo).
  fx_rate numeric(14, 4) not null,
  amount_usd numeric(14, 2) not null,
  amount_ars numeric(14, 2) not null,
  payment_method payment_method not null,
  payment_type payment_type not null,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_project_id_idx on payments(project_id);
create index payments_category_id_idx on payments(category_id);
create index payments_supplier_id_idx on payments(supplier_id);
create index payments_commitment_id_idx on payments(commitment_id);
create index payments_funding_source_id_idx on payments(funding_source_id);
create index payments_date_idx on payments(date);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  payment_id uuid references payments(id) on delete cascade,
  commitment_id uuid references commitments(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);
create index attachments_payment_id_idx on attachments(payment_id);
create index attachments_commitment_id_idx on attachments(commitment_id);

-- Plan de cash flow "original" (sección 14): una fila por rubro y mes, tal como venía en
-- el Excel de origen. Es independiente del forecast (que sale de compromisos) y de lo
-- real (que sale de pagos), para poder comparar los tres y detectar desvíos de timing.
create table budget_cashflow_plan (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  month date not null,
  planned_amount numeric(14, 2) not null,
  currency currency_code not null default 'USD',
  created_at timestamptz not null default now()
);
create unique index budget_cashflow_plan_unique on budget_cashflow_plan(category_id, month);
create index budget_cashflow_plan_project_id_idx on budget_cashflow_plan(project_id);

-- Sin autenticación en V1 (uso personal) — RLS queda deshabilitado a propósito.
-- Antes de exponer la app públicamente hay que activar RLS por usuario/proyecto.

-- IMPORTANTE (paso manual único, una sola vez): para que supabase-js pueda
-- consultar este schema hace falta agregarlo en el dashboard de Supabase en
-- Project Settings > Data API > "Exposed schemas" (agregar `obra_liebres` a la
-- lista, que por defecto sólo trae `public`). Sin ese paso, PostgREST devuelve
-- error "schema must be one of the following: public" al hacer cualquier query.
