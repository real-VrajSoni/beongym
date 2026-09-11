import { test } from "node:test";
import assert from "node:assert/strict";
import { decimalAmount, receiptEligible, dodoEventSchema } from "../lib/payments/policy";

test("payment amounts preserve zero/two/three minor digits without floating point", () => {
  assert.equal(decimalAmount(BigInt(2000), "USD"), "20.00");
  assert.equal(decimalAmount(BigInt(2000), "JPY"), "2000");
  assert.equal(decimalAmount(BigInt(2001), "KWD"), "2.001");
  assert.equal(decimalAmount(BigInt(0), "USD"), "0.00");
});
test("only positive successful non-refunded payments can authorize access", () => {
  const paid = { status: "succeeded", amountMinor: BigInt(2000), adjustments: [] };
  assert.equal(receiptEligible(paid), true);
  for (const status of ["pending", "processing", "failed", "cancelled"]) assert.equal(receiptEligible({ ...paid, status }), false);
  assert.equal(receiptEligible({ ...paid, amountMinor: BigInt(0) }), false);
  assert.equal(receiptEligible({ ...paid, adjustments: [{ kind: "refund", status: "succeeded", amountMinor: BigInt(2000) }] }), false);
  assert.equal(receiptEligible({ ...paid, adjustments: [{ kind: "refund", status: "succeeded", amountMinor: null }] }), false);
  assert.equal(receiptEligible({ ...paid, adjustments: [{ kind: "refund", status: "succeeded", amountMinor: BigInt(500) }] }), true);
});
test("unresolved or lost disputes hold access; won/cancelled restore eligibility", () => {
  for (const status of ["dispute_opened", "dispute_challenged", "dispute_lost", "dispute_accepted", "dispute_expired", "dispute_won", "dispute_cancelled"]) {
    assert.equal(receiptEligible({ status: "succeeded", amountMinor: BigInt(2000), adjustments: [{ kind: "dispute", status, amountMinor: null }] }), ["dispute_won", "dispute_cancelled"].includes(status));
  }
});
test("event envelope rejects malformed dates and unsafe monetary values, strips personal payload fields", () => {
  const event = { type: "payment.succeeded", timestamp: new Date().toISOString(), data: { total_amount: 2000, billing: { street: "secret" }, card: "secret" } };
  assert.deepEqual(dodoEventSchema.parse(event).data, { total_amount: 2000 });
  assert.equal(dodoEventSchema.safeParse({ ...event, timestamp: "invalid" }).success, false);
  for (const amount of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) assert.equal(dodoEventSchema.safeParse({ ...event, data: { total_amount: amount } }).success, false);
});
