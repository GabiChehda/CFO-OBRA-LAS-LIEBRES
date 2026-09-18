import { getSupabaseClient } from "@/lib/supabase/client";
import { getCurrentProject } from "@/lib/project";
import type {
  BudgetCashflowPlanEntry,
  Category,
  Commitment,
  CommitmentInstallment,
  FundingSource,
  Payment,
  Project,
  Supplier,
} from "@/lib/database.types";

export interface ProjectData {
  project: Project;
  categories: Category[];
  suppliers: Supplier[];
  commitments: Commitment[];
  installments: CommitmentInstallment[];
  installmentsByCommitmentId: Map<string, CommitmentInstallment[]>;
  payments: Payment[];
  fundingSources: FundingSource[];
  cashflowPlan: BudgetCashflowPlanEntry[];
}

/** Punto único de carga de datos: todas las pantallas parten de esto para no
 * repetir queries ni desalinear los filtros de `deleted_at` / `project_id`. */
export async function loadProjectData(): Promise<ProjectData> {
  const supabase = getSupabaseClient();
  const project = await getCurrentProject();

  const [categoriesRes, suppliersRes, commitmentsRes, paymentsRes, fundingRes, planRes] = await Promise.all([
    supabase.from("categories").select("*").eq("project_id", project.id).is("deleted_at", null).order("sort_order"),
    supabase.from("suppliers").select("*").eq("project_id", project.id).is("deleted_at", null).order("name"),
    supabase.from("commitments").select("*").eq("project_id", project.id).is("deleted_at", null),
    supabase
      .from("payments")
      .select("*")
      .eq("project_id", project.id)
      .is("deleted_at", null)
      .order("date", { ascending: false }),
    supabase.from("funding_sources").select("*").eq("project_id", project.id).is("deleted_at", null).order("name"),
    supabase.from("budget_cashflow_plan").select("*").eq("project_id", project.id),
  ]);

  for (const res of [categoriesRes, suppliersRes, commitmentsRes, paymentsRes, fundingRes, planRes]) {
    if (res.error) throw res.error;
  }

  const commitments = commitmentsRes.data ?? [];
  let installments: CommitmentInstallment[] = [];
  if (commitments.length > 0) {
    const { data, error } = await supabase
      .from("commitment_installments")
      .select("*")
      .in(
        "commitment_id",
        commitments.map((c) => c.id)
      )
      .order("due_date");
    if (error) throw error;
    installments = data ?? [];
  }

  const installmentsByCommitmentId = new Map<string, CommitmentInstallment[]>();
  for (const installment of installments) {
    if (!installmentsByCommitmentId.has(installment.commitment_id)) {
      installmentsByCommitmentId.set(installment.commitment_id, []);
    }
    installmentsByCommitmentId.get(installment.commitment_id)!.push(installment);
  }

  return {
    project,
    categories: categoriesRes.data ?? [],
    suppliers: suppliersRes.data ?? [],
    commitments,
    installments,
    installmentsByCommitmentId,
    payments: paymentsRes.data ?? [],
    fundingSources: fundingRes.data ?? [],
    cashflowPlan: planRes.data ?? [],
  };
}
