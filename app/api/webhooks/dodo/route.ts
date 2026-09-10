import { NextResponse, type NextRequest } from "next/server";
import { Webhook } from "standardwebhooks";
import type { Prisma } from "@/lib/generated/prisma/client";
import { db } from "@/lib/db";
import { applyEvent, type DodoEvent } from "@/lib/payments/events";
import { webhookKey } from "@/lib/payments/dodo";
import { paymentLog } from "@/lib/payments/log";

/**
 * Dodo Payments webhooks.
 *
 * The only place in this application that grants paid access. Nothing the
 * browser says about a payment is believed — the success page shows "we are
 * confirming your payment" and polls; this endpoint is what actually moves
 * `accessExpiresAt`.
 *
 * Node runtime, not edge: signature verification needs `crypto`, and Prisma
 * does not run on the edge.
 */
export const runtime = "nodejs";

/**
 * Deliberately synchronous, against the vendor's own queue-and-worker example.
 *
 * That example assumes a Redis-backed worker outliving the request. On Vercel
 * the function is frozen the moment the response is returned, so "enqueue and
 * process later" has no later: work handed off after the 200 may simply never
 * run. The durable record here is the `webhook_events` row, written inside the
 * same transaction as the effects — which is what the queue was providing.
 *
 * The trade is a slower response, and the budget is comfortable: verification
 * plus a handful of indexed writes against Postgres, well inside the fifteen
 * seconds Dodo allows before it calls the delivery failed.
 */
const MAX_SKEW_SECONDS = 60 * 5;

export async function POST(request: NextRequest) {
  const started = Date.now();

  // The exact bytes. Parsing and re-serialising reorders keys and the signature
  // will never match — the single most common way this endpoint gets broken.
  const raw = await request.text();

  const id = request.headers.get("webhook-id");
  const signature = request.headers.get("webhook-signature");
  const timestamp = request.headers.get("webhook-timestamp");

  paymentLog("info", "webhook.received", {
    webhookId: id,
    bytes: raw.length,
    hasSignature: Boolean(signature),
  });

  if (!id || !signature || !timestamp) {
    paymentLog("warn", "webhook.rejected", {
      webhookId: id,
      reason: "missing headers",
      missing: [
        !id && "webhook-id",
        !signature && "webhook-signature",
        !timestamp && "webhook-timestamp",
      ]
        .filter(Boolean)
        .join(","),
    });
    return NextResponse.json({ error: "Missing webhook headers" }, { status: 400 });
  }

  const secret = webhookKey();
  if (!secret) {
    // Refuse rather than accept unverified. A 500 is right: this is our
    // misconfiguration, and Dodo retrying after we fix it is the behaviour we
    // want. Acknowledging would silently discard real payments.
    paymentLog("error", "webhook.misconfigured", {
      webhookId: id,
      reason: "DODO_PAYMENTS_WEBHOOK_KEY is not set",
    });
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  /* ── verification ─────────────────────────────────────────────── */
  let event: DodoEvent;
  try {
    const verified = new Webhook(secret).verify(raw, {
      "webhook-id": id,
      "webhook-signature": signature,
      "webhook-timestamp": timestamp,
    });
    event = verified as DodoEvent;
    paymentLog("info", "webhook.verified", { webhookId: id, type: event.type });
  } catch (err) {
    // Never acknowledge an unverified request. A 401 keeps a forged event out
    // and, if it was ours and merely misconfigured, keeps it in Dodo's retry
    // queue instead of being silently dropped.
    paymentLog("warn", "webhook.rejected", {
      webhookId: id,
      reason: "invalid signature",
      detail: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // The spec's replay guard. The library checks this too; it is repeated here
  // because a webhook that is hours old and still verifying is worth a log line
  // rather than a silent success.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (Number.isFinite(age) && age > MAX_SKEW_SECONDS) {
    paymentLog("warn", "webhook.stale", {
      webhookId: id,
      type: event.type,
      ageSeconds: Math.round(age),
    });
  }

  /* ── claim and apply, together ────────────────────────────────── */
  try {
    const outcome = await db.$transaction(async (tx) => {
      // The claim and the effects commit or roll back as one. Claiming first
      // and committing separately is the classic way to lose an event: a
      // failure after the claim leaves a row that makes every retry a no-op.
      const claim = await tx.webhookEvent.createMany({
        data: [
          { eventId: id, type: event.type, payload: event as unknown as Prisma.InputJsonValue },
        ],
        skipDuplicates: true,
      });
      if (claim.count === 0) return { duplicate: true as const };

      const result = await applyEvent(tx, event);
      await tx.webhookEvent.update({
        where: { eventId: id },
        data: { processedAt: new Date(), error: result.handled ? null : result.note },
      });
      return { duplicate: false as const, ...result };
    });

    if (outcome.duplicate) {
      paymentLog("info", "webhook.duplicate", {
        webhookId: id,
        type: event.type,
        ms: Date.now() - started,
      });
      return NextResponse.json({ received: true, duplicate: true });
    }

    paymentLog("info", "webhook.processed", {
      webhookId: id,
      type: event.type,
      gymId: outcome.gymId,
      handled: outcome.handled,
      note: outcome.note,
      ms: Date.now() - started,
    });
    return NextResponse.json({ received: true, handled: outcome.handled });
  } catch (err) {
    // The transaction rolled back, claim included, so Dodo's retry gets a clean
    // attempt. 500 rather than 200 precisely so that retry happens.
    paymentLog("error", "webhook.failed", {
      webhookId: id,
      type: event.type,
      detail: err instanceof Error ? err.message : "unknown",
      ms: Date.now() - started,
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

/** Anything but POST. Saying so beats Next's default 405 with no explanation. */
export async function GET() {
  return NextResponse.json(
    { error: "This endpoint accepts POST from Dodo Payments only." },
    { status: 405 },
  );
}
