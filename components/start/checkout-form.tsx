"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CreditCard, Lock, ShieldCheck } from "lucide-react";
import { purchasePlanAction } from "@/app/actions/checkout";
import { previewPlanPriceAction, type PricePreview } from "@/app/actions/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { FormError, FormField } from "@/components/ui/form-field";
import { useAction } from "@/components/ui/use-action";
import { formatCurrency, formatUsd } from "@/lib/format";
import { suggestCurrency } from "@/lib/geo/currency";
import { INCLUDED, ELITE_EXTRAS, discountFor, type PlatformPlan } from "@/lib/platform-plans";

export function CheckoutForm({ plan }: { plan: PlatformPlan }) {
  const { pending, error, fieldErrors, run } = useAction();
  const [gymName, setGymName] = useState("");
  const [city, setCity] = useState("");

  // The city suggests the currency, and the owner overrides it if their gym
  // prices in something else. Tracked separately from `city` so a suggestion
  // never overwrites a choice they have already made by hand.
  const [currency, setCurrency] = useState(suggestCurrency());
  const [touchedCurrency, setTouchedCurrency] = useState(false);
  const suggested = suggestCurrency(city);
  const [lastSuggestion, setLastSuggestion] = useState(suggested);
  if (suggested !== lastSuggestion) {
    // Adjusted during render, not in an effect, so the select never paints the
    // previous city's currency for a frame.
    setLastSuggestion(suggested);
    if (!touchedCurrency) setCurrency(suggested);
  }

  const elite = plan.key === "LIFETIME";
  const amount = plan.price;

  /**
   * What the plan costs in the currency they picked.
   *
   * Asked of Dodo rather than converted here: a rate we looked up would be a
   * different number from the one on the card statement, which is worse than
   * showing none. An unsupported currency or a slow reply simply leaves the
   * dollar price standing on its own.
   *
   * The answer is stored with the currency it was for, so switching currency
   * cannot briefly show the previous one's figure — the render below only
   * trusts a quote whose currency still matches the selection.
   */
  const [quote, setQuote] = useState<{ for: string; price: PricePreview } | null>(null);
  useEffect(() => {
    if (currency === "USD") return;
    let live = true;
    previewPlanPriceAction(plan.key, currency).then((price) => {
      if (live) setQuote({ for: currency, price });
    });
    return () => {
      live = false;
    };
  }, [currency, plan.key]);

  const localPrice = quote && quote.for === currency && currency !== "USD" ? quote.price : null;

  /**
   * The same figures in the buyer's money, when Dodo has quoted one.
   *
   * `paying` is Dodo's own number. `wasPaying` is the list price scaled by the
   * rate implied by that quote — arithmetic of ours, not a second quote, which
   * is why it is only ever used for the struck-through "was" figure and never
   * for the amount anybody is asked to approve.
   */
  const rate = localPrice ? localPrice.amount / amount : null;
  // The headline is only in local money when local money is what gets charged.
  // Otherwise it stays in dollars and the conversion is an aside, because a
  // price shown as the amount due has to be the amount due.
  const lead = localPrice?.charged ? localPrice : null;
  const paying = lead ? formatCurrency(lead.amount, lead.currency) : formatUsd(amount);
  const wasPaying =
    lead && rate ? formatCurrency(plan.listPrice * rate, lead.currency) : formatUsd(plan.listPrice);

  const previewCode =
    (gymName
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, "")
      .split(/\s+/)
      .filter(Boolean)[0]
      ?.slice(0, 6) || "GYM") + "-4821";

  return (
    <form
      action={(fd) =>
        run(() => purchasePlanAction(fd), {
          onSuccess: (result) => {
            // The action grants nothing now; it returns where to pay. Without
            // this the button ran, succeeded, and visibly did nothing.
            if (result.checkoutUrl) {
              window.location.href = result.checkoutUrl;
              return;
            }
            // Simulated mode (no gateway) provisioned already; `id` is a path.
            if (result.id) window.location.href = result.id;
          },
        })
      }
      className="grid gap-6 lg:grid-cols-5"
    >
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
            <FormField
              label="City"
              htmlFor="city"
              error={fieldErrors.city}
              hint="Puts your gym on the map. A country works too if you would rather not say yet."
            >
              <Input
                id="city"
                name="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Oslo"
                className="h-11"
              />
            </FormField>
            <FormField
              label="What you charge members in"
              htmlFor="currency"
              error={fieldErrors.currency}
              hint={
                touchedCurrency || currency === suggested
                  ? "Every price in your workspace is shown in this. You can change it in settings."
                  : `We guessed ${suggested} from your city — change it if that is wrong.`
              }
            >
              <CurrencyField
                id="currency"
                value={currency}
                onChange={(next) => {
                  setTouchedCurrency(true);
                  setCurrency(next);
                }}
              />
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
              {discountFor("LIFETIME")}% off {wasPaying} — early bird, for a limited time. Never
              billed again.
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
              <p className="tabular text-[18px] font-semibold">{paying}</p>
              <p className="tabular text-[12px] text-muted-foreground line-through">{wasPaying}</p>
              {lead ? (
                // Priced and settled in dollars; converted for the statement.
                <p className="tabular mt-0.5 text-[11.5px] text-[var(--subtle-foreground)]">
                  {formatUsd(amount)} billed
                </p>
              ) : localPrice ? (
                <p className="tabular mt-0.5 text-[11.5px] text-[var(--subtle-foreground)]">
                  ≈ {formatCurrency(localPrice.amount, localPrice.currency)}
                </p>
              ) : null}
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
            <CreditCard /> Pay {paying}
          </Button>

          {lead ? (
            <p className="mt-2 text-center text-[12px] text-muted-foreground">
              Converted by Dodo at today&rsquo;s rate. The plan is priced in dollars, so the exact
              amount can move a little by the time you pay.
            </p>
          ) : localPrice ? (
            <p className="mt-2 text-center text-[12px] text-muted-foreground">
              Charged in US dollars — roughly{" "}
              {formatCurrency(localPrice.amount, localPrice.currency)} at today&rsquo;s rate.
            </p>
          ) : null}

          <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-[11.5px] leading-relaxed text-muted-foreground">
            <Lock className="mt-0.5 size-3 shrink-0" />
            You&rsquo;ll pay on Dodo Payments&rsquo; secure checkout — we never see your card. Tax
            is worked out there from your country and added on top. Your gym is created once the
            payment is confirmed.
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
