import { z } from "zod";

const identifier = z.string().min(1).max(200);
const date = z.iso.datetime({ offset: true });
export const dodoEventSchema = z.object({
  type: z.string().min(1).max(80), timestamp: date,
  data: z.object({
    subscription_id: identifier.nullish(), payment_id: identifier.nullish(), product_id: identifier.nullish(),
    checkout_session_id: identifier.nullish(), refund_id: identifier.nullish(), dispute_id: identifier.nullish(),
    status: z.string().max(40).nullish(), dispute_status: z.string().max(40).nullish(),
    currency: z.string().regex(/^[A-Z]{3}$/).nullish(),
    total_amount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullish(),
    amount: z.union([z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), z.string().max(40)]).nullish(),
    is_partial: z.boolean().optional(), created_at: date.optional(),
    previous_billing_date: date.nullish(), next_billing_date: date.nullish(),
    customer: z.object({ customer_id: identifier, email: z.string().max(320).optional() }).optional(),
    metadata: z.record(z.string().max(100), z.string().max(1000)).optional(),
  }),
});
export type DodoEvent = z.infer<typeof dodoEventSchema>;
export type DodoPayload = DodoEvent["data"];

/** Intl supplies ISO minor digits; the integer is never coerced through float. */
export function decimalAmount(amount: bigint, currency: string): string {
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Invalid currency");
  const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits!;
  const raw = amount.toString().padStart(digits + 1, "0");
  return digits ? `${raw.slice(0, -digits)}.${raw.slice(-digits)}` : raw;
}

export function receiptEligible(payment: {
  status: string; amountMinor: bigint;
  adjustments: { kind: string; status: string; amountMinor: bigint | null }[];
}): boolean {
  if (payment.status !== "succeeded" || payment.amountMinor <= BigInt(0)) return false;
  let refunded = BigInt(0);
  for (const item of payment.adjustments) {
    if (item.kind === "dispute" && !["dispute_won", "dispute_cancelled"].includes(item.status)) return false;
    if (item.kind === "refund" && item.status === "succeeded") {
      if (item.amountMinor === null) return false;
      refunded += item.amountMinor;
    }
  }
  return refunded < payment.amountMinor;
}
