import "server-only";
import { enforceRateLimit } from "../rate-limit";
import type { Prisma } from "@/lib/generated/prisma/client";
import { db } from "@/lib/db";
import { orderValue, planByKey, tierFor } from "@/lib/platform-plans";
import type { OrderKind } from "@/lib/generated/prisma/enums";
import { adaptiveCurrency, dodo, gatewayConfigured, productIdFor } from "./dodo";
import { countryCodeFor, isKnownCurrency } from "@/lib/geo/currency";
import { paymentLog } from "./log";
import { serverEnv } from "@/lib/env";

function localisation(currency: string | null | undefined, country: string | null | undefined) {
	const wanted = currency && currency !== "USD" && isKnownCurrency(currency) ? currency : null;
	const code = countryCodeFor(country) ?? (wanted === "INR" ? "IN" : null);
	const out: Record<string, unknown> = {};
	if (code) out.billing_address = { country: code };
	const useLocalCurrency = Boolean(wanted && adaptiveCurrency());
	if (useLocalCurrency && wanted) out.billing_currency = wanted;
	return out;
}

export type StartResult =
	| { ok: true; mode: "gateway"; checkoutUrl: string; orderId: string }
	| { ok: false; error: string };

export async function startPurchase(input: {
	userId: string | null;
	email: string | null;
	name: string | null;
	planKey: "MONTHLY" | "ANNUAL";
	kind: OrderKind;
	gymName: string;
	city: string | null;
	gymId?: string | null;
	country?: string | null;
	billingCurrency?: string | null;
	returnPath: string;
	meta?: Record<string, unknown>;
}): Promise<StartResult> {
	const env = serverEnv();
	const plan = planByKey(input.planKey);
	const realGateway = gatewayConfigured();
	if (!realGateway) return { ok: false, error: "Payments are unavailable. Please contact support." };
	if (input.kind === "CLAIM") return { ok: false, error: "Ownership verification is required before purchasing a claim. Please contact support." };
	if (!input.userId || !input.email) return { ok: false, error: "Sign in before starting checkout." };
  await enforceRateLimit("checkout-global", "all", 60, 3600000);
  await enforceRateLimit("checkout-buyer", input.userId, 5, 3600000);
	const buyer = await db.user.findFirst({ where: { id: input.userId, isActive: true }, select: { role: true, gymId: true } });
	if (!buyer || (input.gymId ? buyer.role !== "GYM_OWNER" || buyer.gymId !== input.gymId : buyer.role !== "PROSPECT" || buyer.gymId !== null)) {
		return { ok: false, error: "This account cannot start that purchase." };
	}
	if (input.gymId) {
		const gym = await db.gym.findUnique({ where: { id: input.gymId }, select: { dodoSubscriptionId: true } });
		if (gym?.dodoSubscriptionId) return { ok: false, error: "An existing billing subscription must be managed before starting another. Contact support." };
	}

  const productId = productIdFor(input.planKey);
  if (!productId) return { ok: false, error: `No payment product is configured for the ${plan.name} plan.` };
  const reservation = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${input.userId} FOR UPDATE`;
    const pending = await tx.platformOrder.findFirst({ where: { userId: input.userId, provider: "dodo", status: "PENDING" }, orderBy: { createdAt: "desc" } });
    if (pending) return null;
    const currentGym = input.gymId ? await tx.gym.findUnique({ where: { id: input.gymId }, select: { accessExpiresAt: true, dodoSubscriptionId: true } }) : null;
    if (currentGym?.dodoSubscriptionId) return null;
    return tx.platformOrder.create({ data: {
      gymId: input.gymId ?? null, userId: input.userId, email: input.email,
      kind: input.kind, tier: tierFor(input.planKey), billingCycle: input.planKey,
      amount: orderValue(input.planKey), currency: "USD", status: "PENDING", provider: "dodo",
      gymName: input.gymName, city: input.city,
      meta: { ...(input.meta ?? {}), quotedAmount: orderValue(input.planKey), quotedCurrency: "USD",
        baselineAccessExpiresAt: currentGym?.accessExpiresAt?.toISOString() ?? null } as Prisma.InputJsonValue,
    }, select: { id: true } });
  });
  if (!reservation) return { ok: false, error: "A payment is already pending. Check its status or contact support before starting another." };
  const order = reservation;

	const appUrl = env.appUrl.replace(/\/$/, "");

	try {
		const checkoutLocalisation = localisation(input.billingCurrency, input.country);
		const upiEligible =
			checkoutLocalisation.billing_currency === "INR" &&
			(checkoutLocalisation.billing_address as { country?: string } | undefined)?.country === "IN";
		paymentLog("info", "purchase.checkout_options", {
			orderId: order.id,
			planKey: input.planKey,
			country: (checkoutLocalisation.billing_address as { country?: string } | undefined)?.country ?? null,
			billingCurrency: checkoutLocalisation.billing_currency ?? "USD",
			upiEligible,
			adaptiveCurrency: adaptiveCurrency(),
		});
		const session = await dodo().checkoutSessions.create({
			product_cart: [{ product_id: productId, quantity: 1 }],
			customer: { email: input.email, name: input.name ?? "" },
			...checkoutLocalisation,
			metadata: { orderId: order.id, planKey: input.planKey, ...(input.gymId ? { gymId: input.gymId } : {}) },
			return_url: `${appUrl}/checkout/return?order=${order.id}`,
		}, { idempotencyKey: order.id, maxRetries: 0, timeout: 10000 });
		if (!session.checkout_url) {
			return { ok: false, error: "Checkout could not be confirmed. Contact support before trying again." };
		}
    const checkoutOrigin = new URL(session.checkout_url);
    if (checkoutOrigin.protocol !== "https:" || checkoutOrigin.username || checkoutOrigin.password) throw new Error("Invalid provider URL");
    const handles = JSON.stringify({ checkoutSessionId: session.session_id });
    await db.$executeRaw`UPDATE platform_orders SET meta = COALESCE(meta, '{}'::jsonb) || ${handles}::jsonb WHERE id = ${order.id}`;

		paymentLog("info", "purchase.created", { orderId: order.id, kind: input.kind, sessionId: session.session_id });
		return { ok: true, mode: "gateway", checkoutUrl: session.checkout_url, orderId: order.id };
	} catch {
		paymentLog("error", "purchase.failed", { orderId: order.id, kind: input.kind });
		return { ok: false, error: "Checkout confirmation is delayed. Contact support before starting another payment." };
	}
}
