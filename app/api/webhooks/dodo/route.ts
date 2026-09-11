import { NextResponse, type NextRequest } from "next/server";
import { Webhook } from "standardwebhooks";
import { db } from "@/lib/db";
import { applyEvent } from "@/lib/payments/events";
import { dodoEventSchema } from "@/lib/payments/policy";
import { webhookKey } from "@/lib/payments/dodo";
import { paymentLog } from "@/lib/payments/log";

export const runtime = "nodejs";
const BODY_LIMIT = 256 * 1024;

async function boundedBody(request: NextRequest): Promise<string> {
  if (Number(request.headers.get("content-length")) > BODY_LIMIT) throw new Error("Body too large");
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > BODY_LIMIT) { await reader.cancel(); throw new Error("Body too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
}

export async function POST(request: NextRequest) {
  const started = Date.now();
  const id = request.headers.get("webhook-id");
  const signature = request.headers.get("webhook-signature");
  const timestamp = request.headers.get("webhook-timestamp");
  if (!id || !/^[A-Za-z0-9_-]{1,200}$/.test(id) || !signature || signature.length > 2048 || !timestamp) {
    return NextResponse.json({ error: "Invalid webhook headers" }, { status: 400 });
  }
  const secret = webhookKey();
  if (!secret) return NextResponse.json({ error: "Webhook unavailable" }, { status: 503 });
  let raw: string;
  try { raw = await boundedBody(request); }
  catch { return NextResponse.json({ error: "Invalid webhook body" }, { status: 413 }); }
  let verified: unknown;
  try {
    // Standard Webhooks authenticates the exact raw body and delivery timestamp.
    verified = new Webhook(secret).verify(raw, {
      "webhook-id": id, "webhook-signature": signature, "webhook-timestamp": timestamp,
    });
  } catch {
    paymentLog("warn", "webhook.rejected", { webhookId: id, reason: "signature" });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  const parsed = dodoEventSchema.safeParse(verified);
  if (!parsed.success) return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
  const event = parsed.data;
  try {
    const outcome = await db.$transaction(async (tx) => {
      // Event claim and ledger effects commit together. Failure leaves retries usable.
      const claim = await tx.webhookEvent.createMany({ data: [{
        eventId: id, type: event.type,
        payload: { type: event.type, timestamp: event.timestamp,
          paymentId: event.data.payment_id ?? null, subscriptionId: event.data.subscription_id ?? null,
          refundId: event.data.refund_id ?? null, disputeId: event.data.dispute_id ?? null },
      }], skipDuplicates: true });
      if (!claim.count) return { duplicate: true };
      const result = await applyEvent(tx, event);
      await tx.webhookEvent.update({ where: { eventId: id }, data: { processedAt: new Date(), error: result.handled ? null : result.note } });
      return { duplicate: false, ...result };
    }, { timeout: 10000, maxWait: 2000 });
    paymentLog("info", "webhook.processed", { webhookId: id, type: event.type, ...outcome, ms: Date.now() - started });
    return NextResponse.json({ received: true, ...outcome });
  } catch {
    paymentLog("error", "webhook.reconciliation_required", { webhookId: id, type: event.type, ms: Date.now() - started });
    return NextResponse.json({ error: "Awaiting billing reconciliation" }, { status: 503, headers: { "Retry-After": "10" } });
  }
}

export async function GET() {
  return NextResponse.json({ error: "POST required" }, { status: 405, headers: { Allow: "POST" } });
}
