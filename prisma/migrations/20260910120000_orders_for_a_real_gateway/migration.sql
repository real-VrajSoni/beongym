-- Orders that can survive a payment gateway.
--
-- Nothing is deleted and no order changes meaning. Three shapes change:
--
--  1. A gym may hold more than one order. `gym_id` was UNIQUE — one order per
--     gym for its whole life — so renewals upserted over the row and destroyed
--     the record of the payment before. A gym renewing monthly for a year had
--     one row and no history: nothing to reconcile a refund against.
--
--  2. `provider_ref` becomes the idempotency key. A retried webhook must land
--     once, and the gateway's own id is the only value both sides agree on, so
--     the database enforces it rather than the handler remembering to check.
--     The existing values are seed placeholders, not gateway references
--     ('seed-claimed' appears five times), so they move to `kind` and `meta`
--     where they were always meant to live, and the column is nulled.
--
--  3. `kind` records which door an order came through, because what "paid"
--     should provision differs: a listing creates a gym, a claim transfers one,
--     a renewal extends a gym that already exists.

CREATE TYPE "OrderKind" AS ENUM ('CHECKOUT', 'LISTING', 'CLAIM', 'RENEWAL');

ALTER TABLE "platform_orders" ADD COLUMN "kind" "OrderKind" NOT NULL DEFAULT 'CHECKOUT';
ALTER TABLE "platform_orders" ADD COLUMN "meta" JSONB;

-- Preserve what the old provider_ref was actually saying before nulling it.
UPDATE "platform_orders"
   SET "kind" = CASE
         WHEN "provider_ref" LIKE 'claim:%'        THEN 'CLAIM'::"OrderKind"
         WHEN "provider_ref" LIKE 'seed-claimed%'  THEN 'CLAIM'::"OrderKind"
         WHEN "provider_ref" LIKE 'map-listing:%'  THEN 'LISTING'::"OrderKind"
         WHEN "provider_ref" LIKE 'seed-pin-only%' THEN 'LISTING'::"OrderKind"
         ELSE 'CHECKOUT'::"OrderKind"
       END,
       "meta" = CASE
         WHEN "provider_ref" IS NULL THEN NULL
         ELSE jsonb_build_object('legacyProviderRef', "provider_ref")
       END;

-- Only then is the column free to mean what it will mean from here on.
UPDATE "platform_orders" SET "provider_ref" = NULL;

DROP INDEX IF EXISTS "platform_orders_gym_id_key";
CREATE INDEX "platform_orders_gym_id_idx" ON "platform_orders"("gym_id");
CREATE UNIQUE INDEX "platform_orders_provider_ref_key" ON "platform_orders"("provider_ref");

-- Every webhook we have accepted, by the gateway's own event id.
CREATE TABLE "webhook_events" (
    "id"           TEXT NOT NULL,
    "event_id"     TEXT NOT NULL,
    "type"         TEXT NOT NULL,
    "payload"      JSONB NOT NULL,
    "received_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "error"        TEXT,
    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webhook_events_event_id_key" ON "webhook_events"("event_id");
CREATE INDEX "webhook_events_type_idx" ON "webhook_events"("type");
CREATE INDEX "webhook_events_received_at_idx" ON "webhook_events"("received_at");
