import { localHostname } from "../lib/environment-policy";

/** Fixture writers may only touch explicitly named disposable local databases. */
export function assertDisposableDatabase(env: Record<string, string | undefined> = process.env): void {
  let safe = false;
  try {
    const url = new URL(env.DATABASE_URL ?? "");
    safe = ["postgres:", "postgresql:"].includes(url.protocol) && localHostname(url.hostname) &&
      /^\/beongym_test(?:_[a-z0-9_]+)?$/.test(url.pathname);
  } catch { /* report only the policy, never a credential-bearing URL */ }
  if (!safe || env.DISPOSABLE_DATABASE !== "true" || env.NODE_ENV === "production" ||
    (env.VERCEL_ENV && env.VERCEL_ENV !== "development")) {
    throw new Error("Fixture writes require DISPOSABLE_DATABASE=true and a local database named beongym_test or beongym_test_<suffix>, outside production/preview.");
  }
  if (env.CHECK_BASE_URL) {
    const target = new URL(env.CHECK_BASE_URL);
    if (!localHostname(target.hostname) || target.username || target.password) throw new Error("Fixture HTTP checks require a local CHECK_BASE_URL.");
  }
}
