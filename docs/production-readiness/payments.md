# Billing implementation and rollout gate

Phase 2 keeps hosted Dodo checkout, Prisma and the existing gym access field. It adds an immutable-identity billing ledger and derives access from successful, eligible payment periods. The application never simulates a successful purchase, including locally.

Official references checked on 11 September 2026:
- https://docs.dodopayments.com/developer-resources/webhooks — Standard Webhooks signatures, exact raw bytes, retries, out-of-order delivery and latest delivery payload.
- https://docs.dodopayments.com/miscellaneous/faq — activation/payment/renewal may describe the same initial subscription; scheduled cancellation differs from immediate cancellation.
- https://docs.dodopayments.com/developer-resources/webhooks/intents/subscription
- https://docs.dodopayments.com/developer-resources/webhooks/intents/payment
- https://docs.dodopayments.com/developer-resources/webhooks/intents/refund
- https://docs.dodopayments.com/integrations/datafast — currency minor-unit handling.
- Installed `dodopayments` SDK types for customer portal, checkout idempotency options, payment checkout_session_id, subscription dates, refund and dispute fields.

## Contract

1. Authenticated buyer creates one pending checkout reservation. Missing provider config fails before inserting an order. A transport failure remains unresolved/pending: it does not imply either a charge or no charge. Support must reconcile it before another checkout. Existing subscription customers use the customer portal; do not create parallel recurring contracts.
2. Raw signature and delivery timestamp are verified before schema parsing. Body size is bounded. Only minimal event identifiers are stored in the webhook journal; no customer/billing/card payload is copied there.
3. A subscription must bind to the original server-created order, product and customer. A payment must match that subscription/customer and, before first fulfilment, its hosted checkout session. Gym ID and email fallback resolution are removed.
4. Subscription state and exact payment minor-unit amount/currency are distinct records. Successful payment plus an active, verified billing period authorizes provisioning. Payment arriving first receives 503; the transaction and event claim roll back so its retry is usable.
5. Subscription-level advisory locks and order/buyer row locks serialize competing deliveries. A payment ID has one ledger identity and receipt. The subscription event timestamp protects later lifecycle state; paid receipt transitions are terminal against failed/pending replay.
6. No invented period, price or USD conversion. Actual receipts use provider currency; integer minor units are retained, and display amounts support zero/two/three-decimal currencies. No subscription ID is used as a payment receipt ID.
7. Cancellation preserves paid-through access. Full refunds remove the relevant payment's grant; partial refunds remain recorded. Unresolved/lost disputes hold that payment's grant; won/cancelled disputes restore eligibility. Unknown refund amounts hold eligibility for reconciliation without inventing a refunded amount. Administrative suspension remains independent.
8. Checkout return is buyer-scoped and read-only. No cookie mutations during rendering, no hardcoded external login domain, no endless refresh or promise that an unconfirmed payment is safe.
9. Claim payments never transfer ownership. New paid claims are blocked until the independent review workflow is implemented. Existing claim payments are recorded and held for review.

## Deployment requirements — not yet satisfied

- Take and restore-test a database backup; apply the additive `20260911120000_verified_billing_ledger` migration. It creates three tables with restrictive financial foreign keys and widens the existing amount column. No existing payment rows are deleted or automatically converted.
- Existing fulfilled Dodo subscriptions require a verified ledger migration using actual provider payment IDs, amounts, currencies and billing periods. The handler deliberately returns a retryable reconciliation error instead of clearing their existing access or fabricating historical receipts. Do not roll this change into a live recurring customer population before performing that migration. Inspect Dodo's dashboard and existing metadata; unknown/ambiguous mappings require operator review.
- Verify monthly/annual product IDs, prices, currencies, intervals, trials, customer portal settings and cancellation options in the intended Dodo account. Sandbox and live resources are distinct. Do not infer account correctness from key shape.
- Configure payment, subscription, refund and dispute events. Monitor `webhook.reconciliation_required` and replay failed events after correcting a mapping/configuration issue. No background work runs after the response.
- Exercise real sandbox hosted checkout and portal/cancellation/refund lifecycle on staging. Local signed synthetic events prove handler behavior, not provider account integration.
- Review refund/dispute access policy and recurring-billing disclosures with the business/legal owner before taking money.
- Rollback must preserve new ledger records. Prefer disabling new checkout and fixing forward. Never drop the ledger or replay historic destructive migrations as a rollback.

## Tests

`node --import tsx scripts/test-env.ts node --conditions=react-server --import tsx scripts/webhook-check.ts` drives the real HTTP handler with synthetic Standard Webhooks signatures. 46 checks cover signatures, malformed bodies, replay, retries, concurrent fulfilment, disabled buyers, buyer/tenant/product/customer binding, exact currencies, paid-period renewal, suspension, cancellation, partial/full refunds and disputes. `checkout-safety-check.ts` proves a missing gateway creates no order. `tests/payments.test.ts` tests currency, event validation and receipt eligibility. No actual card was charged and no customer message was sent.
