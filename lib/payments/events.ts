import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { BillingStatus, OrderKind, OrderStatus } from "@/lib/generated/prisma/enums";
import { extendAccess, planByKey, tierFor } from "@/lib/platform-plans";
import { paymentLog } from "./log";
import { fulfilOrder } from "./fulfil";

/**
 * What a verified Dodo event does to a gym.
 *
 * Two rules run through all of it, and everything else follows from them.
 *
 * **Access is a date, not a status.** A gym may use the workspace when
 * `accessExpiresAt` is in the future — that is what `hasAccess()` asks, in the
 * proxy, in `requirePaidStaff` and at member sign-in. Nothing here changes that
 * check. A cancellation sets `billingStatus` and leaves the date alone, so a
 * gym that cancels on day 2 of a month keeps the other 28 days it paid for.
 * Conflating the two would cut people off at the moment they clicked cancel,
 * which is neither what they bought nor what our refund policy promises.
 *
 * **Only money extends the date.** `subscription.active` and
 * `subscription.renewed` move `accessExpiresAt`; nothing else does. A failed
 * payment, a hold and an update all leave it exactly where it was, so a gym
 * mid-dunning keeps what it has already paid for and gains nothing it has not.
 */

/** A Prisma transaction client. Every handler writes through this, never `db`. */
export type Tx = Prisma.TransactionClient;

/** The subset of a Dodo payload these handlers rely on. */
export type DodoPayload = {
  payload_type?: string;
  subscription_id?: string;
  payment_id?: string;
  product_id?: string;
  status?: string;
  currency?: string;
  total_amount?: number;
  recurring_pre_tax_amount?: number;
  next_billing_date?: string;
  previous_billing_date?: string;
  cancel_at_next_billing_date?: boolean;
  customer?: { customer_id?: string; email?: string; name?: string };
  metadata?: Record<string, string>;
};

export type DodoEvent = { type: string; data: DodoPayload };

/** Dodo sends money in the smallest unit; our orders are in whole currency. */
function fromMinorUnits(amount: number | undefined): number {
  return typeof amount === "number" ? amount / 100 : 0;
}

/**
 * Which of our plans a Dodo product is.
 *
 * By product id where it is configured, because that is the only mapping that
 * cannot be wrong. The metadata fallback exists for events replayed from the
 * dashboard, where the cart may be absent.
 */
export function planKeyFor(payload: DodoPayload): "MONTHLY" | "ANNUAL" {
  const meta = payload.metadata?.planKey;
  if (meta === "ANNUAL" || meta === "MONTHLY") return meta;
  if (payload.product_id && payload.product_id === process.env.DODO_PRODUCT_ID_ANNUAL) {
    return "ANNUAL";
  }
  return "MONTHLY";
}

/**
 * Which gym an event is about.
 *
 * A webhook carries Dodo's identifiers and nothing of ours except what we put
 * into the checkout metadata, so this tries four routes in descending order of
 * certainty. Metadata first, because we wrote it. Then the durable links stored
 * on the gym, which survive a payload that has lost its metadata — a dashboard
 * replay, for instance. Email is last and deliberately narrow: it matches only
 * an owner, never a member, so a member who happens to share an address with
 * their gym owner can never resolve to a gym.
 */
export async function resolveGymId(tx: Tx, payload: DodoPayload): Promise<string | null> {
  const meta = payload.metadata ?? {};

  if (meta.gymId) {
    const gym = await tx.gym.findUnique({ where: { id: meta.gymId }, select: { id: true } });
    if (gym) return gym.id;
  }

  if (meta.orderId) {
    const order = await tx.platformOrder.findUnique({
      where: { id: meta.orderId },
      select: { gymId: true },
    });
    if (order?.gymId) return order.gymId;
  }

  if (payload.subscription_id) {
    const gym = await tx.gym.findUnique({
      where: { dodoSubscriptionId: payload.subscription_id },
      select: { id: true },
    });
    if (gym) return gym.id;
  }

  if (payload.customer?.customer_id) {
    const gym = await tx.gym.findFirst({
      where: { dodoCustomerId: payload.customer.customer_id },
      select: { id: true },
    });
    if (gym) return gym.id;
  }

  if (payload.customer?.email) {
    const owner = await tx.user.findFirst({
      where: { email: payload.customer.email.toLowerCase(), role: "GYM_OWNER" },
      select: { gymId: true },
    });
    if (owner?.gymId) return owner.gymId;
  }

  return null;
}

