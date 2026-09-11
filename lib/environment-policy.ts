// Pure policy for configuration tests. Read process.env only in server-only env.ts.
type Environment = Record<string, string | undefined>;

export function productionDeployment(env: Environment): boolean {
  return env.VERCEL_ENV === "production" ||
    (env.NODE_ENV === "production" && env.VERCEL_ENV !== "preview");
}

export function localHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
    host === "[::1]" || host === "[::]" || /^127\./.test(host) || host === "0.0.0.0";
}

const placeholder = (value: string) =>
  /change.?me|replace.?me|your[_ -]|example|placeholder|dummy|ci-only|test[_ -](key|secret)/i.test(value) ||
  new Set(value).size < 8;

export function parseEnvironment(input: Environment) {
  const errors = new Set<string>();
  const value = (key: string) => input[key]?.trim() || undefined;
  const deployed = input.NODE_ENV === "production" || input.VERCEL_ENV === "preview" || input.VERCEL_ENV === "production";
  const live = productionDeployment(input);
  const databaseUrl = value("DATABASE_URL") ?? "";
  const authSecret = value("AUTH_SECRET") ?? "";
  let appUrl = value("APP_URL") ?? "";
  try {
    const url = new URL(databaseUrl);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length < 2) throw new Error();
  } catch { errors.add("DATABASE_URL"); }
  if (authSecret.length < 32 || (deployed && placeholder(authSecret))) errors.add("AUTH_SECRET");
  // JWT signing must use exactly the same bytes in the proxy and server.
  if (input.AUTH_SECRET !== authSecret) errors.add("AUTH_SECRET (surrounding whitespace)");
  try {
    const url = new URL(appUrl);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash ||
      (deployed && (url.protocol !== "https:" || localHostname(url.hostname)))) throw new Error();
    appUrl = url.origin;
  } catch { errors.add("APP_URL"); }

  const paymentKeys = ["DODO_PAYMENTS_API_KEY", "DODO_PAYMENTS_WEBHOOK_KEY", "DODO_PAYMENTS_ENVIRONMENT", "DODO_PRODUCT_ID_MONTHLY", "DODO_PRODUCT_ID_ANNUAL"] as const;
  const paymentConfigured = Boolean(value("DODO_PAYMENTS_API_KEY"));
  for (const key of paymentKeys) {
    if ((deployed || paymentConfigured) && !value(key)) errors.add(key);
  }
  const dodoEnvironment = value("DODO_PAYMENTS_ENVIRONMENT");
  if (dodoEnvironment && !["test_mode", "live_mode"].includes(dodoEnvironment)) errors.add("DODO_PAYMENTS_ENVIRONMENT");
  if (live && dodoEnvironment !== "live_mode") errors.add("DODO_PAYMENTS_ENVIRONMENT (live_mode required)");
  if (input.VERCEL_ENV === "preview" && dodoEnvironment !== "test_mode") errors.add("DODO_PAYMENTS_ENVIRONMENT (preview requires test_mode)");
  if (live) {
    for (const key of paymentKeys.filter((key) => key !== "DODO_PAYMENTS_ENVIRONMENT")) {
      if (value(key) && /placeholder|dummy|change.?me|replace.?me|^dodo_test_/i.test(value(key)!)) errors.add(key);
    }
  }
  if (paymentConfigured && value("DODO_PAYMENTS_API_KEY") === value("DODO_PAYMENTS_WEBHOOK_KEY")) errors.add("DODO_PAYMENTS_WEBHOOK_KEY (must differ from API key)");
  if (value("DODO_PRODUCT_ID_MONTHLY") && value("DODO_PRODUCT_ID_MONTHLY") === value("DODO_PRODUCT_ID_ANNUAL")) errors.add("DODO_PRODUCT_ID_ANNUAL (must differ from monthly)");
  for (const key of Object.keys(input)) {
    if (key.startsWith("NEXT_PUBLIC_") && /(SECRET|TOKEN|PASSWORD|PRIVATE_KEY|DATABASE_URL|DODO.*KEY)/i.test(key) && value(key)) errors.add(key);
  }
  if (deployed && (value("ALLOW_SIMULATED_PAYMENTS") === "true" || value("DISPOSABLE_DATABASE") === "true")) errors.add("development-only flags");
  if (errors.size) throw new Error(`Invalid application configuration: ${[...errors].join(", ")}. Values are intentionally omitted.`);
  return {
    databaseUrl, authSecret, appUrl,
    dodoApiKey: value("DODO_PAYMENTS_API_KEY"),
    dodoWebhookKey: value("DODO_PAYMENTS_WEBHOOK_KEY"),
    dodoEnvironment: dodoEnvironment as "live_mode" | "test_mode" | undefined,
    monthlyProductId: value("DODO_PRODUCT_ID_MONTHLY"),
    annualProductId: value("DODO_PRODUCT_ID_ANNUAL"),
  };
}
