import "server-only";
import { createHmac } from "node:crypto";
import { db } from "./db";
import { serverEnv } from "./env";

export class RateLimitError extends Error {
  constructor() { super("Too many requests. Please wait and try again."); }
}

/** Atomic PostgreSQL counters shared by every app instance. No raw identity stored. */
export async function consumeRateLimit(scope: string, subject: string, maximum: number, windowMs: number): Promise<boolean> {
  const key = createHmac("sha256", serverEnv().authSecret).update(`${scope}:${subject}`).digest("hex");
  const rows = await db.$queryRaw<{ hits: number }[]>`
    INSERT INTO rate_limit_buckets (key, hits, expires_at)
    VALUES (${key}, 1, clock_timestamp() + ${windowMs} * interval '1 millisecond')
    ON CONFLICT (key) DO UPDATE SET
      hits = CASE WHEN rate_limit_buckets.expires_at <= clock_timestamp() THEN 1 ELSE rate_limit_buckets.hits + 1 END,
      expires_at = CASE WHEN rate_limit_buckets.expires_at <= clock_timestamp()
        THEN clock_timestamp() + ${windowMs} * interval '1 millisecond' ELSE rate_limit_buckets.expires_at END
    WHERE rate_limit_buckets.hits < ${maximum} OR rate_limit_buckets.expires_at <= clock_timestamp()
    RETURNING hits`;
  // Bounded cleanup using the expiration index; no unbounded retention of keys.
  await db.$executeRaw`DELETE FROM rate_limit_buckets WHERE key IN
    (SELECT key FROM rate_limit_buckets WHERE expires_at < clock_timestamp() - interval '1 hour' ORDER BY expires_at LIMIT 50)`;
  return rows.length === 1;
}

export async function enforceRateLimit(scope: string, subject: string, maximum: number, windowMs: number) {
  if (!(await consumeRateLimit(scope, subject, maximum, windowMs))) throw new RateLimitError();
}

export async function loginRateAllowed(identity: string): Promise<boolean> {
  try {
    return await consumeRateLimit("login-global", "all", 120, 60000) &&
      await consumeRateLimit("login-account", identity.toLowerCase(), 10, 15 * 60000);
  } catch { return false; }
}
