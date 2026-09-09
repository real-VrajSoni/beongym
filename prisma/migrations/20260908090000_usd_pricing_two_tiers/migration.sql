-- Elite is gone: everything it carried now ships inside Pro, so the enum drops
-- to the two tiers the product actually sells. Any Elite rows were moved to Pro
-- before this ran.
ALTER TYPE "PlatformTier" RENAME TO "PlatformTier_old";
CREATE TYPE "PlatformTier" AS ENUM ('STARTER', 'PRO');

ALTER TABLE "gyms" ALTER COLUMN "tier" DROP DEFAULT;
ALTER TABLE "gyms" ALTER COLUMN "tier" TYPE "PlatformTier" USING ("tier"::text::"PlatformTier");
ALTER TABLE "gyms" ALTER COLUMN "tier" SET DEFAULT 'STARTER';

ALTER TABLE "platform_orders"
  ALTER COLUMN "tier" TYPE "PlatformTier" USING ("tier"::text::"PlatformTier");

DROP TYPE "PlatformTier_old";

-- Paid once, never billed again.
ALTER TYPE "BillingCycle" ADD VALUE 'LIFETIME';

-- One price worldwide, quoted in dollars.
ALTER TABLE "platform_orders" ALTER COLUMN "currency" SET DEFAULT 'USD';
