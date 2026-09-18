"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface BudgetVsEstimateDatum {
  name: string;
  presupuesto: number;
  estimado: number;
}

export function BudgetVsEstimateChart({ data }: { data: BudgetVsEstimateDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(value) => `$${Number(value).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`} />
        <Bar dataKey="presupuesto" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Presupuesto" />
        <Bar dataKey="estimado" fill="#0f172a" radius={[4, 4, 0, 0]} name="Estimado final" />
      </BarChart>
    </ResponsiveContainer>
  );
}
