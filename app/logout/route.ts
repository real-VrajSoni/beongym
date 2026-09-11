import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { destroySession } from "@/lib/auth";
import { serverEnv } from "@/lib/env";

/**
 * Sign-out endpoint.
 *
 * A route handler rather than a server action inside the menu: the dropdown
 * closes on select, which tore down the form mid-submit and made sign-out
 * silently do nothing. Navigating here always works, even if the menu's
 * JavaScript never hydrated.
 *
 * Only same-origin navigations are honoured, so a third-party page cannot
 * force a visitor to be signed out with an <img src="/logout">.
 */
async function clear(request: NextRequest) {
  await destroySession();
  // Home, not the sign-in page.
  //
  // Landing on /login left people in a loop: the workspace is still behind them
  // in history, so pressing Back reached a protected page, the proxy turned
  // them away, and they arrived at /login again. Back appeared to do nothing.
  // Signing out means leaving, and the place you leave to is the front page.
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  // The sign-out itself must never be cached either, or Back can replay the
  // page that was on screen before it.
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return response;
}

export async function GET(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  if (site !== "same-origin" && site !== "none") {
    return NextResponse.json({ error: "Same-origin navigation required" }, { status: 403 });
  }
  return clear(request);
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== serverEnv().appUrl) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  return clear(request);
}
