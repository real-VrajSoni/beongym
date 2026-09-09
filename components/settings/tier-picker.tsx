"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Infinity as InfinityIcon, RefreshCw, Sparkles } from "lucide-react";
import { purchaseAccessAction } from "@/app/actions/gym";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/ui/use-action";
import { formatUsd } from "@/lib/format";
import {
  INCLUDED,
  ELITE_EXTRAS,
  PURCHASABLE_PLANS,
  discountFor,
  perMonth,
} from "@/lib/platform-plans";
import { cn } from "@/lib/utils";

/**
 * Buy or renew, from inside the workspace.
 *
 * The owner's own copy of the pricing page, reading from the same catalogue so
 * they never see one price here and another on the marketing site. What it says
 * depends on where they stand: renew, extend, or upgrade to never renewing
 * again.
 */
export function TierPicker({
  canEdit,
  daysRemaining,
  lifetime,
}: {
  canEdit: boolean;
  daysRemaining: number;
  lifetime: boolean;
}) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [target, setTarget] = useState<string | null>(null);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {PURCHASABLE_PLANS.map((plan) => {
        const elite = plan.key === "LIFETIME";
        const isCurrent = lifetime ? elite : false;
        // An Elite gym has bought everything there is to buy.
        const disabled = !canEdit || lifetime;

        const label = elite
          ? lifetime
            ? "You have this"
            : "Buy it outright"
          : lifetime
            ? "Not needed on Elite"
            : daysRemaining > 0
              ? `Add ${plan.days} days`
              : `Buy ${plan.days} days`;

        return (
          <div
            key={plan.key}
            className={cn(
              "relative flex flex-col rounded-[var(--radius-card)] border bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]",
              isCurrent ? "border-[var(--brand)]" : "border-[var(--border)]",
            )}
          >
            {isCurrent ? (
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand)] to-transparent" />
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[15px] font-semibold">{plan.name}</h3>
              {isCurrent ? (
                <Badge tone="brand" dot>
                  Current
                </Badge>
              ) : elite ? (
                <Badge tone="warning">Best value</Badge>
              ) : null}
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <p className="tabular text-[26px] leading-none font-semibold">
                {formatUsd(plan.price)}
              </p>
              <span className="tabular text-[13px] text-muted-foreground line-through">
                {formatUsd(plan.listPrice)}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">{plan.per}</p>
            <p className="mt-1.5 text-[12px] font-medium text-[var(--success)]">
              {plan.saving} · {discountFor(plan.key)}% off
            </p>
            {!elite ? (
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {formatUsd(Math.round(perMonth(plan.key) * 100) / 100)} a month
              </p>
            ) : null}

            <p className="mt-3 text-[12.5px] text-muted-foreground">{plan.blurb}</p>

            <ul className="mt-4 flex-1 space-y-2">
              {(elite ? ELITE_EXTRAS : INCLUDED).slice(0, 4).map((f) => (
                <li key={f} className="flex items-start gap-2 text-[12.5px]">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--success)]" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>

            {target === plan.key ? (
              <div className="mt-4 rounded-xl border border-[var(--brand)]/30 bg-[var(--brand-soft)] p-3">
                <p className="text-[12.5px] text-[var(--brand-soft-foreground)]">
                  {elite
                    ? `${formatUsd(plan.price)} once, and you never pay us again.`
                    : daysRemaining > 0
                      ? `${formatUsd(plan.price)} adds ${plan.days} days on top of the ${daysRemaining} you have left.`
                      : `${formatUsd(plan.price)} for ${plan.days} days, starting today.`}
                </p>
                <div className="mt-2.5 flex gap-2">
                  <Button
                    size="sm"
                    loading={pending}
                    onClick={() =>
                      run(() => purchaseAccessAction(plan.key), {
                        onSuccess: () => {
                          setTarget(null);
                          router.refresh();
                        },
                      })
                    }
                  >
                    Confirm
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setTarget(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                className="mt-4 w-full"
                variant={elite ? "primary" : "secondary"}
                disabled={disabled || (elite && lifetime)}
                onClick={() => setTarget(plan.key)}
              >
                {elite ? <InfinityIcon /> : daysRemaining > 0 ? <Sparkles /> : <RefreshCw />}
                {label}
                {!disabled ? <ArrowRight /> : null}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
