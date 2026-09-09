"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { AXIS_PROPS, ChartTooltip } from "./chart-tooltip";

/**
 * Counted-series bar chart — visits per day, visits per hour.
 *
 * Axis formatting is selected by name rather than by callback: functions
 * cannot cross the server/client boundary, and every caller here is a Server
 * Component.
 */
export type BarAxisFormat = "date" | "hour" | "plain";

function formatTick(value: unknown, mode: BarAxisFormat): string {
  if (mode === "date") return format(new Date(String(value)), "d MMM");
  if (mode === "hour") return `${value}`;
  return String(value);
}

function formatLabel(value: unknown, mode: BarAxisFormat): string {
  if (mode === "date") return format(new Date(String(value)), "EEEE, d MMM");
  if (mode === "hour") return `${value}:00 – ${Number(value) + 1}:00`;
  return String(value);
}

export function CountBarChart({
  data,
  xKey,
  yKey = "visits",
  name = "Visits",
  height = 220,
  xFormat = "plain",
}: {
  data: Record<string, unknown>[];
  xKey: string;
  yKey?: string;
  name?: string;
  height?: number;
  xFormat?: BarAxisFormat;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={xKey}
            {...AXIS_PROPS}
            tickFormatter={(v) => formatTick(v, xFormat)}
            dy={6}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis {...AXIS_PROPS} width={34} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "var(--surface-muted)" }}
            content={<ChartTooltip labelFormatter={(l) => formatLabel(l, xFormat)} />}
          />
          <Bar
            dataKey={yKey}
            name={name}
            radius={[4, 4, 0, 0]}
            fill="var(--chart-1)"
            maxBarSize={38}
            // See metric-chart: a chart that mounts in a hidden tab never
            // finishes its grow animation and stays blank.
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
