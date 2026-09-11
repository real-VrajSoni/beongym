-- Additive provider ledger. Existing receipts and access grants are preserved.
-- Expand decimal precision to preserve currencies with three minor digits.
ALTER TABLE "platform_orders" ALTER COLUMN "amount" TYPE DECIMAL(20,3);
CREATE TABLE "billing_subscriptions" (
  "id" TEXT PRIMARY KEY, "order_id" TEXT NOT NULL UNIQUE,
  "product_id" TEXT NOT NULL, "customer_id" TEXT NOT NULL, "status" TEXT NOT NULL,
  "event_at" TIMESTAMP(3) NOT NULL, "period_start" TIMESTAMP(3), "period_end" TIMESTAMP(3),
  CONSTRAINT "billing_subscriptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "platform_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "billing_payments" (
  "id" TEXT PRIMARY KEY, "subscription_id" TEXT NOT NULL, "receipt_id" TEXT UNIQUE,
  "amount_minor" BIGINT NOT NULL CHECK ("amount_minor" >= 0), "currency" TEXT NOT NULL,
  "status" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL, "event_at" TIMESTAMP(3) NOT NULL, "access_until" TIMESTAMP(3),
  CONSTRAINT "billing_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_payments_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "platform_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "billing_payments_subscription_id_created_at_idx" ON "billing_payments"("subscription_id", "created_at");
CREATE TABLE "billing_adjustments" (
  "id" TEXT PRIMARY KEY, "payment_id" TEXT NOT NULL, "kind" TEXT NOT NULL, "status" TEXT NOT NULL,
  "amount_minor" BIGINT CHECK ("amount_minor" >= 0), "event_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "billing_adjustments_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "billing_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "billing_adjustments_payment_id_idx" ON "billing_adjustments"("payment_id");
