"use server";

import { dodo, gatewayConfigured, productIdFor } from "@/lib/payments/dodo";
import { isKnownCurrency } from "@/lib/geo/currency";
import { orderValue } from "@/lib/platform-plans";

/**
 * What a plan costs in the buyer's own money.
 *
 * The plans are priced in dollars and settle in dollars — that is deliberate,
 * and it is what `formatUsd` is for. But quoting a gym in Mumbai twenty dollars
 * and leaving them to work out what that means is a poor way to ask for money,
 * so the checkout page shows the live converted figure alongside it.
 *
 * The conversion is Dodo's, not ours: a rate we looked up and cached would be a
 * different number from the one on the card statement, which is worse than not
 * showing one at all.
 *
 * Public on purpose — it exposes a price list, which is already public — and it
 * returns null rather than throwing on anything it cannot answer, because a
 * missing second opinion on a price must never block a checkout.
 */
export type PricePreview = { amount: number; currency: string } | null;

export async function previewPlanPriceAction(
  planKey: string,
  currency: string,
): Promise<PricePreview> {
  const key = planKey === "ANNUAL" ? "ANNUAL" : "MONTHLY";
  const code = currency.trim().toUpperCase();

  // Dollars need no conversion, and an unknown code is not worth an API call.
  if (code === "USD" || !isKnownCurrency(code)) return null;
  if (!gatewayConfigured()) return null;

  const productId = productIdFor(key);
  if (!productId) return null;

  try {
    const preview = await dodo().checkoutSessions.preview({
      product_cart: [{ product_id: productId, quantity: 1 }],
      billing_currency: code as never,
    });
    const breakup = (preview as { current_breakup?: { total_amount?: number } }).current_breakup;
    const minor = breakup?.total_amount;
    if (typeof minor !== "number" || !Number.isFinite(minor)) return null;
    // Dodo works in the smallest unit; the app formats whole currency.
    return { amount: minor / 100, currency: code };
  } catch {
    // A currency Dodo will not quote, or a hiccup. The dollar price stands.
    return null;
  }
}

/** The dollar price, for the caller that wants both halves. */
export async function planPriceUsdAction(planKey: string): Promise<number> {
  return orderValue(planKey === "ANNUAL" ? "ANNUAL" : "MONTHLY");
}
