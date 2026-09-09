import * as React from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  delta,
  /** Set when a fall in the number is the good outcome (e.g. monthly churn). */
  invertDelta = false,
  /** Set when the direction carries no judgement (a bulking client gaining weight). */
  neutralDelta = false,
  accent = false,
  className,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  delta?: { value: number; suffix?: string } | null;
  invertDelta?: boolean;
  neutralDelta?: boolean;
  accent?: boolean;
  className?: string;
}) {
  const isUp = delta ? delta.value > 0 : false;
  const good = delta ? (invertDelta ? delta.value < 0 : delta.value > 0) : false;
  const DeltaIcon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={cn(
        "panel-lit relative isolate overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {accent ? (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand)] to-transparent"
        />
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12.5px] font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-lg",
              accent
                ? "bg-[var(--brand-soft)] text-[var(--brand-soft-foreground)]"
                : "bg-[var(--surface-muted)] text-[var(--subtle-foreground)]",
            )}
          >
            <Icon className="size-3.5" />
          </span>
        ) : null}
      </div>
      <p className="tabular mt-2.5 text-[23px] leading-tight font-semibold text-foreground sm:text-[27px] sm:leading-none">
        {value}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {delta && delta.value !== 0 ? (
          <span
            className={cn(
              "tabular inline-flex items-center gap-0.5 whitespace-nowrap text-[12px] font-medium",
              neutralDelta
                ? "text-muted-foreground"
                : good
                  ? "text-[var(--success)]"
                  : "text-[var(--danger)]",
            )}
          >
            <DeltaIcon className="size-3" />
            {Math.abs(delta.value).toLocaleString("en-IN", { maximumFractionDigits: 1 })}
            {delta.suffix ?? "%"}
          </span>
        ) : null}
        {hint ? (
          <span className="text-[12px] whitespace-nowrap text-muted-foreground">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}
