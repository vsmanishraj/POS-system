"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

export function SalesChart({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0f766e" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#0f766e" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="value" stroke="#0f766e" fillOpacity={1} fill="url(#salesGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
