import Link from "next/link";
import { ArrowRight, Check, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SetupStep = { label: string; done: boolean; href?: string };

/**
 * The Pro onboarding nudge.
 *
 * A store bought and never set up is a refund, so this sits at the top of
 * settings until every box is ticked and then disappears for good.
 */
export function StoreSetup({ steps, gymCode }: { steps: SetupStep[]; gymCode: string }) {
  const done = steps.filter((s) => s.done).length;
  const complete = done === steps.length;

  return (
    <div
      className={cn(
        "mb-5 rounded-[var(--radius-card)] border px-5 py-4",
        complete
          ? "border-[var(--success)]/25 bg-[var(--success-soft)]"
          : "border-[var(--brand)]/25 bg-[var(--brand-soft)]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className={cn(
              "text-[14px] font-semibold",
              complete ? "text-[var(--success)]" : "text-[var(--brand-soft-foreground)]",
            )}
          >
            {complete ? "Your store is ready." : "Set up your gym store"}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
            {complete ? (
              <>
                Everything is filled in — see it at{" "}
                <Link
                  href={`/gyms/${gymCode}`}
                  className="font-medium text-[var(--brand)] hover:underline"
                >
                  /gyms/{gymCode}
                </Link>
              </>
            ) : (
              <>
                <Clock3 className="size-3.5" /> About three minutes. {done} of {steps.length} done.
              </>
            )}
          </p>
        </div>

        {complete ? null : (
          <div className="h-1.5 w-full max-w-[180px] self-center overflow-hidden rounded-full bg-[var(--surface-muted)]">
            <div
              className="h-full rounded-full bg-[var(--brand)] transition-[width]"
              style={{ width: `${(done / steps.length) * 100}%` }}
            />
          </div>
        )}
      </div>

      {complete ? null : (
        <ul className="mt-3.5 grid gap-2 sm:grid-cols-2">
          {steps.map((step) => (
            <li key={step.label} className="flex items-center gap-2.5 text-[13px]">
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full",
                  step.done
                    ? "bg-[var(--success)] text-white"
                    : "border border-[var(--border-strong)]",
                )}
                aria-hidden
              >
                {step.done ? <Check className="size-2.5" /> : null}
              </span>
              {step.done ? (
                <span className="text-muted-foreground line-through">{step.label}</span>
              ) : step.href ? (
                <Link href={step.href} className="group inline-flex items-center gap-1">
                  {step.label}
                  <ArrowRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ) : (
                <span>{step.label}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
