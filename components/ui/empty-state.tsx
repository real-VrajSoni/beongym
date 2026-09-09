import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-5 py-10" : "px-6 py-16",
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]">
        <Icon className="size-5 text-[var(--subtle-foreground)]" />
      </div>
      <p className="mt-3.5 text-[14px] font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
