-- Link a gym to its subscription at the gateway.
--
-- Additive. No existing row changes meaning: every gym already on the platform
-- gets billingStatus NONE, which is the truth — they were provisioned by hand
-- or by the seed, not through Dodo.
--
-- Note what is NOT here: no new table for platform subscriptions, and no change
-- to how access is decided. A gym's entitlement is still `accessExpiresAt`
-- against the clock, checked by hasAccess() in exactly one place. billingStatus
-- records where the *subscription* stands, which is a different question — a
-- cancelled subscription keeps its access to the end of the period it paid for.

CREATE TYPE "BillingStatus" AS ENUM ('NONE', 'ACTIVE', 'ON_HOLD', 'CANCELLED', 'EXPIRED', 'FAILED');

ALTER TABLE "gyms" ADD COLUMN "dodo_customer_id"     TEXT;
ALTER TABLE "gyms" ADD COLUMN "dodo_subscription_id" TEXT;
ALTER TABLE "gyms" ADD COLUMN "billing_status" "BillingStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "gyms" ADD COLUMN "billing_updated_at"   TIMESTAMP(3);

-- Two gyms sharing one subscription is a bug worth having the database refuse.
CREATE UNIQUE INDEX "gyms_dodo_subscription_id_key" ON "gyms"("dodo_subscription_id");
CREATE INDEX "gyms_dodo_customer_id_idx" ON "gyms"("dodo_customer_id");
