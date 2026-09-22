"use client";

import { Area, AreaChart, CartesianGrid, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { monthLabel } from "@/lib/finance/currency";

export interface CashCurveDatum {
  month: string;
  cashBalanceUsd: number;
}

export function CashCurveChart({ data, peakGapMonth }: { data: CashCurveDatum[]; peakGapMonth: string | null }) {
  const chartData = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
  const peak = peakGapMonth ? chartData.find((d) => d.month === peakGapMonth) : undefined;
  const hasNegative = data.some((d) => d.cashBalanceUsd < 0);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="cashCurveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(value) => `$${Number(value).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`} />
        <ReferenceLine y={0} stroke={hasNegative ? "#dc2626" : "#94a3b8"} strokeWidth={hasNegative ? 2 : 1} />
        <Area
          type="monotone"
          dataKey="cashBalanceUsd"
          name="Caja proyectada"
          stroke="#059669"
          strokeWidth={2}
          fill="url(#cashCurveFill)"
        />
        {peak && (
          <ReferenceDot x={peak.label} y={peak.cashBalanceUsd} r={5} fill="#dc2626" stroke="white" strokeWidth={1.5} />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
