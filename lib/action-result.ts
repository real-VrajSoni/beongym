import { z } from "zod";
import { getSession } from "./auth";
import { enforceRateLimit, RateLimitError } from "./rate-limit";

export type ActionResult =
  | {
      ok: true;
      message?: string;
      id?: string;
      checkoutUrl?: string;
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    out[key] ??= issue.message;
  }
  return out;
}

export function invalid(error: z.ZodError): ActionResult {
  return {
    ok: false,
    error: "Please fix the highlighted fields.",
    fieldErrors: fieldErrorsOf(error),
  };
}

/** Wraps an action body so unexpected failures never reach the user verbatim. */
export async function guard(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    const session = await getSession();
    await enforceRateLimit("mutations-global", "all", 1000, 60000);
    await enforceRateLimit("mutations-actor", session?.userId ?? "anonymous", session ? 60 : 30, 60000);
    return await fn();
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    if (err instanceof RateLimitError) return { ok: false, error: err.message };

    // Keep operational detail out of user responses and out of logs. The
    // provider/database error itself can contain credentials, SQL fragments,
    // customer data, or implementation details. Production observability should
    // capture these through the platform's protected error tooling instead.
    void err;
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
