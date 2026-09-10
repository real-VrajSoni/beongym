import { z } from "zod";

export type ActionResult =
  | {
      ok: true;
      message?: string;
      /** The row an action created, for a caller that wants to navigate to it. */
      id?: string;
      /**
       * Where the browser must go to pay.
       *
       * Its own field, and named for exactly what it is, because twice now a
       * checkout URL has been smuggled through a field meant for something
       * else — once as `id`, once as a listing's `code` — and both times the
       * caller did the wrong thing with it silently. A form that renders a
       * Dodo URL as a gym code looks like success and is not.
       *
       * Set only when a real gateway is configured. When it is present the
       * caller has one job: leave.
       */
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

/** Wraps an action body so unexpected failures surface as a clean message. */
export async function guard(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await fn();
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err; // redirect()/notFound()
    console.error("[action]", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
