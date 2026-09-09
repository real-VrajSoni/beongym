import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { requireProspect } from "@/lib/auth";
import {
  INCLUDED,
  PURCHASABLE_PLANS,
  discountFor,
  perMonth,
} from "@/lib/platform-plans";
import { formatUsd } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Choose your plan" };

export default async function StartPlansPage() {
  const session = await requireProspect();
  const firstName = session.name.split(" ")[0];

  return (
    <>
      <header className="mb-8 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase">
          <Sparkles className="size-3" /> Step 1 of 2
        </span>
        <h1 className="mt-4 text-[26px] leading-tight font-semibold sm:text-[30px]">
          Welcome, {firstName}. Pick a plan.
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-[14px] text-muted-foreground">
          All four unlock the same platform — the longer ones simply cost less per month. Your gym
          goes live the moment you confirm.
        </p>
      </header>

      <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
        {PURCHASABLE_PLANS.map((plan) => {
          const features = INCLUDED;

          return (
            <div
              key={plan.key}
              className={cn(
                "relative flex flex-col rounded-[var(--radius-card)] border bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]",
                plan.popular ? "border-[var(--brand)]" : "border-[var(--border)]",
              )}
            >
              {plan.popular ? (
                <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand)] to-transparent" />
              ) : null}

              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[15.5px] font-semibold">{plan.name}</h2>
                {plan.popular ? (
                  <Badge tone="brand">Popular</Badge>
                ) : plan.bestValue ? (
                  <Badge tone="warning">Best value</Badge>
                ) : null}
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="tabular text-[13px] text-muted-foreground line-through">
                  {formatUsd(plan.listPrice)}
                </span>
                <span className="rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--success)]">
                  {discountFor(plan.key)}% off
                </span>
              </div>

              <p className="tabular mt-1 text-[28px] leading-none font-semibold">
                {formatUsd(plan.price)}
              </p>
              <p className="mt-1.5 text-[12px] text-muted-foreground">{plan.per}</p>
              <p className="mt-1 text-[12px] font-medium text-[var(--success)]">{plan.saving}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {formatUsd(Math.round(perMonth(plan.key) * 100) / 100)} a month
              </p>

              <p className="mt-3 text-[12.5px] text-muted-foreground">{plan.blurb}</p>

              <ul className="mt-4 flex-1 space-y-2">
                {features.slice(0, 4).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12.5px]">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--success)]" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className="mt-5 w-full"
                variant={plan.popular ? "primary" : "secondary"}
              >
                <Link href={`/start/checkout?plan=${plan.key}`}>
                  Choose {plan.name}
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-[12.5px] text-muted-foreground">
        Prices are in US dollars, the same in every country. Tax is worked out from yours at
        checkout. There is no free plan — every gym on the map has paid to be there.
      </p>
    </>
  );
}
