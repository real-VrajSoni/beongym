import "server-only";
import DodoPayments from "dodopayments";
import { isProductionDeployment, serverEnv, validateEnvironment } from "@/lib/env";

/**
 * The gateway mode is explicit at the deployment boundary.
 *
 * Development/test environments may omit Dodo credentials and use the existing
 * simulated flow. A live production deployment may not: configuration is
 * validated before a payment path can execute, so missing credentials fail
 * closed instead of silently granting simulated access.
 */
export type DodoMode = "simulated" | "test" | "live";

export function dodoMode(): DodoMode {
  validateEnvironment();
  const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();

  if (!apiKey) {
    if (isProductionDeployment()) {
      throw new Error("Payment gateway configuration is missing.");
    }
    return "simulated";
  }

  return process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live" : "test";
}

/** True when a real gateway is configured. */
export function gatewayConfigured(): boolean {
  return dodoMode() !== "simulated";
}

function environment(): "live_mode" | "test_mode" {
  const value = process.env.DODO_PAYMENTS_ENVIRONMENT;
  if (value === "live_mode" || value === "test_mode") return value;
  if (isProductionDeployment()) {
    throw new Error("Payment gateway environment is not configured.");
  }
  return "test_mode";
}

let client: DodoPayments | null = null;

/** Shared server-side Dodo client. */
export function dodo(): DodoPayments {
  if (!client) {
    const env = serverEnv();
    if (!env.dodoApiKey) {
      throw new Error("Payment gateway credentials are not configured.");
    }
    client = new DodoPayments({
      bearerToken: env.dodoApiKey,
      environment: environment(),
      webhookKey: env.dodoWebhookKey,
    });
  }
  return client;
}

/** The webhook signing secret, which is a different value from the API key. */
export function webhookKey(): string | null {
  validateEnvironment();
  return process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim() || null;
}

/** The Dodo product id for one of our plans, if configured. */
export function productIdFor(planKey: string): string | null {
  validateEnvironment();
  const map: Record<string, string | undefined> = {
    MONTHLY: process.env.DODO_PRODUCT_ID_MONTHLY,
    ANNUAL: process.env.DODO_PRODUCT_ID_ANNUAL,
  };
  return map[planKey]?.trim() || null;
}

/** Whether to ask the gateway to charge in the buyer's own currency. */
export function adaptiveCurrency(): boolean {
  validateEnvironment();
  const flag = process.env.DODO_ADAPTIVE_CURRENCY?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  return true;
}
