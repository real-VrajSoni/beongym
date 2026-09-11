/**
 * Fail deployed servers, including previews, before serving requests with
 * incomplete security/payment configuration. Previews require Dodo test mode.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { validateEnvironment } = await import("./lib/env");
  validateEnvironment();
}
