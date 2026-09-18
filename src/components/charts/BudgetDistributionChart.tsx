"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface DistributionDatum {
  name: string;
  value: number;
}

const COLORS = ["#0f172a", "#1d4ed8", "#0891b2", "#059669", "#65a30d", "#ca8a04", "#c2410c", "#be123c", "#7c3aed"];

export function BudgetDistributionChart({ data }: { data: DistributionDatum[] }) {
  const filtered = data.filter((d) => d.value > 0);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={filtered} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {filtered.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `$${Number(value).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`} />
        <Legend wrapperStyle={{ fontSize: 11 }} layout="vertical" align="right" verticalAlign="middle" />
      </PieChart>
    </ResponsiveContainer>
  );
}
