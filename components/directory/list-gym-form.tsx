"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CreditCard, MapPin, PartyPopper } from "lucide-react";
import { attachOwnerAction, listGymAction } from "@/app/actions/list-gym";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { FormError, FormField, FormGrid } from "@/components/ui/form-field";
import { useAction } from "@/components/ui/use-action";
import { ImageUpload } from "@/components/settings/image-upload";
import { MapPicker } from "@/components/directory/map-picker";
import { PhoneField } from "@/components/ui/phone-field";
import { CITY_OPTIONS } from "@/lib/geo/places";
import {
  INCLUDED,
  PURCHASABLE_PLANS,
  discountFor,
  perMonth,
  planByKey,
  type PlanKey,
} from "@/lib/platform-plans";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

const SWATCHES = ["#7c6cff", "#2dd4bf", "#5aa2f5", "#f0709f", "#e8a33d", "#3ecf7e", "#f0696f"];

type Step = "choose" | "gym" | "pay" | "done";

/**
 * List a gym without an account.
 *
 * One form, three panels: what the gym is, the payment, and the receipt. The
 * whole thing stays in a single form element so nothing typed in step one is
 * lost when the payment step is shown — the steps are presentation, not
 * separate submissions.
 *
 * There is no unpaid path through here. Every gym on the map has bought a
 * window of access, so the first screen is which window, not whether.
 */
