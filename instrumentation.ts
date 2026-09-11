/**
 * Fail the live deployment before it can serve requests with an incomplete
 * security or payment configuration. Preview deployments keep the existing
 * development/test payment behavior because Vercel exposes VERCEL_ENV.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { validateEnvironment } = await import("./lib/env");
  validateEnvironment();
}
