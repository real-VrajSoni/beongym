"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Lock,
  Sparkles,
} from "lucide-react";
import {
  INCLUDED,
  PURCHASABLE_PLANS,
  discountFor,
  perMonth,
  type PlatformPlan,
} from "@/lib/platform-plans";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Four ways to buy the same thing.
 *
 * Every plan unlocks the identical product — the only variable is how long it
 * lasts and what that works out to per month, which is the one number that
 * actually decides between them. So the per-month figure is on every card, and
 * the list price beside it is what those months cost bought one at a time.
 *
 * There is no free column. That is the point of the page.
 */
export function PricingTable({ signedIn }: { signedIn: boolean }) {
  const hrefFor = (plan: PlatformPlan) =>
    signedIn ? `/start/checkout?plan=${plan.key}` : `/signup?plan=${plan.key}`;

  return (
    <>
      <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
        {PURCHASABLE_PLANS.map((plan) => (
          <PlanCard key={plan.key} plan={plan} href={hrefFor(plan)} />
        ))}
      </div>

      <p className="mx-auto mt-6 max-w-2xl text-center text-[12.5px] text-[var(--mk-fg-subtle)]">
        Every plan unlocks the same platform — the longer ones just cost less per month.
        {signedIn
          ? " You're signed in, so choosing one takes you straight to checkout."
          : " You'll create an account first, then confirm."}{" "}
        Prices are in US dollars, the same in every country. Tax is worked out from your own
        country at checkout.
      </p>
    </>
  );
}

function PlanCard({ plan, href }: { plan: PlatformPlan; href: string }) {
  const [open, setOpen] = useState(false);
  const features = INCLUDED;
  const shown = open ? features : features.slice(0, 3);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen((v) => !v);
        }
      }}
      className={cn(
        "price-card relative flex cursor-pointer flex-col rounded-2xl border p-5 text-left outline-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mk-bg)]",
        plan.popular
          ? "border-[var(--brand)]/60 bg-[var(--brand)]/[0.08] hover:border-[var(--brand)]"
          : "border-[var(--mk-border-strong)] bg-[var(--mk-panel)] hover:border-[var(--brand)]/50",
      )}
    >
      {plan.popular ? (
        <span className="absolute -top-2.5 left-5 rounded-full bg-[var(--brand)] px-2.5 py-0.5 text-[10.5px] font-semibold tracking-wide text-[var(--brand-foreground)] uppercase">
          Most gyms pick this
        </span>
      ) : plan.bestValue ? (
        <span className="absolute -top-2.5 left-5 rounded-full bg-[var(--warning)] px-2.5 py-0.5 text-[10.5px] font-semibold tracking-wide text-white uppercase">
          Best value
        </span>
      ) : null}

      <h3 className="text-[16px] font-semibold">{plan.name}</h3>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="tabular text-[13.5px] text-[var(--mk-fg-subtle)] line-through decoration-[var(--danger)] decoration-2">
          {formatUsd(plan.listPrice)}
        </span>
        <span className="rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--success)]">
          {discountFor(plan.key)}% off
        </span>
      </div>

      <p className="tabular mt-1 text-[32px] leading-none font-semibold">
        {formatUsd(plan.price)}
      </p>
      <p className="mt-1.5 text-[12px] text-[var(--mk-fg-subtle)]">{plan.per}</p>

      <p className="mt-2 text-[12.5px] font-medium text-[var(--mk-fg-muted)]">
        {formatUsd(Math.round(perMonth(plan.key) * 100) / 100)} a month
      </p>

      <span
        className={cn(
          "offer-pulse mt-3.5 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
          "bg-[var(--success-soft)] text-[var(--success)]",
        )}
      >
        <Sparkles className="size-3" />
        {plan.saving}
      </span>

      <p className="mt-3.5 text-[12.5px] leading-relaxed text-[var(--mk-fg-muted)]">{plan.blurb}</p>

      <ul className="mt-3.5 space-y-2">
        {shown.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[12.5px]">
            <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--success)]" />
            <span className="text-[var(--mk-fg-muted)]">{f}</span>
          </li>
        ))}
      </ul>

      <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--brand)]">
        {open ? "Show less" : `${features.length - 3} more included`}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </span>

      <Link
        href={href}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-[13.5px] font-medium transition-colors",
          plan.popular
            ? "bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand-hover)]"
            : "border border-[var(--mk-border-strong)] bg-[var(--mk-panel-strong)] hover:bg-[var(--brand)] hover:text-[var(--brand-foreground)]",
        )}
      >
        <Lock className="size-3.5" />
        {`Get ${plan.name}`}
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
