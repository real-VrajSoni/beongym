import "server-only";
import { z } from "zod";

/**
 * Environment policy for BeOnGym.
 *
 * `NODE_ENV=production` is also used by Vercel preview deployments, so a
 * preview is not treated as the live production deployment when VERCEL_ENV is
 * available. Local production builds still fail closed when VERCEL_ENV is not
 * set.
 */
export function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV === "production" ||
    (!process.env.VERCEL_ENV && process.env.NODE_ENV === "production");
}

const envSchema = z.object({
  DATABASE_URL: z.string().trim().min(1),
  AUTH_SECRET: z.string().trim().min(32),
  APP_URL: z.string().trim().url(),
  DODO_PAYMENTS_API_KEY: z.string().trim().min(1).optional(),
  DODO_PAYMENTS_WEBHOOK_KEY: z.string().trim().min(1).optional(),
  DODO_PAYMENTS_ENVIRONMENT: z.enum(["test_mode", "live_mode"]).optional(),
  DODO_PRODUCT_ID_MONTHLY: z.string().trim().min(1).optional(),
  DODO_PRODUCT_ID_ANNUAL: z.string().trim().min(1).optional(),
  DODO_ADAPTIVE_CURRENCY: z.string().trim().optional(),
  CHECK_BASE_URL: z.string().trim().url().optional(),
});

let validated = false;

/**
 * Validate configuration without ever including secret values in an error.
 * Development/test environments may omit Dodo credentials. The live deployment
 * is different: simulated payments are forbidden and all payment configuration
 * must be present before server infrastructure can initialize.
 */
export function validateEnvironment(): void {
  if (validated) return;

  const result = envSchema.safeParse(process.env);
  const missing: string[] = [];

  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !missing.includes(key)) missing.push(key);
    }
  }

  if (!process.env.DATABASE_URL?.trim()) missing.push("DATABASE_URL");
  if (!process.env.AUTH_SECRET?.trim() || process.env.AUTH_SECRET.trim().length < 32) {
    missing.push("AUTH_SECRET (minimum 32 characters)");
  }
  if (!process.env.APP_URL?.trim()) missing.push("APP_URL");

  if (isProductionDeployment()) {
    const requiredProduction = [
      "DODO_PAYMENTS_API_KEY",
      "DODO_PAYMENTS_WEBHOOK_KEY",
      "DODO_PAYMENTS_ENVIRONMENT",
      "DODO_PRODUCT_ID_MONTHLY",
      "DODO_PRODUCT_ID_ANNUAL",
    ];

    for (const key of requiredProduction) {
      if (!process.env[key]?.trim()) missing.push(key);
    }

    if (process.env.DODO_PAYMENTS_ENVIRONMENT !== "live_mode") {
      missing.push("DODO_PAYMENTS_ENVIRONMENT=live_mode");
    }
  }

  if (missing.length > 0) {
    const unique = [...new Set(missing)];
    throw new Error(
      `Invalid application configuration. Missing or invalid environment variables: ${unique.join(", ")}`,
    );
  }

  validated = true;
}

/** Server-only access to validated configuration. */
export function serverEnv(): {
  databaseUrl: string;
  authSecret: string;
  appUrl: string;
  dodoApiKey: string | undefined;
  dodoWebhookKey: string | undefined;
  dodoEnvironment: "test_mode" | "live_mode" | undefined;
  monthlyProductId: string | undefined;
  annualProductId: string | undefined;
} {
  validateEnvironment();
  return {
    databaseUrl: process.env.DATABASE_URL!,
    authSecret: process.env.AUTH_SECRET!,
    appUrl: process.env.APP_URL!,
    dodoApiKey: process.env.DODO_PAYMENTS_API_KEY?.trim() || undefined,
    dodoWebhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim() || undefined,
    dodoEnvironment:
      process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode"
        ? "live_mode"
        : process.env.DODO_PAYMENTS_ENVIRONMENT === "test_mode"
          ? "test_mode"
          : undefined,
    monthlyProductId: process.env.DODO_PRODUCT_ID_MONTHLY?.trim() || undefined,
    annualProductId: process.env.DODO_PRODUCT_ID_ANNUAL?.trim() || undefined,
  };
}
