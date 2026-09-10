"use server";

import { z } from "zod";
import { requireProspect } from "@/lib/auth";
import { guard, invalid, type ActionResult } from "@/lib/action-result";
import { PURCHASABLE_PLAN_KEYS } from "@/lib/platform-plans";
import { canonicalCity } from "@/lib/geo/places";
import { locateAnywhere } from "@/lib/geo/remote";
import { isKnownCurrency, suggestCurrency } from "@/lib/geo/currency";
import { reissueFor, startPurchase } from "@/lib/payments/checkout";

const checkoutSchema = z.object({
  // Only plans on sale today. A retired key posted by hand is rejected here,
  // not merely hidden in the UI.
  plan: z.enum(PURCHASABLE_PLAN_KEYS),
  gymName: z.string().trim().min(2, "Give your gym a name").max(60),
  city: z
    .string()
    .trim()
    .max(60)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  /**
   * What the gym charges its members in.
   *
   * Posted by the browser, so it is checked against the list rather than
   * trusted — an unknown code would put a currency into the database that
   * nothing can format, and every price in that workspace would break at once.
   */
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .refine(isKnownCurrency, "Pick a currency from the list")
    .optional(),
});

/**
 * Records the order and provisions the gym.
 *
 * NO PAYMENT GATEWAY IS CONNECTED YET. The order is written with
 * `provider: "manual"` and marked paid immediately so the flow is complete end
 * to end. When Razorpay or Dodo goes in, this splits in two: create the order
 * PENDING and hand off to the gateway, then run `provisionGym` from the
 * webhook once the payment is captured. Nothing else in the app needs to move.
 *
 * `amount` is the pre-tax price. Dodo works out GST/VAT from the buyer's
 * country at the checkout it hosts, so the figure banked here and the figure
 * charged can differ by the tax line.
 */
export async function purchasePlanAction(formData: FormData): Promise<ActionResult> {
  return guard(async () => {
    const session = await requireProspect();
    const parsed = checkoutSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return invalid(parsed.error);
    const d = parsed.data;

    // Resolved before anything else: this can reach OpenStreetMap, and the
    // result is carried on the order so the gym lands on the globe the moment
    // it is created rather than after somebody edits their settings.
    const place = await locateAnywhere(d.city);

    const result = await startPurchase({
      userId: session.userId,
      email: session.email,
      name: session.name,
      planKey: d.plan === "ANNUAL" ? "ANNUAL" : "MONTHLY",
      kind: "CHECKOUT",
      gymName: d.gymName,
      city: d.city ?? null,
      returnPath: "/start/checkout/return",
      // A gym that charges its members in rupees would rather pay us in rupees
      // too. Dodo converts at live rates; the plan still settles in dollars.
      billingCurrency: d.currency ?? suggestCurrency(d.city, place?.country),
      meta: {
        city: canonicalCity(d.city) ?? d.city ?? null,
        country: place?.country ?? null,
        latitude: place?.lat ?? null,
        longitude: place?.lng ?? null,
        currency: d.currency ?? suggestCurrency(d.city, place?.country),
      },
    });

    if (!result.ok) return { ok: false, error: result.error };
    if (result.mode === "gateway") {
      return { ok: true, message: "Redirecting to payment…", id: result.checkoutUrl };
    }
    // Simulated: the gym really was created, so the session must be reissued —
    // this account was a PROSPECT a moment ago and is now an owner.
    await reissueFor(session.userId);
    return { ok: true, message: result.message, id: "/gym/dashboard" };
  });
}
