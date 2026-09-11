import { z } from "zod";

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
    return await fn();
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;

    // Keep operational detail out of user responses and out of logs. The
    // provider/database error itself can contain credentials, SQL fragments,
    // customer data, or implementation details. Production observability should
    // capture these through the platform's protected error tooling instead.
    void err;
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
