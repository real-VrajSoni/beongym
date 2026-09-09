"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_PROPS, ChartTooltip } from "./chart-tooltip";

export type Series = { key: string; name: string; color: string };

/**
 * Line chart over the check-in timeline. X axis is the programme week so the
 * client sees "week 8", not a raw date.
 */
export function MetricChart({
  data,
  series,
  unit = "",
  height = 240,
  domainPadding = 1.5,
}: {
  data: readonly Record<string, unknown>[];
  series: Series[];
  unit?: string;
  height?: number;
  domainPadding?: number;
}) {
  const values = data.flatMap((d) =>
    series.map((s) => d[s.key]).filter((v): v is number => typeof v === "number"),
  );
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data as Record<string, unknown>[]} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="week"
            {...AXIS_PROPS}
            tickFormatter={(w: number) => `W${w}`}
            dy={6}
          />
          <YAxis
            {...AXIS_PROPS}
            width={44}
            domain={[
              Math.floor((min - domainPadding) * 10) / 10,
              Math.ceil((max + domainPadding) * 10) / 10,
            ]}
            tickFormatter={(v: number) => `${v}`}
          />
          <Tooltip
            cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
            content={
              <ChartTooltip
                formatValue={(v) => `${v}${unit}`}
                labelFormatter={(l) => `Week ${l}`}
              />
            }
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 2.5, strokeWidth: 0, fill: s.color }}
              activeDot={{ r: 4.5, strokeWidth: 2, stroke: "var(--surface)" }}
              connectNulls
              // Recharts draws lines with an animated stroke-dasharray. If the
              // chart mounts while the tab is hidden the animation never runs
              // and the member is left with dots and no line, so it is off.
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
