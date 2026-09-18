import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar, MobileNav } from "@/components/Sidebar";
import { NuevoPagoButton } from "@/components/NuevoPagoButton";
import { loadProjectData } from "@/lib/data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mi Obra — Las Liebres",
  description: "Control financiero de la obra Las Liebres",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let quickAddProps: {
    categories: { id: string; name: string; parent_id: string | null }[];
    suppliers: { id: string; name: string }[];
    commitments: { id: string; description: string; supplier_id: string; category_id: string; currency: "ARS" | "USD" }[];
    installmentsByCommitment: Record<string, { id: string; due_date: string; amount: number; status: "pending" | "paid" }[]>;
    fundingSources: { id: string; name: string }[];
    defaultFxRate: number;
  } | null = null;
  let setupError: string | null = null;

  try {
    const data = await loadProjectData();
    quickAddProps = {
      categories: data.categories.map((c) => ({ id: c.id, name: c.name, parent_id: c.parent_id })),
      suppliers: data.suppliers.map((s) => ({ id: s.id, name: s.name })),
      commitments: data.commitments
        .filter((c) => c.status === "active" && !c.deleted_at)
        .map((c) => ({ id: c.id, description: c.description, supplier_id: c.supplier_id, category_id: c.category_id, currency: c.currency })),
      installmentsByCommitment: Object.fromEntries(
        [...data.installmentsByCommitmentId.entries()].map(([id, list]) => [
          id,
          list.map((i) => ({ id: i.id, due_date: i.due_date, amount: i.amount, status: i.status })),
        ])
      ),
      fundingSources: data.fundingSources.map((f) => ({ id: f.id, name: f.name })),
      defaultFxRate: data.project.current_fx_rate,
    };
  } catch (err) {
    setupError = err instanceof Error ? err.message : "No se pudo conectar con la base de datos.";
  }

  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        {setupError ? (
          <main className="flex min-h-screen items-center justify-center p-6">
            <div className="max-w-md rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              <p className="mb-2 font-semibold">Obra Las Liebres todavía no está lista</p>
              <p>{setupError}</p>
            </div>
          </main>
        ) : (
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 pb-16 md:pb-0">
              <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">{children}</main>
            </div>
            <MobileNav />
            {quickAddProps && <NuevoPagoButton {...quickAddProps} />}
          </div>
        )}
      </body>
    </html>
  );
}