/**
 * Record the money, once.
 *
 * Keyed on Dodo's payment id, which is unique in our schema — so a redelivered
 * event that slips past the webhook-level check still cannot write a second
 * order row for one payment. `upsert` rather than `create` for that reason: the
 * second attempt updates a row it already wrote instead of throwing.
 */
async function recordOrder(
  tx: Tx,
  gymId: string,
  payload: DodoPayload,
  opts: { status: OrderStatus; kind: OrderKind; planKey: "MONTHLY" | "ANNUAL" },
): Promise<void> {
  const gym = await tx.gym.findUnique({
    where: { id: gymId },
    select: {
      name: true,
      city: true,
      users: { where: { role: "GYM_OWNER" }, select: { id: true }, take: 1 },
    },
  });
  if (!gym) return;

  const plan = planByKey(opts.planKey);
  const amount =
    fromMinorUnits(payload.total_amount ?? payload.recurring_pre_tax_amount) || plan.price;
  const ref = payload.payment_id ?? payload.subscription_id;
  if (!ref) return;

  const common = {
    gymId,
    userId: gym.users[0]?.id ?? null,
    kind: opts.kind,
    tier: tierFor(opts.planKey),
    billingCycle: opts.planKey,
    amount,
    currency: (payload.currency ?? "USD").toUpperCase(),
    status: opts.status,
    provider: "dodo",
    gymName: gym.name,
    city: gym.city,
    paidAt: opts.status === "PAID" ? new Date() : null,
    meta: {
      dodoSubscriptionId: payload.subscription_id ?? null,
      dodoPaymentId: payload.payment_id ?? null,
      dodoProductId: payload.product_id ?? null,
    } as Prisma.InputJsonValue,
  };

  await tx.platformOrder.upsert({
    where: { providerRef: ref },
    create: { ...common, providerRef: ref },
    update: { status: opts.status, amount, paidAt: common.paidAt },
  });
}

/** Store the gateway's ids on the gym so a later event can find it without metadata. */
async function link(tx: Tx, gymId: string, payload: DodoPayload, status: BillingStatus) {
  await tx.gym.update({
    where: { id: gymId },
    data: {
      dodoCustomerId: payload.customer?.customer_id ?? undefined,
      dodoSubscriptionId: payload.subscription_id ?? undefined,
      billingStatus: status,
      billingUpdatedAt: new Date(),
    },
  });
}

/**
 * Money landed: extend the paid-through date and turn the workspace on.
 *
 * The new expiry is Dodo's `next_billing_date` where it sent one — the gateway
 * is the authority on when it will charge again, and inventing our own date
 * would drift from it a little more every cycle. `extendAccess` is the
 * fallback, and it adds to the existing window rather than replacing it, so
 * renewing early never costs a gym days it has already bought.
 */
async function grant(tx: Tx, gymId: string, payload: DodoPayload, planKey: "MONTHLY" | "ANNUAL") {
  const gym = await tx.gym.findUnique({
    where: { id: gymId },
    select: { accessExpiresAt: true, tier: true },
  });
  if (!gym) return;

  const fromGateway = payload.next_billing_date ? new Date(payload.next_billing_date) : null;
  const accessExpiresAt =
    fromGateway && !Number.isNaN(fromGateway.getTime())
      ? fromGateway
      : extendAccess(gym.accessExpiresAt, planKey);

  await tx.gym.update({
    where: { id: gymId },
    data: {
      tier: tierFor(planKey),
      accessExpiresAt,
      status: "ACTIVE",
      trialEndsAt: null,
      dodoCustomerId: payload.customer?.customer_id ?? undefined,
      dodoSubscriptionId: payload.subscription_id ?? undefined,
      billingStatus: "ACTIVE",
      billingUpdatedAt: new Date(),
    },
  });
}

export type HandledResult = { handled: boolean; gymId: string | null; note: string };

/**
 * Apply one verified event.
 *
 * Runs inside the caller's transaction, alongside the idempotency claim, so a
 * throw rolls back both and the gateway's retry can pick the event up again.
 */