export function ListGymForm() {
  const router = useRouter();
  const { pending, error, fieldErrors, run } = useAction();
  const [step, setStep] = useState<Step>("choose");
  const [planKey, setPlanKey] = useState<PlanKey>("MONTHLY");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [accent, setAccent] = useState(SWATCHES[0]);
  const [code, setCode] = useState<string | null>(null);

  const ready = name.trim().length >= 2 && city.trim().length >= 2;
  const plan = planByKey(planKey);

  return (
    <div>
      <Steps step={step} />

      {step === "choose" ? (
        <ChoosePlan
          value={planKey}
          onPick={(next) => {
            setPlanKey(next);
            setStep("gym");
          }}
        />
      ) : step === "done" && code ? (
        <Done code={code} name={name} />
      ) : (
        <form
          action={(fd) =>
            run(
              async () => {
                const result = await listGymAction(fd);
                if (result.ok && result.code) setCode(result.code);
                return result;
              },
              {
                onSuccess: () => {
                  setStep("done");
                  router.refresh();
                },
              },
            )
          }
          className="mt-6"
        >
          <input type="hidden" name="plan" value={planKey} />
          <FormError message={error} />

          {/* Step one stays mounted under the payment step so its values are
              still in the form when it submits. */}
          <div className={cn("space-y-5", step !== "gym" && "hidden")}>
            <FormGrid>
              <FormField label="Gym name" htmlFor="name" required error={fieldErrors.name}>
                <Input
                  id="name"
                  name="name"
                  placeholder="Iron Temple Fitness"
                  className="h-11"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </FormField>
              <FormField label="City" htmlFor="city" required error={fieldErrors.city}>
                <Input
                  id="city"
                  name="city"
                  list="list-cities"
                  placeholder="Lisbon"
                  className="h-11"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
                <datalist id="list-cities">
                  {CITY_OPTIONS.map((c) => (
                    <option key={c} value={c.split(",")[0]} label={c} />
                  ))}
                </datalist>
              </FormField>
            </FormGrid>

            <FormField label="One line about the gym" htmlFor="tagline" error={fieldErrors.tagline}>
              <Input
                id="tagline"
                name="tagline"
                placeholder="Strength is earned, never given."
                className="h-11"
              />
            </FormField>

            <FormGrid>
              <FormField label="Phone" htmlFor="phone" required error={fieldErrors.phone}>
                <PhoneField id="phone" name="phone" required className="[&_input]:h-11 [&_button]:h-11" />
              </FormField>
              <FormField
                label="Email"
                htmlFor="email"
                required
                error={fieldErrors.email}
                hint="Your receipt goes here."
              >
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@yourgym.com"
                  className="h-11"
                  required
                />
              </FormField>
            </FormGrid>

            <FormField label="Address" htmlFor="address" error={fieldErrors.address}>
              <Textarea id="address" name="address" rows={2} placeholder="Street, area, postcode" />
            </FormField>

            <FormField
              label="About the gym"
              htmlFor="description"
              error={fieldErrors.description}
              hint="What makes it worth walking into. A short paragraph is plenty."
            >
              <Textarea id="description" name="description" rows={4} />
            </FormField>

            <FormGrid>
              <FormField
                label="Facilities"
                htmlFor="amenities"
                error={fieldErrors.amenities}
                hint="Comma separated."
              >
                <Input
                  id="amenities"
                  name="amenities"
                  placeholder="Free weights, Cardio floor, Showers"
                  className="h-11"
                />
              </FormField>
              <FormField label="Opening hours" htmlFor="openingHours" error={fieldErrors.openingHours}>
                <Input
                  id="openingHours"
                  name="openingHours"
                  placeholder="Mon–Sat 6am–10pm"
                  className="h-11"
                />
              </FormField>
            </FormGrid>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <p className="mb-3 text-[13px] font-medium">Logo</p>
              <ImageUpload
                name="imageUrl"
                accentColor={accent}
                fallback={name.slice(0, 2).toUpperCase() || "GY"}
              />
              <p className="mt-3 border-t border-[var(--border)] pt-3 text-[12px] text-muted-foreground">
                This is your pin on the globe. Without one, members see your initials.
              </p>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-medium">Colour</p>
              <div className="flex flex-wrap gap-2">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAccent(c)}
                    aria-label={`Use ${c}`}
                    aria-pressed={accent === c}
                    className={cn(
                      "size-7 rounded-lg ring-offset-2 ring-offset-[var(--surface)]",
                      accent === c && "ring-2 ring-[var(--brand)]",
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <input type="hidden" name="accentColor" value={accent} />
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium">
                <MapPin className="size-3.5" /> Where you are
              </p>
              <MapPicker city={city} height={220} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
              <Button type="button" variant="ghost" onClick={() => setStep("choose")}>
                <ArrowLeft /> Change plan
              </Button>
              <Button type="button" size="lg" disabled={!ready} onClick={() => setStep("pay")}>
                Continue to payment <ArrowRight />
              </Button>
            </div>
          </div>

          {step === "pay" ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-semibold">{name}</p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">{city}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[22px] leading-none font-semibold">
                      {formatUsd(plan.price)}
                    </p>
                    <p className="mt-1 text-[12px] text-muted-foreground">{plan.per}</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
                  {[
                    "Your gym on the world map, live immediately",
                    ...INCLUDED.slice(0, 3),
                    `${plan.days} days of access, renewable whenever you like`,
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[13px]">
                      <Check className="mt-0.5 size-4 shrink-0 text-[var(--success)]" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-[var(--warning)]/25 bg-[var(--warning-soft)] px-4 py-3">
                <p className="text-[12.5px] leading-relaxed text-[var(--warning)]">
                  No payment gateway is connected in this release, so nothing is charged. Your
                  listing goes live immediately and the order is recorded as paid.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
                <Button type="button" variant="ghost" onClick={() => setStep("gym")}>
                  <ArrowLeft /> Back
                </Button>
                <Button type="submit" size="lg" loading={pending}>
                  <CreditCard /> Pay {formatUsd(plan.price)} and go live
                </Button>
              </div>
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
}

function Steps({ step }: { step: Step }) {
  const items: [Step, string][] = [
    ["choose", "Plan"],
    ["gym", "Your gym"],
    ["pay", "Payment"],
    ["done", "Live"],
  ];
  const index = items.findIndex(([s]) => s === step);

  return (
    <ol className="flex items-center gap-2">
      {items.map(([key, labelText], i) => (
        <li key={key} className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-full text-[11.5px] font-semibold",
              i < index && "bg-[var(--success)] text-white",
              i === index && "bg-[var(--brand)] text-[var(--brand-foreground)]",
              i > index && "border border-[var(--border-strong)] text-muted-foreground",
            )}
          >
            {i < index ? <Check className="size-3.5" /> : i + 1}
          </span>
          <span
            className={cn(
              "text-[13px]",
              i === index ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {labelText}
          </span>
          {i < items.length - 1 ? (
            <span className="mx-1 h-px w-6 bg-[var(--border-strong)]" aria-hidden />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/**
 * How long you want, not whether you pay.
 *
 * Four cards, same product behind all of them. Kept short here — this is the
 * screen between a gym owner and the map, not the pricing page — with the
 * per-month figure doing the arguing for the longer windows.
 */
function ChoosePlan({ value, onPick }: { value: PlanKey; onPick: (p: PlanKey) => void }) {
  return (
    <div className="mt-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {PURCHASABLE_PLANS.map((plan) => {
          return (
            <button
              key={plan.key}
              type="button"
              onClick={() => onPick(plan.key)}
              aria-pressed={value === plan.key}
              className={cn(
                "group flex flex-col rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5",
                plan.popular
                  ? "border-[var(--brand)]/60 bg-[var(--brand)]/[0.07] hover:border-[var(--brand)]"
                  : "border-[var(--border-strong)] bg-[var(--surface)] hover:border-[var(--brand)]/50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[15px] font-semibold">{plan.name}</p>
                {plan.popular ? (
                  <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-[10.5px] font-semibold tracking-wide text-[var(--brand-foreground)] uppercase">
                    Most gyms
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <p className="text-[26px] leading-none font-semibold">{formatUsd(plan.price)}</p>
                <span className="text-[13px] text-muted-foreground line-through">
                  {formatUsd(plan.listPrice)}
                </span>
              </div>
              <p className="mt-1.5 text-[12px] text-muted-foreground">{plan.per}</p>
              <p className="mt-1.5 text-[12px] font-medium text-[var(--success)]">
                {plan.saving} · {discountFor(plan.key)}% off
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {formatUsd(Math.round(perMonth(plan.key) * 100) / 100)} a month
              </p>

              <p className="mt-3 flex-1 text-[12.5px] leading-relaxed text-muted-foreground">
                {plan.blurb}
              </p>

              <span
                className={cn(
                  "mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg text-[13.5px] font-medium",
                  plan.popular
                    ? "bg-[var(--brand)] text-[var(--brand-foreground)]"
                    : "border border-[var(--border-strong)] bg-[var(--surface-muted)]",
                )}
              >
                Choose {plan.name}
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">
        Both plans are the same product — members, payments, attendance, renewals, enquiries,
        classes and your listing on the map. Only the length differs. There is no free tier:
        everything on the globe belongs to a gym that paid to be there.
      </p>
    </div>
  );
}

/** The receipt, and the one chance to turn the listing into an account. */
function Done({ code, name }: { code: string; name: string }) {
  const { pending, error, fieldErrors, run } = useAction();
  const [attached, setAttached] = useState(false);

  return (
    <div className="mt-6">
      <div className="rounded-2xl border border-[var(--success)]/25 bg-[var(--success-soft)] p-5">
        <div className="flex items-start gap-3">
          <PartyPopper className="mt-0.5 size-5 shrink-0 text-[var(--success)]" />
          <div>
            <p className="text-[15px] font-semibold text-[var(--success)]">{name} is on the map.</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Your gym code is <span className="font-mono font-medium text-foreground">{code}</span>
              . Keep it — it is how you and your members find your gym.
            </p>
            <Link
              href={`/gyms/${code}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3.5 py-2 text-[13px] font-medium text-[var(--brand-foreground)] hover:bg-[var(--brand-hover)]"
            >
              See your listing <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {attached ? (
        <div className="mt-5 rounded-2xl border border-[var(--brand)]/30 bg-[var(--brand)]/[0.06] p-5">
          <p className="text-[14px] font-medium">
            Now set up your store — about three minutes.
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Add your logo, a line about the gym, your photos, your programmes and the links your
            pin sends people to. Prices stay hidden until you publish them.
          </p>
          <Link
            href="/gym/settings"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3.5 py-2 text-[13px] font-medium text-[var(--brand-foreground)] hover:bg-[var(--brand-hover)]"
          >
            Set up my store <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <form
          action={(fd) => run(() => attachOwnerAction(fd), { onSuccess: () => setAttached(true) })}
          className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <input type="hidden" name="code" value={code} />
          <p className="text-[14px] font-medium">
            One more step — your login
          </p>
          <p className="mt-1 mb-4 text-[13px] text-muted-foreground">
            You&rsquo;ve paid for a store; you need a login to build it. Set a password and
            you&rsquo;ll land straight in the setup.
          </p>
          <FormError message={error} />
          <FormGrid>
            <FormField label="Your name" htmlFor="owner-name" required error={fieldErrors.name}>
              <Input id="owner-name" name="name" className="h-11" required />
            </FormField>
            <FormField label="Email" htmlFor="owner-email" required error={fieldErrors.email}>
              <Input id="owner-email" name="email" type="email" className="h-11" required />
            </FormField>
          </FormGrid>
          <div className="mt-4">
            <FormField
              label="Password"
              htmlFor="owner-password"
              required
              error={fieldErrors.password}
              hint="At least 8 characters."
            >
              <Input
                id="owner-password"
                name="password"
                type="password"
                className="h-11"
                required
              />
            </FormField>
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit" loading={pending}>
              Create my login
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
