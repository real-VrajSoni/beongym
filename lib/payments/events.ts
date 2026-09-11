import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";
import { tierFor } from "@/lib/platform-plans";
import { productIdFor } from "./dodo";
import { fulfilOrder } from "./fulfil";
import { decimalAmount, receiptEligible, type DodoEvent, type DodoPayload } from "./policy";

export type { DodoEvent, DodoPayload } from "./policy";
export type Tx = Prisma.TransactionClient;
export type HandledResult = { handled: boolean; gymId: string | null; note: string };
const result = (note: string, gymId: string | null = null): HandledResult => ({ handled: true, gymId, note });

export function planKeyFor(payload: DodoPayload): "MONTHLY" | "ANNUAL" | null {
  const key = payload.product_id === productIdFor("MONTHLY") ? "MONTHLY" :
    payload.product_id === productIdFor("ANNUAL") ? "ANNUAL" : null;
  return key && (!payload.metadata?.planKey || payload.metadata.planKey === key) ? key : null;
}

async function lock(tx: Tx, subscriptionId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`billing:${subscriptionId}`}, 0))`;
}

async function subscriptionEvent(tx: Tx, event: DodoEvent) {
  const p = event.data;
  if (!p.subscription_id || !p.customer || !p.status) throw new Error("Incomplete subscription event");
  await lock(tx, p.subscription_id);
  const existing = await tx.billingSubscription.findUnique({ where: { id: p.subscription_id } });
  const orderId = existing?.orderId ?? p.metadata?.orderId;
  if (!orderId) throw new Error("Subscription requires reconciliation to a checkout order");
  // Lock the source order too: two different subscription IDs must not bind it.
  await tx.$queryRaw`SELECT id FROM platform_orders WHERE id = ${orderId} FOR UPDATE`;
  const order = await tx.platformOrder.findUnique({ where: { id: orderId } });
  if (!order || order.provider !== "dodo") throw new Error("Checkout order not available");
  const orderMeta = (order.meta ?? {}) as Record<string, unknown>;
  // Legacy subscriptions need an operator-verified ledger import. Never erase
  // their paid-through date merely because the new ledger starts empty.
  if (!existing && orderMeta.fulfilledAt) throw new Error("Legacy subscription requires verified ledger migration");
  const plan = planKeyFor(p);
  if (!plan || plan !== order.billingCycle ||
    (p.metadata?.orderId && p.metadata.orderId !== order.id) ||
    (p.metadata?.gymId && p.metadata.gymId !== order.gymId) ||
    (existing && existing.customerId !== p.customer.customer_id)) throw new Error("Subscription binding mismatch");
  const bound = await tx.billingSubscription.findUnique({ where: { orderId } });
  if (bound && bound.id !== p.subscription_id) throw new Error("Checkout already has a subscription");
  const eventAt = new Date(event.timestamp);
  // Never let an older activation overwrite a cancellation or changed period.
  const terminal = ["cancelled", "expired", "failed", "on_hold"];
  if (existing && (eventAt < existing.eventAt || (eventAt.getTime() === existing.eventAt.getTime() &&
    (!terminal.includes(p.status) || terminal.includes(existing.status))))) return reconcile(tx, existing.id);
  const periodStart = p.previous_billing_date ? new Date(p.previous_billing_date) : null;
  const periodEnd = p.next_billing_date ? new Date(p.next_billing_date) : null;
  if (p.status === "active" && (!periodStart || !periodEnd || periodEnd <= periodStart)) throw new Error("Verified billing period required");
  await tx.billingSubscription.upsert({
    where: { id: p.subscription_id },
    create: { id: p.subscription_id, orderId, productId: p.product_id!, customerId: p.customer.customer_id, status: p.status, eventAt, periodStart, periodEnd },
    update: { status: p.status, eventAt, periodStart, periodEnd },
  });
  return reconcile(tx, p.subscription_id);
}

async function paymentEvent(tx: Tx, event: DodoEvent) {
  const p = event.data;
  if (!p.subscription_id || !p.payment_id || !p.customer || !p.status || !p.currency ||
    p.total_amount == null || !p.created_at) throw new Error("Incomplete payment event");
  await lock(tx, p.subscription_id);
  const subscription = await tx.billingSubscription.findUnique({ where: { id: p.subscription_id }, include: { order: true } });
  // 503 rolls back the event claim. The same payment event can retry after the
  // subscription event arrives; no browser state or guessed date grants access.
  if (!subscription) throw new Error("Awaiting verified subscription binding");
  const order = subscription.order;
  const meta = (order.meta ?? {}) as Record<string, unknown>;
  if (subscription.customerId !== p.customer.customer_id ||
    (p.metadata?.orderId && p.metadata.orderId !== order.id) ||
    (p.metadata?.gymId && p.metadata.gymId !== order.gymId) ||
    (p.product_id && p.product_id !== subscription.productId)) throw new Error("Payment binding mismatch");
  if (!meta.fulfilledAt && (!p.checkout_session_id || p.checkout_session_id !== meta.checkoutSessionId)) throw new Error("Awaiting matching checkout session");
  const existing = await tx.billingPayment.findUnique({ where: { id: p.payment_id } });
  if (existing && (existing.subscriptionId !== subscription.id || (existing.status === "succeeded" &&
    (existing.currency !== p.currency || existing.amountMinor !== BigInt(p.total_amount))))) throw new Error("Payment identity changed");
  const eventAt = new Date(event.timestamp);
  if (existing && (existing.status === "succeeded" || (existing.eventAt >= eventAt && p.status !== "succeeded"))) return reconcile(tx, subscription.id);
  let receiptId = existing?.receiptId ?? null;
  if (p.status === "succeeded") {
    const receiptData = {
      status: "PAID" as const, amount: decimalAmount(BigInt(p.total_amount), p.currency),
      currency: p.currency, paidAt: eventAt, providerRef: p.payment_id,
    };
    if (!order.providerRef) {
      const receipt = await tx.platformOrder.update({ where: { id: order.id }, data: receiptData });
      receiptId = receipt.id;
    } else {
      const receipt = await tx.platformOrder.create({ data: {
        ...receiptData, userId: order.userId, gymId: order.gymId, email: order.email,
        tier: order.tier, billingCycle: order.billingCycle, kind: "RENEWAL", provider: "dodo",
        gymName: order.gymName, city: order.city,
        meta: { sourceOrderId: order.id, dodoSubscriptionId: subscription.id },
      } });
      receiptId = receipt.id;
    }
  }
  await tx.billingPayment.upsert({ where: { id: p.payment_id },
    create: { id: p.payment_id, subscriptionId: subscription.id, receiptId, amountMinor: BigInt(p.total_amount), currency: p.currency, status: p.status, createdAt: new Date(p.created_at), eventAt },
    update: { receiptId, status: p.status, eventAt, currency: p.currency, amountMinor: BigInt(p.total_amount) },
  });
  return reconcile(tx, subscription.id);
}

async function adjustmentEvent(tx: Tx, event: DodoEvent) {
  const p = event.data;
  if (!p.payment_id) throw new Error("Adjustment requires payment ID");
  const before = await tx.billingPayment.findUnique({ where: { id: p.payment_id } });
  if (!before) throw new Error("Awaiting payment before adjustment");
  await lock(tx, before.subscriptionId);
  const refund = event.type.startsWith("refund.");
  const providerId = refund ? p.refund_id : p.dispute_id;
  const status = refund ? p.status : p.dispute_status;
  if (!providerId || !status || (p.currency && p.currency !== before.currency)) throw new Error("Invalid adjustment identity");
  const id = `${refund ? "refund" : "dispute"}:${providerId}`;
  const existing = await tx.billingAdjustment.findUnique({ where: { id } });
  if (existing && existing.paymentId !== before.id) throw new Error("Adjustment payment changed");
  const eventAt = new Date(event.timestamp);
  if (existing && (existing.eventAt >= eventAt || (refund && existing.status === "succeeded"))) return reconcile(tx, before.subscriptionId);
  // Refund amounts are minor units. Dispute amount is kept out of arithmetic:
  // any unresolved dispute blocks its payment's entitlement until resolved.
  const amountMinor = refund && typeof p.amount === "number" ? BigInt(p.amount) : null;
  await tx.billingAdjustment.upsert({ where: { id },
    create: { id, paymentId: before.id, kind: refund ? "refund" : "dispute", status, eventAt, amountMinor },
    update: { status, eventAt, amountMinor },
  });
  return reconcile(tx, before.subscriptionId);
}

async function reconcile(tx: Tx, id: string): Promise<HandledResult> {
  const sub = await tx.billingSubscription.findUniqueOrThrow({ where: { id }, include: { order: true, payments: { include: { adjustments: true } } } });
  const order = sub.order;
  const planKey = order.billingCycle === "ANNUAL" ? "ANNUAL" : "MONTHLY";
  const eligible = sub.payments.filter(receiptEligible);
  const periodPayment = sub.status === "active" && sub.periodStart && sub.periodEnd
    ? eligible.find((p) => p.createdAt >= sub.periodStart! && p.createdAt < sub.periodEnd!) : undefined;
  if (periodPayment && sub.periodEnd && !periodPayment.accessUntil) {
    await tx.billingPayment.update({ where: { id: periodPayment.id }, data: { accessUntil: sub.periodEnd } });
    periodPayment.accessUntil = sub.periodEnd;
  }
  let paidUntil = eligible.reduce<Date | null>((latest, p) => p.accessUntil && (!latest || p.accessUntil > latest) ? p.accessUntil : latest, null);
  let gymId = order.gymId;
  const meta = (order.meta ?? {}) as Record<string, unknown>;
  const baseline = typeof meta.baselineAccessExpiresAt === "string" ? new Date(meta.baselineAccessExpiresAt) : null;
  if (baseline && Number.isFinite(baseline.getTime()) && (!paidUntil || baseline > paidUntil)) paidUntil = baseline;
  if (!meta.fulfilledAt && periodPayment && paidUntil) {
    if (order.kind === "CLAIM") return result("Payment recorded; independent ownership review required", gymId);
    const done = await fulfilOrder(tx, order.id, {
      subscriptionId: sub.id, customerId: sub.customerId, paymentId: periodPayment.id,
      nextBillingDate: periodPayment.accessUntil!.toISOString(),
    });
    if (!done.ok) throw new Error(done.note);
    gymId = done.gymId;
  }
  if (!gymId) return result("Awaiting successful payment and verified billing period");
  const gym = await tx.gym.findUniqueOrThrow({ where: { id: gymId } });
  if (gym.dodoSubscriptionId && gym.dodoSubscriptionId !== sub.id) throw new Error("Gym subscription binding changed");
  const statuses = { pending: "NONE", active: "ACTIVE", on_hold: "ON_HOLD", paused: "ON_HOLD", past_due: "ON_HOLD", cancelled: "CANCELLED", expired: "EXPIRED", failed: "FAILED" } as const;
  const status = statuses[sub.status as keyof typeof statuses];
  if (!status) throw new Error("Unknown subscription status");
  // Existing manual grants are untouched until this order has been fulfilled.
  // Thereafter access is derived from non-refunded, non-disputed paid periods.
  const managed = Boolean(meta.fulfilledAt) || Boolean(periodPayment && paidUntil);
  if (managed) await tx.gym.update({ where: { id: gymId }, data: {
    dodoSubscriptionId: sub.id, dodoCustomerId: sub.customerId, billingStatus: status,
    billingUpdatedAt: sub.eventAt, accessExpiresAt: paidUntil,
    tier: gym.tier === "ELITE" ? undefined : tierFor(planKey),
    // Billing must never reverse administrative suspension/cancellation.
    status: gym.status === "TRIAL" && paidUntil && paidUntil > new Date() ? "ACTIVE" : undefined,
  } });
  for (const payment of sub.payments) {
    if (!payment.receiptId) continue;
    const fullyRefunded = payment.adjustments.filter((a) => a.kind === "refund" && a.status === "succeeded")
      .reduce((sum, a) => sum + (a.amountMinor ?? BigInt(0)), BigInt(0)) >= payment.amountMinor;
    if (fullyRefunded && payment.amountMinor > BigInt(0)) await tx.platformOrder.update({ where: { id: payment.receiptId }, data: { status: "REFUNDED" } });
  }
  return result("Verified billing ledger reconciled", gymId);
}

/** Called only after raw-body signature validation, in the event transaction. */
export async function applyEvent(tx: Tx, event: DodoEvent): Promise<HandledResult> {
  if (event.type.startsWith("subscription.")) return subscriptionEvent(tx, event);
  if (["payment.succeeded", "payment.processing", "payment.failed", "payment.cancelled"].includes(event.type)) return paymentEvent(tx, event);
  if (event.type.startsWith("refund.") || event.type.startsWith("dispute.")) return adjustmentEvent(tx, event);
  return { handled: false, gymId: null, note: "Unsubscribed event type" };
}
