import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Sin login en V1: un único cliente con la publishable key alcanza tanto para
// Server Components (lectura) como para Server Actions (mutaciones) — no hace
// falta manejar cookies de sesión ni distinguir cliente browser/servidor.
let cached: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copiá .env.local.example a .env.local y completá los valores de tu proyecto Supabase."
    );
  }

  cached = createClient<Database>(url, publishableKey, {
    auth: { persistSession: false },
    // Este proyecto Supabase es compartido con otra app — todo lo de Obra Las
    // Liebres vive en su propio schema `obra_liebres`, no en `public`, para no
    // colisionar con sus tablas. Hay que agregar `obra_liebres` a "Exposed
    // schemas" en Project Settings > Data API del dashboard de Supabase.
    db: { schema: "obra_liebres" },
  });
  return cached;
}
