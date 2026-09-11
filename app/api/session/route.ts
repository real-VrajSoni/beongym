import { NextResponse } from "next/server";
import { getValidSession } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";

/**
 * "Is whoever is holding this browser still signed in?"
 *
 * Exists for one job: the back button. Next is a single-page app, so pressing
 * Back after a sign-out is a `popstate` that the client router answers from its
 * own cache — no request reaches the server, and the previous page comes back
 * on screen looking exactly as signed-in as it did before. `SessionGuard` asks
 * this on every restore and leaves if the answer is no.
 *
 * It returns a boolean and nothing else. No name, no role, no gym: a page that
 * has been restored does not need to know who you are, only whether to stay.
 * Anything more would be a new place for details to leak.
 *
 * Outside the proxy's matcher on purpose — it has to be answerable when signed
 * out, which is the only interesting case.
 */
export const runtime = "nodejs";

export async function GET() {
  if (!(await consumeRateLimit("session-status", "all", 1000, 60000))) {
    return NextResponse.json({ signedIn: false }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
  }
  const session = await getValidSession();
  return NextResponse.json(
    { signedIn: session !== null },
    {
      headers: {
        // A cached "yes" is the whole bug, one layer further out.
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    },
  );
}
