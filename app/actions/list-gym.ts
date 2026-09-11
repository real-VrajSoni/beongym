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

const listingSchema = z.object({
	/** Which plan they bought. Only the ones on sale today are accepted. */
	plan: z.enum(PURCHASABLE_PLAN_KEYS),
	name: z.string().trim().min(2, "Give your gym a name").max(60),
	tagline: z.string().trim().max(120).optional(),
	description: z.string().trim().max(2000).optional(),
	city: z.string().trim().min(2, "Which city are you in?").max(60),
	address: z.string().trim().max(200).optional(),
	phone: z.string().trim().min(6, "Members need a number to call").max(20),
	/** Checked against the list, never trusted — see checkout.ts. */
	currency: z
		.string()
		.trim()
		.toUpperCase()
		.refine(isKnownCurrency, "Pick a currency from the list")
		.optional(),
	businessType: z
		.string()
		.trim()
		.toUpperCase()
		.refine(isBusinessType, "Pick one from the list")
		.optional(),
	email: z.string().trim().toLowerCase().email("Enter a valid email address"),
	amenities: z.string().trim().max(400).optional(),
	openingHours: z.string().trim().max(120).optional(),
	imageUrl: z
		.string()
		.trim()
		.max(400_000, "That image is too large — try a smaller one.")
		.refine(
			(v) => v === "" || v.startsWith("data:image/"),
			"That image isn't valid.",
		)
		.optional(),
	accentColor: z
		.string()
		.trim()
		.regex(/^#[0-9a-fA-F]{6}$/)
		.optional(),
	latitude: z.coerce
		.number()
		.min(-90)
		.max(90)
		.optional()
		.or(z.literal("").transform(() => undefined)),
	longitude: z.coerce
		.number()
		.min(-180)
		.max(180)
		.optional()
		.or(z.literal("").transform(() => undefined)),
});

export type ListingResult = ActionResult & { code?: string };

/**
 * Puts a gym on the map after its owner has created an account.
 *
 * The prospect account is required before an order is created. This prevents an
 * anonymous visitor from initiating payment and gives the verified Dodo checkout
 * a durable buyer identity before a listing is provisioned.
 *
 * Paying is the listing — there is no unpaid way onto the map, and no separate
 * upgrade step afterwards. Every order is written here so the platform console
 * sees the listing and the money that made it in one place.
 *
 * A pending order carries the public profile fields until verified payment
 * and subscription events authorize provisioning.
 */
export async function listGymAction(
	formData: FormData,
): Promise<ListingResult> {
	return guard(async () => {
		const session = await requireProspect();
		const parsed = listingSchema.safeParse(
			Object.fromEntries(formData.entries()),
		);
		if (!parsed.success) return invalid(parsed.error);
		const d = parsed.data;

		// The table first, then OpenStreetMap — so a gym in a town of four
		// thousand people still gets a pin rather than a form error.
		const place = await locateAnywhere(d.city);
		const lat =
			typeof d.latitude === "number" ? d.latitude : (place?.lat ?? null);
		const lng =
			typeof d.longitude === "number"
				? d.longitude
				: (place?.lng ?? null);
		if (lat === null || lng === null) {
			return {
				ok: false as const,
				error: "",
				fieldErrors: {
					city: "We don't know that city — drop your pin on the map instead.",
				},
			};
		}

		const amenities = (d.amenities ?? "")
			.split(",")
			.map((a) => a.trim())
			.filter(Boolean)
			.slice(0, 12);

		// Nothing is created until the money is verified. The listing's details ride
		// on the order so `fulfilOrder` can build the gym from them; writing the gym
		// here and marking the order PAID, as this used to, put a free listing on
		// the public map for anyone who found the form.
		const result = await startPurchase({
			userId: session.userId,
			email: session.email,
			name: session.name,
			planKey: d.plan === "ANNUAL" ? "ANNUAL" : "MONTHLY",
			kind: "LISTING",
			gymName: d.name,
			city: canonicalCity(d.city) ?? d.city,
			returnPath: "/checkout/return",
			billingCurrency:
				d.currency ?? suggestCurrency(d.city, place?.country),
			country: place?.country ?? null,
			meta: {
				city: canonicalCity(d.city) ?? d.city,
				country: place?.country ?? null,
				currency: d.currency ?? suggestCurrency(d.city, place?.country),
				businessType: d.businessType ?? DEFAULT_BUSINESS_TYPE,
				latitude: lat,
				longitude: lng,
				tagline: d.tagline || null,
				description: d.description || null,
				address: d.address || null,
				phone: d.phone,
				email: d.email,
				amenities,
				openingHours: d.openingHours || null,
				imageUrl: d.imageUrl || null,
				accentColor: d.accentColor || "#7c6cff",
			},
		});

		if (!result.ok) return { ok: false as const, error: result.error };
		return { ok: true as const, message: "Redirecting to payment…", checkoutUrl: result.checkoutUrl };
	});
}

/** Legacy attachment cannot prove ownership; preserve the entry point without takeover. */
export async function attachOwnerAction(formData: FormData): Promise<ActionResult> {
  void formData;
  return { ok: false, error: "Existing listings require independent ownership verification. Contact support to claim this business." };
}
