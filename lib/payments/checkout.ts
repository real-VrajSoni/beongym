import "server-only";
import { db } from "@/lib/db";
import { extendAccess, orderValue, planByKey, tierFor } from "@/lib/platform-plans";
import type { OrderKind } from "@/lib/generated/prisma/enums";
import { dodo, gatewayConfigured, productIdFor } from "./dodo";
import { paymentLog } from "./log";

/**
 * Starting a purchase.
 *
 * The order is written PENDING *before* anyone is sent to the gateway, so a
 * payment that succeeds always has somewhere of ours to land. The alternative —
 * create the session, write the order when the webhook arrives — loses the
 * connection between a payment and the gym that made it the moment metadata
 * goes missing.
 *
 * Nothing here grants access. `subscription.active` does, from a verified
 * webhook. That separation is the point of the whole design: this function can
 * be called by anyone who can reach the button, and it can hand out nothing.
 */

export type StartResult =
  | { ok: true; mode: "gateway"; checkoutUrl: string; orderId: string }
  | { ok: true; mode: "simulated"; orderId: string; message: string }
  | { ok: false; error: string };

export async function startCheckout(input: {
  gymId: string;
  userId: string | null;
  planKey: "MONTHLY" | "ANNUAL";
  email: string | null;
  name: string | null;
  kind: OrderKind;
  returnPath: string;
}): Promise<StartResult> {
  const plan = planByKey(input.planKey);
  const gym = await db.gym.findUnique({
    where: { id: input.gymId },
    select: {
      id: true,
      name: true,
      city: true,
      accessExpiresAt: true,
      tier: true,
      dodoCustomerId: true,
    },
  });
  if (!gym) return { ok: false, error: "That gym no longer exists." };

  const order = await db.platformOrder.create({
    data: {
      gymId: gym.id,
      userId: input.userId,
      kind: input.kind,
      tier: tierFor(input.planKey),
      billingCycle: input.planKey,
      amount: orderValue(input.planKey),
      currency: "USD",
      status: "PENDING",
      provider: gatewayConfigured() ? "dodo" : "simulated",
      gymName: gym.name,
      city: gym.city,
    },
    select: { id: true },
  });

  /* ── no gateway configured: keep the product runnable ───────────── */
  if (!gatewayConfigured()) {
    // The same end state a webhook would produce, reached without a network.
    // This is what lets `npm run db:seed`, the check suites and a contributor
    // with no Dodo account exercise the real flow. It is never reachable in
    // production, where the key is set.
    await db.$transaction([
      db.gym.update({
        where: { id: gym.id },
        data: {
          tier: tierFor(input.planKey),
          accessExpiresAt: extendAccess(gym.accessExpiresAt, input.planKey),
          status: "ACTIVE",
          trialEndsAt: null,
          billingStatus: "ACTIVE",
          billingUpdatedAt: new Date(),
        },
      }),
      db.platformOrder.update({
        where: { id: order.id },
        data: { status: "PAID", paidAt: new Date(), providerRef: `simulated:${order.id}` },
      }),
    ]);
    paymentLog("info", "checkout.simulated", {
      orderId: order.id,
      gymId: gym.id,
      planKey: input.planKey,
    });
    return {
      ok: true,
      mode: "simulated",
      orderId: order.id,
      message: `${plan.days} days added. No payment gateway is configured, so no card was charged.`,
    };
  }

  /* ── the real thing ─────────────────────────────────────────────── */
  const productId = productIdFor(input.planKey);
  if (!productId) {
    await db.platformOrder.update({ where: { id: order.id }, data: { status: "FAILED" } });
    return { ok: false, error: `No Dodo product is configured for the ${plan.name} plan.` };
  }

  // Dodo needs somewhere to send the receipt, and a gym with no owner email is
  // a gym nobody can be billed for. Better to say so here than to have the
  // gateway reject it with something less legible.
  if (!gym.dodoCustomerId && !input.email) {
    await db.platformOrder.update({ where: { id: order.id }, data: { status: "FAILED" } });
    return { ok: false, error: "Add an email address to your account before paying." };
  }

  const appUrl = process.env.APP_URL?.replace(/\/$/, "") || "https://beongym.com";

  try {
    const session = await dodo().checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      // An existing customer is reused so a gym does not accumulate one Dodo
      // customer per renewal.
      customer: gym.dodoCustomerId
        ? { customer_id: gym.dodoCustomerId }
        : { email: input.email!, name: input.name ?? "" },
      // How the webhook finds its way back to us. Everything the handler needs
      // to resolve a gym without guessing.
      metadata: { gymId: gym.id, orderId: order.id, planKey: input.planKey },
      return_url: `${appUrl}${input.returnPath}`,
    });

    if (!session.checkout_url) {
      await db.platformOrder.update({ where: { id: order.id }, data: { status: "FAILED" } });
      return { ok: false, error: "The payment page could not be opened. Please try again." };
    }

    await db.platformOrder.update({
      where: { id: order.id },
      data: { meta: { checkoutSessionId: session.session_id } },
    });

    paymentLog("info", "checkout.created", {
      orderId: order.id,
      gymId: gym.id,
      planKey: input.planKey,
      sessionId: session.session_id,
    });
    return { ok: true, mode: "gateway", checkoutUrl: session.checkout_url, orderId: order.id };
  } catch (err) {
    await db.platformOrder.update({ where: { id: order.id }, data: { status: "FAILED" } });
    paymentLog("error", "checkout.failed", {
      orderId: order.id,
      gymId: gym.id,
      detail: err instanceof Error ? err.message : "unknown",
    });
    return { ok: false, error: "We couldn't reach the payment provider. Please try again." };
  }
}
