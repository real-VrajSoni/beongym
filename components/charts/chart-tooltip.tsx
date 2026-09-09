"use client";

import type { TooltipContentProps } from "recharts";

type Formatter = (value: number, name: string) => string;

/** Shared tooltip so every chart in the product reads the same way. */
export function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
  labelFormatter,
}: Partial<TooltipContentProps<number, string>> & {
  formatValue?: Formatter;
  labelFormatter?: (label: unknown) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-[var(--shadow-overlay)]">
      <p className="text-[11.5px] font-medium text-muted-foreground">
        {labelFormatter ? labelFormatter(label) : String(label ?? "")}
      </p>
      <div className="mt-1.5 space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: entry.color as string }}
              aria-hidden
            />
            <span className="text-[12px] text-muted-foreground">{entry.name}</span>
            <span className="tabular ml-auto text-[12.5px] font-semibold">
              {formatValue
                ? formatValue(Number(entry.value), String(entry.name))
                : String(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const AXIS_PROPS = {
  tick: { fill: "var(--subtle-foreground)", fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;
