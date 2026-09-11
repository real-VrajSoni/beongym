/** Signed HTTP regression suite. Uses only explicit disposable local fixtures. */
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Webhook } from "standardwebhooks";
import { SignJWT } from "jose";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { assertDisposableDatabase } from "./disposable-database";

async function main() {
  assertDisposableDatabase();
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const wh = new Webhook(process.env.DODO_PAYMENTS_WEBHOOK_KEY!);
  const base = process.env.CHECK_BASE_URL!;
  const prefix = `test_${randomUUID()}`;
  const subId = `${prefix}_sub`, payId = `${prefix}_pay`, customerId = `${prefix}_customer`;
  const now = Date.now();
  let tick = 0, passed = 0;
  const seen: string[] = [];
  const iso = (ms: number) => new Date(ms).toISOString();
  const check = (label: string, value: unknown) => { assert.ok(value, label); passed++; console.log(`ok ${label}`); };
  const user = await db.user.create({ data: { name: "Billing Fixture", email: `${prefix}@example.test`, passwordHash: "fixture-cannot-log-in", role: "PROSPECT" } });
  const order = await db.platformOrder.create({ data: {
    userId: user.id, email: user.email, gymName: "Billing Fixture", provider: "dodo", status: "PENDING",
    kind: "CHECKOUT", tier: "PRO", billingCycle: "MONTHLY", amount: 20, currency: "USD",
    meta: { checkoutSessionId: `${prefix}_checkout` },
  } });
  const meta = { orderId: order.id, planKey: "MONTHLY" };
  const subEvent = (status = "active", extra: Record<string, unknown> = {}, type = "subscription.active") => ({
    type, timestamp: iso(now + ++tick * 1000), data: {
      subscription_id: subId, product_id: process.env.DODO_PRODUCT_ID_MONTHLY, status,
      customer: { customer_id: customerId, email: user.email }, metadata: meta,
      previous_billing_date: iso(now - 86400000), next_billing_date: iso(now + 60000), ...extra,
    },
  });
  const payEvent = (id = payId, status = "succeeded", extra: Record<string, unknown> = {}) => ({
    type: `payment.${status}`, timestamp: iso(now + ++tick * 1000), data: {
      payment_id: id, subscription_id: subId, status, currency: "USD", total_amount: 2000,
      created_at: iso(now - 60000), checkout_session_id: `${prefix}_checkout`,
      customer: { customer_id: customerId }, metadata: meta, ...extra,
    },
  });
  async function send(body: unknown, options: { id?: string; corrupt?: boolean; age?: number; missing?: boolean } = {}) {
    const id = options.id ?? `${prefix}_event_${randomUUID()}`; seen.push(id);
    const raw = JSON.stringify(body), stamp = new Date(Date.now() + (options.age ?? 0));
    const signature = wh.sign(id, stamp, raw);
    const res = await fetch(`${base}/api/webhooks/dodo`, { method: "POST", body: raw, headers: options.missing ? {} : {
      "content-type": "application/json", "webhook-id": id, "webhook-timestamp": String(Math.floor(stamp.getTime() / 1000)),
      "webhook-signature": options.corrupt ? "v1,invalid" : signature,
    } });
    return { status: res.status, body: await res.json() };
  }
  const gym = async () => db.gym.findFirst({ where: { users: { some: { id: user.id } } } });
  try {
    check("missing headers rejected", (await send({}, { missing: true })).status === 400);
    check("forged signature rejected", (await send(subEvent(), { corrupt: true })).status === 401);
    check("stale delivery rejected", (await send(subEvent(), { age: -600000 })).status === 401);
    check("malformed signed event rejected", (await send({ type: "payment.succeeded", data: {} })).status === 400);
    check("GET is not accepted", (await fetch(`${base}/api/webhooks/dodo`)).status === 405);
    const firstPayment = payEvent(); const retryId = `${prefix}_retry`;
    check("payment before subscription is retryable", (await send(firstPayment, { id: retryId })).status === 503);
    check("failed event claim rolled back", !(await db.webhookEvent.findUnique({ where: { eventId: retryId } })));
    check("activation accepted", (await send(subEvent())).status === 200);
    check("activation alone creates no paid gym", !(await gym()));
    check("initial payment must match hosted checkout", (await send(payEvent(payId, "succeeded", { checkout_session_id: "another-checkout" }))).status === 503);
    await db.user.update({ where: { id: user.id }, data: { isActive: false } });
    check("inactive buyer cannot be provisioned", (await send(firstPayment, { id: retryId })).status === 503 && !(await gym()));
    await db.user.update({ where: { id: user.id }, data: { isActive: true } });
    const concurrent = await Promise.all([send(firstPayment, { id: retryId }), send(firstPayment), send(firstPayment)]);
    check("concurrent payment deliveries all complete safely", concurrent.every((item) => item.status === 200));
    check("same failed event retry succeeds after binding", concurrent[0].status === 200);
    const original = await gym(); check("payment and period provision a gym", original?.dodoSubscriptionId === subId);
    const gymId = original!.id, firstExpiry = original!.accessExpiresAt!.getTime();
    const tokenFor = (userId: string) => new SignJWT({ userId, role: "PROSPECT", name: "Billing fixture" })
      .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.AUTH_SECRET!));
    const ownReturn = await fetch(`${base}/checkout/return?order=${order.id}`, { headers: { cookie: `apex_session=${await tokenFor(user.id)}` } });
    check("own paid return renders without cookie mutation", ownReturn.status === 200 && (await ownReturn.text()).includes("Your payment is confirmed") && !ownReturn.headers.has("set-cookie"));
    const stranger = await db.user.findFirstOrThrow({ where: { id: { not: user.id }, role: "PROSPECT" } });
    const foreignReturn = await fetch(`${base}/checkout/return?order=${order.id}`, { headers: { cookie: `apex_session=${await tokenFor(stranger.id)}` } });
    check("another buyer cannot read order details", !(await foreignReturn.text()).includes("Order " + order.id.slice(-8)));
    check("receipt stores actual currency/amount", (await db.platformOrder.findUniqueOrThrow({ where: { id: order.id } })).amount.toString() === "20");
    check("same event reports duplicate", (await send(firstPayment, { id: retryId })).body.duplicate === true);
    check("new event ID for same payment is harmless", (await send(payEvent())).status === 200);
    check("same-period renewal accepted", (await send(subEvent("active", {}, "subscription.renewed"))).status === 200);
    check("duplicate events do not extend access", (await gym())?.accessExpiresAt?.getTime() === firstExpiry);
    check("one payment has one ledger row", await db.billingPayment.count({ where: { subscriptionId: subId } }) === 1);
    check("product mismatch rejected", (await send(subEvent("active", { product_id: "pdt_wrong" }))).status === 503);
    check("a second subscription cannot bind the same order", (await send(subEvent("active", { subscription_id: `${prefix}_second` }))).status === 503);
    check("customer mismatch rejected", (await send(payEvent(`${prefix}_bad`, "succeeded", { customer: { customer_id: "other" } }))).status === 503);
    check("gym metadata cannot redirect payment", (await send(payEvent(`${prefix}_bad2`, "succeeded", { metadata: { ...meta, gymId: "other-gym" } }))).status === 503);
    check("failed payment recorded", (await send(payEvent(`${prefix}_failed`, "failed"))).status === 200);
    check("failure grants no access", (await gym())?.accessExpiresAt?.getTime() === firstExpiry);
    const renewalStart = now + 60000, renewalEnd = now + 30 * 86400000;
    const period = { previous_billing_date: iso(renewalStart), next_billing_date: iso(renewalEnd) };
    check("next period waits for payment", (await send(subEvent("active", period, "subscription.renewed"))).status === 200);
    check("renewal notice alone does not extend", (await gym())?.accessExpiresAt?.getTime() === firstExpiry);
    const renewalPay = `${prefix}_renewal`;
    check("renewal payment accepted", (await send(payEvent(renewalPay, "succeeded", { created_at: iso(renewalStart + 1000), currency: "JPY" }))).status === 200);
    check("verified renewal extends exactly to provider date", (await gym())?.accessExpiresAt?.getTime() === renewalEnd);
    const renewal = await db.billingPayment.findUniqueOrThrow({ where: { id: renewalPay }, include: { receipt: true } });
    check("JPY receipt preserves zero-decimal currency", renewal.receipt?.currency === "JPY" && renewal.receipt.amount.toString() === "2000");
    check("renewal has separate receipt", renewal.receiptId !== order.id);
    check("cancellation preserves paid period", (await send(subEvent("cancelled", period, "subscription.cancelled"))).status === 200 && (await gym())?.accessExpiresAt?.getTime() === renewalEnd);
    const stale = subEvent("active", period); stale.timestamp = iso(now - 1000);
    check("late activation cannot reverse cancellation", (await send(stale)).status === 200 && (await gym())?.billingStatus === "CANCELLED");
    await db.gym.update({ where: { id: gymId }, data: { status: "SUSPENDED" } });
    check("billing cannot undo administrative suspension", (await send(subEvent("active", period))).status === 200 && (await gym())?.status === "SUSPENDED");
    const adjustment = (id: string, type: string, data: Record<string, unknown>) => ({ type, timestamp: iso(now + ++tick * 1000), data: { payment_id: renewalPay, currency: "JPY", ...data, ...(type.startsWith("refund") ? { refund_id: id } : { dispute_id: id }) } });
    const partial = adjustment(`${prefix}_partial`, "refund.succeeded", { status: "succeeded", amount: 500, is_partial: true });
    check("partial refund recorded without destroying receipt", (await send(partial)).status === 200 && (await gym())?.accessExpiresAt?.getTime() === renewalEnd);
    check("duplicate refund ID is idempotent", (await send(partial)).status === 200 && await db.billingAdjustment.count({ where: { paymentId: renewalPay } }) === 1);
    const dispute = `${prefix}_dispute`;
    check("open dispute removes its access grant", (await send(adjustment(dispute, "dispute.opened", { dispute_status: "dispute_opened" }))).status === 200 && (await gym())?.accessExpiresAt?.getTime() === firstExpiry);
    check("won dispute restores paid access", (await send(adjustment(dispute, "dispute.won", { dispute_status: "dispute_won" }))).status === 200 && (await gym())?.accessExpiresAt?.getTime() === renewalEnd);
    check("full refund revokes only its paid period", (await send(adjustment(`${prefix}_remaining`, "refund.succeeded", { status: "succeeded", amount: 1500 }))).status === 200 && (await gym())?.accessExpiresAt?.getTime() === firstExpiry);
    check("refunded receipt remains historical", (await db.platformOrder.findUniqueOrThrow({ where: { id: renewal.receiptId! } })).status === "REFUNDED");
    check("replayed success cannot undo refund", (await send(payEvent(renewalPay, "succeeded", { created_at: iso(renewalStart + 1000), currency: "JPY" }))).status === 200 && (await gym())?.accessExpiresAt?.getTime() === firstExpiry);
    const journal = await db.webhookEvent.findUniqueOrThrow({ where: { eventId: retryId } });
    check("journal omits customer personal data", !JSON.stringify(journal.payload).includes(user.email!));
    check("unknown subscription requires reconciliation", (await send(subEvent("active", { subscription_id: `${prefix}_unknown`, metadata: {} }))).status === 503);
    console.log(`\n${passed}/${passed} signed webhook checks passed`);
  } finally {
    const owned = await gym();
    await db.billingAdjustment.deleteMany({ where: { payment: { subscriptionId: subId } } });
    await db.billingPayment.deleteMany({ where: { subscriptionId: subId } });
    await db.billingSubscription.deleteMany({ where: { orderId: order.id } });
    await db.platformOrder.deleteMany({ where: { userId: user.id } });
    if (owned) await db.gym.delete({ where: { id: owned.id } });
    else await db.user.delete({ where: { id: user.id } });
    await db.webhookEvent.deleteMany({ where: { eventId: { in: seen } } });
    await db.$disconnect();
  }
}
main().catch((error) => { console.error(error instanceof assert.AssertionError ? error.message : "Billing regression failed; inspect local server's safe reconciliation logs."); process.exit(1); });
