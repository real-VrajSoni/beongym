/**
 * Dodo webhook tests:
 *   npm run check:webhook        (needs the dev server and a database)
 *
 * Drives the real endpoint over HTTP with real Standard Webhooks signatures,
 * rather than calling the handler directly. The things most likely to be wrong
 * here — a re-serialised body, a header read under the wrong name, a claim
 * committed before its effects — only show up through the whole path.
 *
 * A fixture gym is created and removed at the end, so this leaves the database
 * as it found it.
 */
import "dotenv/config";
import { assertDisposableDatabase } from "./disposable-database";
import { randomUUID } from "node:crypto";
import { Webhook } from "standardwebhooks";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { hasAccess } from "../lib/platform-plans";

const BASE = process.env.CHECK_BASE_URL ?? "http://localhost:3400";
const URL_PATH = "/api/webhooks/dodo";
const SECRET =
  process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim() ||
  "whsec_" + Buffer.from("beongym-webhook-test-secret").toString("base64");

type Check = { name: string; pass: boolean; detail: string };
const checks: Check[] = [];
const add = (name: string, pass: boolean, detail = "") => checks.push({ name, pass, detail });

const wh = new Webhook(SECRET.replace(/^whsec_/, ""));

/** Sign and POST a payload the way Dodo does. */
async function send(
  body: unknown,
  opts: { id?: string; omit?: string[]; corrupt?: boolean; timestamp?: Date } = {},
) {
  const raw = JSON.stringify(body);
  const id = opts.id ?? `evt_${randomUUID()}`;
  const timestamp = opts.timestamp ?? new Date();
  let signature = wh.sign(id, timestamp, raw);
  if (opts.corrupt) signature = signature.slice(0, -6) + "AAAAAA";

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "webhook-id": id,
    "webhook-signature": signature,
    "webhook-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
  };
  for (const h of opts.omit ?? []) delete headers[h];

  const res = await fetch(BASE + URL_PATH, { method: "POST", headers, body: raw });
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    /* a non-JSON body is itself a result worth reporting */
  }
  return { status: res.status, json, id };
}

const subEvent = (type: string, sub: string, extra: Record<string, unknown> = {}) => ({
  business_id: "bus_test",
  type,
  timestamp: new Date().toISOString(),
  data: {
    payload_type: "Subscription",
    subscription_id: sub,
    product_id: process.env.DODO_PRODUCT_ID_MONTHLY ?? "pdt_test_monthly",
    status: "active",
    currency: "USD",
    recurring_pre_tax_amount: 2000,
    customer: {
      customer_id: "cus_test_beongym",
      email: "webhook-fixture@beongym.test",
      name: "Fixture",
    },
    ...extra,
  },
});

const payEvent = (type: string, pay: string, extra: Record<string, unknown> = {}) => ({
  business_id: "bus_test",
  type,
  timestamp: new Date().toISOString(),
  data: {
    payload_type: "Payment",
    payment_id: pay,
    product_id: process.env.DODO_PRODUCT_ID_MONTHLY ?? "pdt_test_monthly",
    status: type === "payment.succeeded" ? "succeeded" : "failed",
    currency: "USD",
    total_amount: 2000,
    customer: {
      customer_id: "cus_test_beongym",
      email: "webhook-fixture@beongym.test",
      name: "Fixture",
    },
    ...extra,
  },
});

