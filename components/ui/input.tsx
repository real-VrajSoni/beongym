import * as React from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-foreground shadow-[var(--shadow-card)] transition-colors placeholder:text-[var(--subtle-foreground)] focus:border-[var(--brand)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-ring)] disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-[var(--danger)]";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, "h-9.5 py-2", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldBase, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />
));
Textarea.displayName = "Textarea";

/**
 * Native select, styled to match. Deliberately native: it gives the correct
 * wheel picker on mobile, which matters for client-side check-in forms.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(fieldBase, "h-9.5 appearance-none py-2 pr-9", className)}
      {...props}
    >
      {children}
    </select>
    <svg
      className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-[var(--subtle-foreground)]"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
));
Select.displayName = "Select";
