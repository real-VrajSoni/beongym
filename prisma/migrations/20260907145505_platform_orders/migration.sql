-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PROSPECT';

-- CreateTable
CREATE TABLE "platform_orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gym_id" TEXT,
    "tier" "PlatformTier" NOT NULL,
    "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "provider_ref" TEXT,
    "gym_name" TEXT NOT NULL,
    "city" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "platform_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_orders_gym_id_key" ON "platform_orders"("gym_id");

-- CreateIndex
CREATE INDEX "platform_orders_user_id_idx" ON "platform_orders"("user_id");

-- CreateIndex
CREATE INDEX "platform_orders_status_idx" ON "platform_orders"("status");

-- CreateIndex
CREATE INDEX "platform_orders_created_at_idx" ON "platform_orders"("created_at");

-- AddForeignKey
ALTER TABLE "platform_orders" ADD CONSTRAINT "platform_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_orders" ADD CONSTRAINT "platform_orders_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
