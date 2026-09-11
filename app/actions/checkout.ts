"use server";

import { z } from "zod";
import { requireProspect } from "@/lib/auth";
import { guard, invalid, type ActionResult } from "@/lib/action-result";
import { PURCHASABLE_PLAN_KEYS } from "@/lib/platform-plans";
import { canonicalCity } from "@/lib/geo/places";
import { locateAnywhere } from "@/lib/geo/remote";
import { isKnownCurrency, suggestCurrency } from "@/lib/geo/currency";
import { DEFAULT_BUSINESS_TYPE, isBusinessType } from "@/lib/business-types";
import { startPurchase } from "@/lib/payments/checkout";

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
	/** What kind of place this is. Checked against the list, never trusted. */
	businessType: z
		.string()
		.trim()
		.toUpperCase()
		.refine(isBusinessType, "Pick one from the list")
		.optional(),
});

/** Creates a pending checkout; verified payment and subscription events provision access. */
export async function purchasePlanAction(
	formData: FormData,
): Promise<ActionResult> {
	return guard(async () => {
		const session = await requireProspect();
		const parsed = checkoutSchema.safeParse(
			Object.fromEntries(formData.entries()),
		);
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
			returnPath: "/checkout/return",
			// A gym that charges its members in rupees would rather pay us in rupees
			// too. Dodo converts at live rates; the plan still settles in dollars.
			billingCurrency:
				d.currency ?? suggestCurrency(d.city, place?.country),
			country: place?.country ?? null,
			meta: {
				city: canonicalCity(d.city) ?? d.city ?? null,
				country: place?.country ?? null,
				latitude: place?.lat ?? null,
				longitude: place?.lng ?? null,
				currency: d.currency ?? suggestCurrency(d.city, place?.country),
				businessType: d.businessType ?? DEFAULT_BUSINESS_TYPE,
			},
		});

		if (!result.ok) return { ok: false, error: result.error };
		return { ok: true, message: "Redirecting to payment…", checkoutUrl: result.checkoutUrl };
	});
}
