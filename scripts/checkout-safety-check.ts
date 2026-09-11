import "dotenv/config";
import assert from "node:assert/strict";
import { assertDisposableDatabase } from "./disposable-database";

async function main() {
  assertDisposableDatabase();
  // Dynamic imports ensure the gateway is absent when configuration is parsed.
  for (const key of ["DODO_PAYMENTS_API_KEY", "DODO_PAYMENTS_WEBHOOK_KEY", "DODO_PRODUCT_ID_MONTHLY", "DODO_PRODUCT_ID_ANNUAL"]) process.env[key] = "";
  const { startPurchase } = await import("../lib/payments/checkout");
  const { db } = await import("../lib/db");
  const before = await db.platformOrder.count();
  const result = await startPurchase({ userId: null, email: null, name: null, planKey: "MONTHLY", kind: "CHECKOUT", gymName: "Must never be created", city: null, returnPath: "/checkout/return" });
  assert.equal(result.ok, false);
  assert.equal(await db.platformOrder.count(), before);
  await db.$disconnect();
  console.log("PASS: unavailable gateway creates no order, gym or paid entitlement");
}
main().catch(() => { console.error("Checkout safety regression failed"); process.exit(1); });
