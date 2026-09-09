"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CreditCard, Lock, ShieldCheck } from "lucide-react";
import { purchasePlanAction } from "@/app/actions/checkout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError, FormField } from "@/components/ui/form-field";
import { useAction } from "@/components/ui/use-action";
import { formatUsd } from "@/lib/format";
import { INCLUDED, ELITE_EXTRAS, discountFor, type PlatformPlan } from "@/lib/platform-plans";

export function CheckoutForm({ plan }: { plan: PlatformPlan }) {
  const { pending, error, fieldErrors, run } = useAction();
  const [gymName, setGymName] = useState("");

  const elite = plan.key === "LIFETIME";
  const amount = plan.price;

  const previewCode =
    (gymName
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, "")
      .split(/\s+/)
      .filter(Boolean)[0]
      ?.slice(0, 6) || "GYM") + "-4821";

  return (
    <form action={(fd) => run(() => purchasePlanAction(fd))} className="grid gap-6 lg:grid-cols-5">
      <input type="hidden" name="plan" value={plan.key} />

      <div className="space-y-5 lg:col-span-3">
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-[15px] font-semibold">Your gym</h2>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            This creates the workspace. You can rename it later.
          </p>

          <div className="mt-4 space-y-4">
            <FormError message={error} />
            <FormField
              label="Gym name"
              htmlFor="gymName"
              required
              error={fieldErrors.gymName}
              hint={
                gymName.trim().length > 1
                  ? `Your gym code will look like ${previewCode}`
                  : "Your gym code identifies you across BeOnGym."
              }
            >
              <Input
                id="gymName"
                name="gymName"
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
                placeholder="Iron Temple Fitness"
                className="h-11"
                required
              />
            </FormField>
            <FormField label="City" htmlFor="city" error={fieldErrors.city}>
              <Input id="city" name="city" placeholder="Mumbai" className="h-11" />
            </FormField>
          </div>
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-[15px] font-semibold">What you&rsquo;re buying</h2>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {elite
              ? "One payment, and the platform is yours for as long as your gym exists."
              : `${plan.days} days of everything. Renew whenever you like — renewing early adds to the days you already have.`}
          </p>
          <ul className="mt-4 space-y-2">
            {(elite ? ELITE_EXTRAS : INCLUDED).slice(0, 5).map((f) => (
              <li key={f} className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
                <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--success)]" />
                {f}
              </li>
            ))}
          </ul>
          {elite ? (
            <p className="mt-4 text-[12.5px] text-[var(--success)]">
              {discountFor("LIFETIME")}% off {formatUsd(plan.listPrice)} — early bird, for a
              limited time. Never billed again.
            </p>
          ) : null}
        </div>
      </div>

      {/* Summary */}
      <aside className="lg:col-span-2">
        <div className="sticky top-20 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-[15px] font-semibold">Order summary</h2>

          <div className="mt-4 flex items-baseline justify-between gap-3 border-b border-[var(--border)] pb-4">
            <div>
              <p className="text-[13.5px] font-medium">BeOnGym {plan.name}</p>
              <p className="text-[12px] text-muted-foreground">
                {elite ? "One payment, no renewal" : `${plan.days} days of access`}
              </p>
            </div>
            <div className="text-right">
              <p className="tabular text-[18px] font-semibold">{formatUsd(amount)}</p>
              <p className="tabular text-[12px] text-muted-foreground line-through">
                {formatUsd(plan.listPrice)}
              </p>
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {(elite ? ELITE_EXTRAS : INCLUDED).slice(0, 4).map((f) => (
              <li key={f} className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
                <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--success)]" />
                {f}
              </li>
            ))}
          </ul>

          <Button
            type="submit"
            size="lg"
            loading={pending}
            disabled={gymName.trim().length < 2}
            className="mt-5 h-11 w-full"
          >
            <CreditCard /> Pay {formatUsd(amount)}
          </Button>

          <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-[var(--warning)]/25 bg-[var(--warning-soft)] px-3 py-2 text-[11.5px] leading-relaxed text-[var(--warning)]">
            <Lock className="mt-0.5 size-3 shrink-0" />
            No card is charged. Dodo Payments is not connected yet, so this records the order and
            opens your gym immediately. Tax is added at the real checkout, worked out from your
            country.
          </p>

          <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-[var(--subtle-foreground)]">
            <ShieldCheck className="size-3" /> Your gym&rsquo;s data is isolated from every other
            gym.
          </p>

          <Link
            href="/start/plans"
            className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Choose a different plan
          </Link>
        </div>
      </aside>
    </form>
  );
}
