"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { AXIS_PROPS, ChartTooltip } from "./chart-tooltip";

export function RevenueChart({
  data,
  currency,
}: {
  data: { month: string; revenue: number }[];
  /** Whose money this is. The axis and the tooltip both need it — a rupee tick
   *  above an Australian gym's revenue is the same bug twice. */
  currency: string;
}) {
  const points = data.map((d) => ({ ...d, date: new Date(d.month) }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            {...AXIS_PROPS}
            tickFormatter={(d: Date) => format(d, "MMM")}
            dy={6}
          />
          <YAxis
            {...AXIS_PROPS}
            width={54}
            tickFormatter={(v: number) => formatCurrencyCompact(v, currency)}
          />
          <Tooltip
            cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
            content={
              <ChartTooltip
                formatValue={(v) => formatCurrency(v, currency)}
                labelFormatter={(l) => format(new Date(l as string), "MMMM yyyy")}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#revenueFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
            // See metric-chart: a chart that mounts in a hidden tab never
            // finishes its draw animation and stays blank.
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