async function main() {
  assertDisposableDatabase();
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  const code = `WHTEST-${Date.now().toString().slice(-4)}`;
  const subId = `sub_test_${randomUUID().slice(0, 8)}`;

  const gym = await db.gym.create({
    data: {
      code,
      name: "Webhook Fixture Gym",
      city: "Oslo",
      country: "Norway",
      currency: "NOK",
      status: "TRIAL",
      tier: "PRO",
      accessExpiresAt: null,
      listed: false,
    },
  });
  const meta = { gymId: gym.id, planKey: "MONTHLY" };
  const reload = () =>
    db.gym.findUniqueOrThrow({
      where: { id: gym.id },
      select: {
        accessExpiresAt: true,
        billingStatus: true,
        tier: true,
        status: true,
        dodoSubscriptionId: true,
      },
    });

  try {
    console.log(`\nfixture gym ${code}  (${gym.id})\n`);

    /* 1. missing headers */
    for (const h of ["webhook-id", "webhook-signature", "webhook-timestamp"]) {
      const r = await send(subEvent("subscription.active", subId, { metadata: meta }), {
        omit: [h],
      });
      add(`missing ${h} -> 400`, r.status === 400, `got ${r.status}`);
    }

    /* 2. invalid signature */
    const bad = await send(subEvent("subscription.active", subId, { metadata: meta }), {
      corrupt: true,
    });
    add("tampered signature -> 401", bad.status === 401, `got ${bad.status}`);
    add(
      "tampered signature granted nothing",
      (await reload()).accessExpiresAt === null,
      "access still null",
    );

    /* 3. a body that does not match its signature */
    const rawMismatch = await (async () => {
      const good = subEvent("subscription.active", subId, { metadata: meta });
      const id = `evt_${randomUUID()}`;
      const ts = new Date();
      const sig = wh.sign(id, ts, JSON.stringify(good));
      const tampered = JSON.stringify({
        ...good,
        data: { ...good.data, recurring_pre_tax_amount: 1 },
      });
      const res = await fetch(BASE + URL_PATH, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "webhook-id": id,
          "webhook-signature": sig,
          "webhook-timestamp": String(Math.floor(ts.getTime() / 1000)),
        },
        body: tampered,
      });
      return res.status;
    })();
    add("body altered after signing -> 401", rawMismatch === 401, `got ${rawMismatch}`);

    /* 4. activation */
    const activate = await send(
      subEvent("subscription.active", subId, {
        metadata: meta,
        next_billing_date: new Date(Date.now() + 30 * 864e5).toISOString(),
      }),
    );
    add("subscription.active -> 2xx", activate.status === 200, `got ${activate.status}`);
    let state = await reload();
    add(
      "activation granted access",
      hasAccess(state.tier, state.accessExpiresAt),
      String(state.accessExpiresAt),
    );
    add(
      "activation set billingStatus ACTIVE",
      state.billingStatus === "ACTIVE",
      state.billingStatus,
    );
    add(
      "activation stored the subscription id",
      state.dodoSubscriptionId === subId,
      String(state.dodoSubscriptionId),
    );
    add(
      "activation wrote one order",
      (await db.platformOrder.count({ where: { gymId: gym.id, status: "PAID" } })) === 1,
      "",
    );

    /* 5. duplicate delivery */
    const first = await send(subEvent("subscription.renewed", subId, { metadata: meta }));
    const afterFirst = (await reload()).accessExpiresAt;
    const again = await send(subEvent("subscription.renewed", subId, { metadata: meta }), {
      id: first.id,
    });
    const afterSecond = (await reload()).accessExpiresAt;
    add("duplicate webhook-id -> 2xx", again.status === 200, `got ${again.status}`);
    add(
      "duplicate reported as duplicate",
      again.json.duplicate === true,
      JSON.stringify(again.json),
    );
    add(
      "duplicate did not extend access twice",
      String(afterFirst) === String(afterSecond),
      `${afterFirst} vs ${afterSecond}`,
    );

    /* 6. renewal extends */
    const before = (await reload()).accessExpiresAt!;
    await send(
      subEvent("subscription.renewed", subId, {
        metadata: meta,
        next_billing_date: new Date(before.getTime() + 30 * 864e5).toISOString(),
      }),
    );
    const after = (await reload()).accessExpiresAt!;
    add("renewal moved the paid-through date forward", after > before, `${before} -> ${after}`);

    /* 7. payment failure must not touch access */
    const paidThrough = (await reload()).accessExpiresAt;
    const fail = await send(
      payEvent("payment.failed", `pay_fail_${randomUUID().slice(0, 8)}`, { metadata: meta }),
    );
    state = await reload();
    add("payment.failed -> 2xx", fail.status === 200, `got ${fail.status}`);
    add(
      "payment.failed left the paid period alone",
      String(state.accessExpiresAt) === String(paidThrough),
      "unchanged",
    );
    add(
      "payment.failed recorded a FAILED order",
      (await db.platformOrder.count({ where: { gymId: gym.id, status: "FAILED" } })) === 1,
      "",
    );

    /* 8. on hold keeps the paid period */
    await send(subEvent("subscription.on_hold", subId, { metadata: meta }));
    state = await reload();
    add("on_hold set ON_HOLD", state.billingStatus === "ON_HOLD", state.billingStatus);
    add(
      "on_hold kept access to the paid date",
      String(state.accessExpiresAt) === String(paidThrough),
      "unchanged",
    );

    /* 9. cancellation keeps access to the end of the paid period */
    await send(subEvent("subscription.cancelled", subId, { metadata: meta }));
    state = await reload();
    add("cancelled set CANCELLED", state.billingStatus === "CANCELLED", state.billingStatus);
    add(
      "cancelled did NOT revoke access early",
      hasAccess(state.tier, state.accessExpiresAt),
      `paid through ${state.accessExpiresAt}`,
    );

    /* 10. expiry, with the period already run out */
    await db.gym.update({
      where: { id: gym.id },
      data: { accessExpiresAt: new Date(Date.now() - 864e5) },
    });
    await send(subEvent("subscription.expired", subId, { metadata: meta }));
    state = await reload();
    add("expired set EXPIRED", state.billingStatus === "EXPIRED", state.billingStatus);
    add(
      "expired leaves the gym without access",
      !hasAccess(state.tier, state.accessExpiresAt),
      String(state.accessExpiresAt),
    );

    /* 11. resolution without metadata, via the stored subscription id */
    const orphan = await send(subEvent("subscription.renewed", subId, {}));
    add(
      "resolves by stored subscription id when metadata is absent",
      orphan.json.handled === true,
      JSON.stringify(orphan.json),
    );

    /* 12. an event for nobody is acknowledged, not retried forever.
       A different customer as well as a different subscription: sharing the
       fixture's customer_id resolves through the dodoCustomerId fallback, which
       is the chain working rather than a miss. */
    const nobody = await send(
      subEvent("subscription.renewed", `sub_unknown_${randomUUID().slice(0, 6)}`, {
        customer: {
          customer_id: `cus_unknown_${randomUUID().slice(0, 6)}`,
          email: `nobody-${randomUUID().slice(0, 6)}@beongym.test`,
          name: "Nobody",
        },
      }),
    );
    add("unknown subscription -> 2xx", nobody.status === 200, `got ${nobody.status}`);
    add(
      "unknown subscription not treated as handled",
      nobody.json.handled === false,
      JSON.stringify(nobody.json),
    );

    /* 13. GET is refused */
    const get = await fetch(BASE + URL_PATH);
    add("GET -> 405", get.status === 405, `got ${get.status}`);
  } finally {
    const orders = await db.platformOrder.findMany({
      where: { gymId: gym.id },
      select: { id: true },
    });
    await db.platformOrder.deleteMany({ where: { id: { in: orders.map((o) => o.id) } } });
    await db.webhookEvent.deleteMany({
      where: { payload: { path: ["data", "metadata", "gymId"], equals: gym.id } },
    });
    await db.gym.delete({ where: { id: gym.id } });
    await db.$disconnect();
  }

  console.log("");
  for (const c of checks) {
    console.log(`${c.pass ? "  ok  " : "  FAIL"} ${c.name}${c.pass ? "" : `  — ${c.detail}`}`);
  }
  const failed = checks.filter((c) => !c.pass);
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
