import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Card-shaped dashboard panel with an optional "view all" affordance. */
export function Section({
  title,
  description,
  action,
  href,
  hrefLabel = "View all",
  className,
  bodyClassName,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  href?: string;
  hrefLabel?: string;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "panel-lit flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[14.5px] font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ??
          (href ? (
            <Link
              href={href}
              className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-[var(--brand)] hover:underline"
            >
              {hrefLabel}
              <ArrowRight className="size-3.5" />
            </Link>
          ) : null)}
      </div>
      <div className={cn("flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}
