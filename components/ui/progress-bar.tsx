import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  tone = "brand",
  showLabel = false,
  label,
}: {
  value: number;
  className?: string;
  tone?: "brand" | "success" | "warning";
  showLabel?: boolean;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const bar = {
    brand: "bg-[var(--brand)]",
    success: "bg-[var(--success)]",
    warning: "bg-[var(--warning)]",
  }[tone];

  return (
    <div className={cn("w-full", className)}>
      {showLabel || label ? (
        <div className="mb-1.5 flex items-center justify-between text-[12px]">
          <span className="text-muted-foreground">{label}</span>
          <span className="tabular font-medium">{pct}%</span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
