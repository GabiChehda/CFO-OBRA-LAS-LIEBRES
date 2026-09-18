"use client";

import { Line, ComposedChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Bar } from "recharts";
import { monthLabel } from "@/lib/finance/currency";

export interface CashFlowChartDatum {
  month: string;
  originalUsd: number;
  forecastUsd: number;
  actualUsd: number;
  cashBalanceUsd: number;
}

export function CashFlowChart({ data }: { data: CashFlowChartDatum[] }) {
  const chartData = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(value) => `$${Number(value).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="originalUsd" fill="#cbd5e1" name="Presupuesto original" radius={[3, 3, 0, 0]} />
        <Bar dataKey="actualUsd" fill="#0f172a" name="Pagos realizados" radius={[3, 3, 0, 0]} />
        <Line type="monotone" dataKey="forecastUsd" stroke="#2563eb" strokeWidth={2} name="Forecast" dot={false} />
        <Line type="monotone" dataKey="cashBalanceUsd" stroke="#059669" strokeWidth={2} name="Caja final" dot={false} strokeDasharray="4 3" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
