import "server-only";
import DodoPayments from "dodopayments";

/**
 * The gateway, and whether there is one.
 *
 * With no API key configured the product runs in `simulated` mode: orders still
 * move through the same PENDING → provisioned state machine, the same handlers
 * run, and nothing reaches out to a network. That is what keeps `npm run
 * db:seed` and the check suites working on a machine that has never heard of
 * Dodo, and it is why a contributor does not need a payment account to run the
 * app. Configure a key and the identical code paths talk to the gateway.
 *
 * The mode is derived rather than declared. A separate DODO_MODE flag would be
 * a second source of truth that can disagree with reality — a key present and
 * the flag saying simulated is a configuration nobody can debug from the
 * symptoms.
 */
export type DodoMode = "simulated" | "test" | "live";

export function dodoMode(): DodoMode {
  if (!process.env.DODO_PAYMENTS_API_KEY?.trim()) return "simulated";
  return process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live" : "test";
}

/** True when a real gateway is configured. */
export function gatewayConfigured(): boolean {
  return dodoMode() !== "simulated";
}

/**
 * The SDK's environment union.
 *
 * Narrowed rather than cast, and defaulting to test: the SDK's own default is
 * `live_mode`, so a typo in the variable would quietly point a development
 * machine at real cards.
 */
function environment(): "live_mode" | "test_mode" {
  return process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode";
}

let client: DodoPayments | null = null;

/**
 * The shared client.
 *
 * Lazy, because importing this module must not throw on a machine with no
 * credentials — the webhook route and the checkout actions both import it, and
 * the whole point of simulated mode is that they still load.
 */
export function dodo(): DodoPayments {
  if (!client) {
    client = new DodoPayments({
      bearerToken: process.env.DODO_PAYMENTS_API_KEY,
      environment: environment(),
      webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
    });
  }
  return client;
}

/** The webhook signing secret, which is a different value from the API key. */
export function webhookKey(): string | null {
  return process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim() || null;
}

/** The Dodo product id for one of our plans, if configured. */
export function productIdFor(planKey: string): string | null {
  const map: Record<string, string | undefined> = {
    MONTHLY: process.env.DODO_PRODUCT_ID_MONTHLY,
    ANNUAL: process.env.DODO_PRODUCT_ID_ANNUAL,
  };
  return map[planKey]?.trim() || null;
}

/**
 * Whether to ask the gateway to charge in the buyer's own currency.
 *
 * On, with an escape hatch. Forcing `billing_currency: INR` on its own produced
 *
 *   payment.failed — "Payment mode not enabled for this merchant."
 *
 * The currency was not the whole story. Dodo chooses which payment methods to
 * offer from the *billing country*, so a currency with no country attached left
 * an Indian buyer being asked for a card on an INR rail their card cannot use.
 * Sending the country — and naming UPI for India — is what makes the local
 * currency payable rather than merely displayed.
 *
 * Set DODO_ADAPTIVE_CURRENCY=0 to fall back to charging in dollars everywhere,
 * which is the safe answer if a particular currency turns out not to be enabled
 * on the account.
 */
export function adaptiveCurrency(): boolean {
  const flag = process.env.DODO_ADAPTIVE_CURRENCY?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  return true;
}
