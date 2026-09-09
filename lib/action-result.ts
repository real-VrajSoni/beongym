import { z } from "zod";

export type ActionResult =
  | { ok: true; message?: string; id?: string }
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
