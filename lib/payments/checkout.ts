import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";
import { db } from "@/lib/db";
import { createSession, type Role } from "@/lib/auth";
import { orderValue, planByKey, tierFor } from "@/lib/platform-plans";
import type { OrderKind } from "@/lib/generated/prisma/enums";
import {
	adaptiveCurrency,
	dodo,
	gatewayConfigured,
	productIdFor,
} from "./dodo";
import { countryCodeFor, isKnownCurrency } from "@/lib/geo/currency";
import { paymentLog } from "./log";
import { fulfilOrder } from "./fulfil";

/**
 * Locale inputs for Dodo's hosted checkout.
 *
 * A currency alone is not enough: Dodo uses the billing country, billing
 * currency, subscription type, and the buyer's device to determine its eligible
 * payment methods. We intentionally do not set `allowed_payment_method_types`;
 * that parameter is a restriction and would hide valid country-specific options
 * such as iDEAL, Pix, Apple Pay, or UPI from otherwise eligible buyers.
 */
function localisation(
	currency: string | null | undefined,
	country: string | null | undefined,
) {
	const wanted =
		currency && currency !== "USD" && isKnownCurrency(currency)
			? currency
			: null;
	// UPI requires INR and an Indian billing country. City lookup can be
	// unavailable, so preserve this valid inference for an INR checkout.
	const code = countryCodeFor(country) ?? (wanted === "INR" ? "IN" : null);

	const out: Record<string, unknown> = {};
	if (code) out.billing_address = { country: code };

	// Local currency enables the gateway to apply each regional payment method's
	// currency rules. When disabled, checkout safely settles in USD instead.
	const useLocalCurrency = Boolean(wanted && adaptiveCurrency());
	if (useLocalCurrency && wanted) out.billing_currency = wanted;
	return out;
}

export type StartResult =
	| { ok: true; mode: "gateway"; checkoutUrl: string; orderId: string }
	| { ok: true; mode: "simulated"; orderId: string; message: string }
	| { ok: false; error: string };

/**
 * Start a purchase for a gym that may not exist yet.
 *
 * The generalisation of `startCheckout`. A new signup has no gym — that is the
 * point of paying — so everything the gym will need is written onto the order's
 * `meta` and the gym is created by `fulfilOrder` when the payment is verified.
 *
 * Same rule as everywhere else on this path: this hands out nothing. It writes
 * a PENDING row and a checkout URL.
 */