export async function applyEvent(tx: Tx, event: DodoEvent): Promise<HandledResult> {
  const payload = event.data ?? {};
  const gymId = await resolveGymId(tx, payload);
  const planKey = planKeyFor(payload);

  // A pending order comes first, and deliberately before the gym check: for a
  // new signup there IS no gym yet. The order holds what one needs to exist,
  // and fulfilling it is what creates it. Only money-in events may do this.
  const pendingId = payload.metadata?.orderId;
  if (pendingId && (event.type === "subscription.active" || event.type === "payment.succeeded")) {
    const done = await fulfilOrder(tx, pendingId, {
      subscriptionId: payload.subscription_id,
      customerId: payload.customer?.customer_id,
      paymentId: payload.payment_id,
      nextBillingDate: payload.next_billing_date,
    });
    if (done.ok) return { handled: true, gymId: done.gymId, note: done.note };
  }

  if (!gymId) {
    // Acknowledged rather than retried forever: an event we cannot place is not
    // going to become placeable on the eighth delivery. The reason is written
    // to the event row for someone to read.
    return { handled: false, gymId: null, note: "no matching gym" };
  }

  switch (event.type) {
    /* ── money in ─────────────────────────────────────────────── */
    case "subscription.active": {
      // Reached only when there was no pending order to fulfil — a subscription
      // created outside our checkout, or a replay whose metadata is gone.
      await grant(tx, gymId, payload, planKey);
      await recordOrder(tx, gymId, payload, { status: "PAID", kind: "CHECKOUT", planKey });
      return { handled: true, gymId, note: "access granted" };
    }

    case "subscription.renewed":
      await grant(tx, gymId, payload, planKey);
      await recordOrder(tx, gymId, payload, { status: "PAID", kind: "RENEWAL", planKey });
      return { handled: true, gymId, note: "access extended" };

    case "payment.succeeded":
      // Recurring access starts on subscription.active, not here — this fires
      // for the same money and would double-extend the window. The row is still
      // worth writing: it is the receipt.
      await recordOrder(tx, gymId, payload, { status: "PAID", kind: "RENEWAL", planKey });
      return { handled: true, gymId, note: "payment recorded" };

    /* ── states that must not touch the date ──────────────────── */
    case "subscription.on_hold":
      await link(tx, gymId, payload, "ON_HOLD");
      return { handled: true, gymId, note: "on hold; paid period untouched" };

    case "subscription.failed":
      await link(tx, gymId, payload, "FAILED");
      return { handled: true, gymId, note: "subscription never started" };

    case "subscription.cancelled":
      // Access deliberately survives to the paid-through date.
      await link(tx, gymId, payload, "CANCELLED");
      return { handled: true, gymId, note: "cancelled; access runs to paid date" };

    case "subscription.expired": {
      await link(tx, gymId, payload, "EXPIRED");
      // The term is over, so the window closes — but only if it has not already
      // been extended past today by a payment that arrived out of order.
      const gym = await tx.gym.findUnique({
        where: { id: gymId },
        select: { accessExpiresAt: true },
      });
      const paidThrough = gym?.accessExpiresAt ?? null;
      if (paidThrough && paidThrough > new Date()) {
        return { handled: true, gymId, note: "expired, but paid beyond today; date kept" };
      }
      return { handled: true, gymId, note: "expired; window already closed" };
    }

    case "subscription.updated":
    case "subscription.plan_changed": {
      // A plan change moves the tier; it does not itself buy time. The renewal
      // that follows is what pays for the next period.
      await tx.gym.update({
        where: { id: gymId },
        data: {
          tier: tierFor(planKey),
          dodoCustomerId: payload.customer?.customer_id ?? undefined,
          dodoSubscriptionId: payload.subscription_id ?? undefined,
          billingUpdatedAt: new Date(),
        },
      });
      return { handled: true, gymId, note: `synced to ${planKey}` };
    }

    case "payment.failed":
      await recordOrder(tx, gymId, payload, { status: "FAILED", kind: "RENEWAL", planKey });
      return { handled: true, gymId, note: "failure recorded; access unchanged" };

    case "payment.processing":
      await recordOrder(tx, gymId, payload, { status: "PENDING", kind: "RENEWAL", planKey });
      return { handled: true, gymId, note: "pending; nothing granted" };

    case "payment.cancelled":
      await recordOrder(tx, gymId, payload, { status: "CANCELLED", kind: "RENEWAL", planKey });
      return { handled: true, gymId, note: "payment cancelled" };

    default:
      paymentLog("info", "event.ignored", { type: event.type, gymId });
      return { handled: false, gymId, note: "event type not handled" };
  }
}
