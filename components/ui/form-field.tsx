import * as React from "react";
import { cn } from "@/lib/utils";

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="flex items-center gap-1 text-[13px] font-medium text-foreground"
        >
          {label}
          {required ? <span className="text-[var(--danger)]">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-[12.5px] text-[var(--danger)]">{error}</p>
      ) : hint ? (
        <p className="text-[12.5px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormGrid({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", className)} {...props} />;
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-3 py-2.5 text-[13px] text-[var(--danger)]">
      {message}
    </div>
  );
}
