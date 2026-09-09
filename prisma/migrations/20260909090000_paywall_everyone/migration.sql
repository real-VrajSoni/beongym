-- The free tier is gone: every gym on the platform has paid for something.
-- STARTER disappears and ELITE returns as the lifetime plan.

-- Existing free gyms become Pro rows with no access window, which is the
-- honest description of them: they never paid, so they have nothing to spend.
ALTER TABLE "gyms" ALTER COLUMN "tier" DROP DEFAULT;
ALTER TABLE "platform_orders" ALTER COLUMN "tier" TYPE text USING ("tier"::text);
ALTER TABLE "gyms" ALTER COLUMN "tier" TYPE text USING ("tier"::text);

UPDATE "gyms" SET "tier" = 'PRO' WHERE "tier" = 'STARTER';
UPDATE "platform_orders" SET "tier" = 'PRO' WHERE "tier" = 'STARTER';

DROP TYPE "PlatformTier";
CREATE TYPE "PlatformTier" AS ENUM ('PRO', 'ELITE');

ALTER TABLE "gyms"
  ALTER COLUMN "tier" TYPE "PlatformTier" USING ("tier"::"PlatformTier");
ALTER TABLE "platform_orders"
  ALTER COLUMN "tier" TYPE "PlatformTier" USING ("tier"::"PlatformTier");
ALTER TABLE "gyms" ALTER COLUMN "tier" SET DEFAULT 'PRO';

-- When paid access runs out. Null means it never started.
ALTER TABLE "gyms" ADD COLUMN "access_expires_at" TIMESTAMP(3);

-- Gyms that were actually paying keep a live window; the rest get none.
UPDATE "gyms" g
   SET "access_expires_at" = NOW() + INTERVAL '30 days'
  FROM "platform_orders" o
 WHERE o."gym_id" = g."id"
   AND o."status" = 'PAID'
   AND o."amount" > 0;