export async function startPurchase(input: {
	userId: string | null;
	email: string | null;
	name: string | null;
	planKey: "MONTHLY" | "ANNUAL";
	kind: OrderKind;
	gymName: string;
	city: string | null;
	/** Set when the gym already exists — a claim or a renewal. */
	gymId?: string | null;
	/** The gym's country, so the gateway offers the methods people there use. */
	country?: string | null;
	/**
	 * What the buyer would rather be charged in.
	 *
	 * Dodo converts at live rates. The plan still settles in dollars; this only
	 * changes what the card statement says, which is the difference between a
	 * gym in Mumbai recognising the amount and guessing at it.
	 */
	billingCurrency?: string | null;
	returnPath: string;
	meta?: Record<string, unknown>;
}): Promise<StartResult> {
	const plan = planByKey(input.planKey);

	const order = await db.platformOrder.create({
		data: {
			gymId: input.gymId ?? null,
			userId: input.userId,
			email: input.email,
			kind: input.kind,
			tier: tierFor(input.planKey),
			billingCycle: input.planKey,
			amount: orderValue(input.planKey),
			currency: "USD",
			status: "PENDING",
			provider: gatewayConfigured() ? "dodo" : "simulated",
			gymName: input.gymName,
			city: input.city,
			meta: (input.meta ?? {}) as Prisma.InputJsonValue,
		},
		select: { id: true },
	});

	/* ── no gateway: fulfil directly, so the product still runs ─────── */
	if (!gatewayConfigured()) {
		const done = await db.$transaction((tx) =>
			fulfilOrder(tx, order.id, { paymentId: `simulated:${order.id}` }),
		);
		paymentLog("info", "purchase.simulated", {
			orderId: order.id,
			gymId: done.gymId,
			kind: input.kind,
		});
		if (!done.ok)
			return {
				ok: false,
				error: "That purchase could not be completed.",
			};
		return {
			ok: true,
			mode: "simulated",
			orderId: order.id,
			message: `${plan.name} is active. No payment gateway is configured, so no card was charged.`,
		};
	}

	/* ── the real thing ─────────────────────────────────────────────── */
	const productId = productIdFor(input.planKey);
	if (!productId) {
		await db.platformOrder.update({
			where: { id: order.id },
			data: { status: "FAILED" },
		});
		return {
			ok: false,
			error: `No payment product is configured for the ${plan.name} plan.`,
		};
	}
	if (!input.email) {
		await db.platformOrder.update({
			where: { id: order.id },
			data: { status: "FAILED" },
		});
		return {
			ok: false,
			error: "An email address is needed to take payment.",
		};
	}

	const appUrl =
		process.env.APP_URL?.replace(/\/$/, "") || "https://beongym.com";

	try {
		const checkoutLocalisation = localisation(
			input.billingCurrency,
			input.country,
		);
		const upiEligible =
			checkoutLocalisation.billing_currency === "INR" &&
			(
				checkoutLocalisation.billing_address as
					| { country?: string }
					| undefined
			)?.country === "IN";
		paymentLog("info", "purchase.checkout_options", {
			orderId: order.id,
			planKey: input.planKey,
			country:
				(
					checkoutLocalisation.billing_address as
						| { country?: string }
						| undefined
				)?.country ?? null,
			billingCurrency: checkoutLocalisation.billing_currency ?? "USD",
			upiEligible,
			adaptiveCurrency: adaptiveCurrency(),
		});
		const session = await dodo().checkoutSessions.create({
			product_cart: [{ product_id: productId, quantity: 1 }],
			customer: { email: input.email, name: input.name ?? "" },
			...checkoutLocalisation,
			metadata: {
				orderId: order.id,
				planKey: input.planKey,
				...(input.gymId ? { gymId: input.gymId } : {}),
			},
			return_url: `${appUrl}${input.returnPath}?order=${order.id}`,
		});
		if (!session.checkout_url) {
			await db.platformOrder.update({
				where: { id: order.id },
				data: { status: "FAILED" },
			});
			return {
				ok: false,
				error: "The payment page could not be opened. Please try again.",
			};
		}
		await db.platformOrder.update({
			where: { id: order.id },
			data: {
				meta: {
					...(input.meta ?? {}),
					checkoutSessionId: session.session_id,
				} as Prisma.InputJsonValue,
			},
		});
		paymentLog("info", "purchase.created", {
			orderId: order.id,
			kind: input.kind,
			sessionId: session.session_id,
		});
		return {
			ok: true,
			mode: "gateway",
			checkoutUrl: session.checkout_url,
			orderId: order.id,
		};
	} catch (err) {
		await db.platformOrder.update({
			where: { id: order.id },
			data: { status: "FAILED" },
		});
		paymentLog("error", "purchase.failed", {
			orderId: order.id,
			detail: err instanceof Error ? err.message : "unknown",
		});
		return {
			ok: false,
			error: "We couldn't reach the payment provider. Please try again.",
		};
	}
}

/**
 * Re-sign the session after a purchase changed what the holder is.
 *
 * A signed token carries role, tenant, tier and expiry. Buying turns a PROSPECT
 * into a GYM_OWNER with a gym and an access window, so the token in their
 * browser describes somebody who no longer exists — and `sessionIsLive` rejects
 * a token whose contents disagree with the database, which would bounce them
 * to the login screen seconds after paying.
 */
export async function reissueFor(userId: string): Promise<void> {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			email: true,
			name: true,
			role: true,
			trainerProfile: { select: { id: true } },
			clientProfile: { select: { id: true } },
			gym: {
				select: {
					id: true,
					name: true,
					code: true,
					tier: true,
					accessExpiresAt: true,
				},
			},
		},
	});
	if (!user) return;

	await createSession({
		userId: user.id,
		email: user.email,
		name: user.name,
		role: user.role as Role,
		profileId: user.trainerProfile?.id ?? user.clientProfile?.id ?? null,
		gymId: user.gym?.id ?? null,
		gymName: user.gym?.name ?? null,
		gymCode: user.gym?.code ?? null,
		gymTier: user.gym?.tier ?? null,
		gymAccessExpiresAt: user.gym?.accessExpiresAt?.toISOString() ?? null,
	});
}
