import { NextResponse, type NextRequest } from "next/server";
import {
	SESSION_COOKIE,
	homeFor,
	portalFor,
	verifySession,
} from "@/lib/session";
import { hasAccess } from "@/lib/platform-plans";

/**
 * Next 16's `proxy` convention (formerly `middleware`).
 *
 * First line of defence only — every page and server action re-checks the
 * session and the tenant on the server. This keeps unauthenticated users off
 * the app shell and stops one role ever rendering another's chrome.
 */
/**
 * Screens only a gym OWNER may open. Enforced here as well as in the page and
 * every server action: the proxy runs before the response starts streaming, so
 * it is the only place that can produce a real redirect rather than a
 * not-authorised body with a 200 already on the wire.
 *
 * The role comes from the signed token. If an owner demotes someone mid-session
 * that token goes stale — sessionIsLive() compares it against the database on
 * the next request and rejects the mismatch.
 */
const OWNER_ONLY_PREFIXES = ["/gym/staff", "/gym/billing"];

/**
 * Everything behind the paywall.
 *
 * There is no free tier, so a gym whose access has run out reaches none of
 * this. Renewing and settings stay open — locking somebody out of the page
 * where they would pay you is a good way to not get paid.
 */
const PAID_PREFIXES = [
	"/gym/dashboard",
	"/gym/attendance",
	"/gym/clients",
	"/gym/plans",
	"/gym/subscriptions",
	"/gym/messages",
	"/gym/classes",
	"/gym/leads",
	"/gym/payments",
	"/gym/staff",
	"/gym/listing",
];

export default async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const token = request.cookies.get(SESSION_COOKIE)?.value;
	const session = token ? await verifySession(token) : null;

	if (!session) {
		const url = request.nextUrl.clone();

		// A checkout must always follow account creation. Keep a valid plan choice
		// while moving an anonymous buyer through signup; the server action still
		// independently requires a live PROSPECT session before it can create a
		// Dodo checkout session.
		if (pathname === "/start/checkout") {
			url.pathname = "/signup";
			const plan = request.nextUrl.searchParams
				.get("plan")
				?.toUpperCase();
			if (plan === "MONTHLY" || plan === "ANNUAL") {
				url.searchParams.set("plan", plan);
			} else {
				url.searchParams.delete("plan");
			}
			url.searchParams.delete("next");
			return privately(NextResponse.redirect(url));
		}

		url.pathname = "/signup";
		url.searchParams.delete("plan");
		url.searchParams.delete("next");
		return privately(NextResponse.redirect(url));
	}

	// Each role owns exactly one portal prefix.
	const allowed = portalFor(session.role);
	if (!pathname.startsWith(allowed)) {
		return privately(
			NextResponse.redirect(new URL(homeFor(session.role), request.url)),
		);
	}

	if (
		session.role === "GYM_STAFF" &&
		OWNER_ONLY_PREFIXES.some((p) => pathname.startsWith(p))
	) {
		return privately(
			NextResponse.redirect(
				new URL("/gym/dashboard?error=owner-only", request.url),
			),
		);
	}

	// The member app is part of what the gym buys. If the gym's window closes,
	// its members get one page explaining that rather than an app full of holes.
	if (
		session.role === "MEMBER" &&
		!hasAccess(session.gymTier ?? "PRO", session.gymAccessExpiresAt) &&
		pathname !== "/me/paused"
	) {
		return privately(
			NextResponse.redirect(new URL("/me/paused", request.url)),
		);
	}

	// The paywall. The expiry rides in the signed token and is compared against
	// the clock here, so a lapsed membership is turned away before the response
	// starts streaming rather than after a page has already rendered.
	if (
		session.gymId &&
		!hasAccess(session.gymTier ?? "PRO", session.gymAccessExpiresAt) &&
		PAID_PREFIXES.some((p) => pathname.startsWith(p))
	) {
		return privately(
			NextResponse.redirect(new URL("/gym/renew", request.url)),
		);
	}

	return privately(NextResponse.next());
}

/**
 * Every signed-in page is `no-store`.
 *
 * Without it the browser keeps the rendered page in its back/forward cache, so
 * pressing Back after signing out silently restores somebody's dashboard —
 * their data on screen, on a shared front-desk machine, after they have logged
 * out. `no-store` also keeps the page out of Chrome's bfcache entirely, which
 * is the only way to make Back re-ask the server (and get bounced to /login).
 */
function privately(response: NextResponse): NextResponse {
	response.headers.set(
		"Cache-Control",
		"no-store, no-cache, must-revalidate, max-age=0",
	);
	response.headers.set("Pragma", "no-cache");
	response.headers.set("Expires", "0");
	return response;
}

export const config = {
	matcher: ["/admin/:path*", "/gym/:path*", "/start/:path*", "/me/:path*"],
};
