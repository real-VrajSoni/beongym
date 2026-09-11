import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { validNewPassword } from "./security";
import { hasAccess } from "./platform-plans";
import {
	SESSION_COOKIE,
	SESSION_MAX_AGE,
	isStaff,
	signSession,
	verifySession,
	type Role,
	type SessionUser,
} from "./session";

export { homeFor, portalFor, isStaff } from "./session";
export type { SessionUser, Role } from "./session";

/** Cost 12 — deliberate, this is the only place passwords are hashed. */
export async function hashPassword(password: string): Promise<string> {
	if (!validNewPassword(password)) throw new Error("Password must be 8 characters or more and at most 72 UTF-8 bytes");
	return bcrypt.hash(password, 12);
}

export async function createSession(user: SessionUser): Promise<void> {
	const account = await db.user.findFirst({ where: { id: user.userId, isActive: true }, select: { sessionVersion: true } });
	if (!account || (user.sessionVersion !== undefined && user.sessionVersion !== account.sessionVersion)) throw new Error("Session no longer valid");
	const token = await signSession({ ...user, sessionVersion: account.sessionVersion });
	const store = await cookies();
	store.set(SESSION_COOKIE, token, {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: SESSION_MAX_AGE,
	});
}

export async function destroySession(): Promise<void> {
	const session = await getSession();
	if (session) await db.user.updateMany({ where: { id: session.userId, sessionVersion: session.sessionVersion ?? 0 }, data: { sessionVersion: { increment: 1 } } });
	const store = await cookies();
	store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
	const store = await cookies();
	const token = store.get(SESSION_COOKIE)?.value;
	if (!token) return null;
	return verifySession(token);
}

/** Shape a database user into the session payload. */
type UserWithProfiles = {
	id: string;
	sessionVersion: number;
	name: string;
	email: string | null;
	role: string;
	gymId: string | null;
	trainerProfile: { id: string } | null;
	clientProfile: { id: string } | null;
	gym: {
		id: string;
		name: string;
		code: string;
		status: string;
		tier: string;
		accessExpiresAt: Date | null;
	} | null;
};

function toSession(user: UserWithProfiles): SessionUser {
	return {
		userId: user.id,
		sessionVersion: user.sessionVersion,
		email: user.email,
		name: user.name,
		role: user.role as Role,
		profileId: user.trainerProfile?.id ?? user.clientProfile?.id ?? null,
		gymId: user.gymId,
		gymName: user.gym?.name ?? null,
		gymCode: user.gym?.code ?? null,
		gymTier: user.gym?.tier ?? null,
		gymAccessExpiresAt: user.gym?.accessExpiresAt?.toISOString() ?? null,
	};
}

const USER_INCLUDE = {
	trainerProfile: { select: { id: true } },
	clientProfile: { select: { id: true } },
	gym: {
		select: {
			id: true,
			name: true,
			code: true,
			status: true,
			tier: true,
			accessExpiresAt: true,
		},
	},
} as const;

/** Same work whether or not the account exists, so timing can't enumerate users. */
const DUMMY_HASH =
	"$2a$12$C6UzMDM.H6dfI/f/IKcEe.n9Q0Ktm0hVvS0kkQKGnG0KcQ2n5nZ2u";

export type AuthFailure =
	| "INVALID"
	| "GYM_SUSPENDED"
	| "GYM_NOT_FOUND"
	| "DEACTIVATED"
	| "GYM_LAPSED";

/**
 * Staff sign-in: platform admins, gym owners and gym staff use an email.
 * Returns a discriminated result so the UI can explain a suspended gym
 * without leaking whether an email exists.
 */
export async function authenticateStaff(
	email: string,
	password: string,
): Promise<
	{ ok: true; user: SessionUser } | { ok: false; reason: AuthFailure }
> {
	const user = await db.user.findUnique({
		where: { email: email.toLowerCase().trim() },
		include: USER_INCLUDE,
	});

	// Members sign in with a gym code and member code, not an email — a member
	// row reaching this form is either a mistake or somebody guessing.
	if (!user || user.role === "MEMBER") {
		await bcrypt.compare(password, DUMMY_HASH);
		return { ok: false, reason: "INVALID" };
	}
	if (!(await bcrypt.compare(password, user.passwordHash))) {
		return { ok: false, reason: "INVALID" };
	}
	// Checked after the password so a wrong password never reveals that an
	// account exists but has been switched off.
	if (!user.isActive) {
		return { ok: false, reason: "DEACTIVATED" };
	}
	if (
		user.gym &&
		(user.gym.status === "SUSPENDED" || user.gym.status === "CANCELLED")
	) {
		return { ok: false, reason: "GYM_SUSPENDED" };
	}

	await db.user.update({
		where: { id: user.id },
		data: { lastLoginAt: new Date() },
	});
	return { ok: true, user: toSession(user) };
}

/**
 * Member sign-in: gym code + the member code the gym issued + password.
 *
 * The gym code scopes the lookup, so member codes only need to be unique inside
 * a gym — which is what makes "M-0042" a usable credential. A member never
 * types an email here: plenty of them never gave the gym one.
 *
 * The member app is part of what the gym pays for, so a gym whose access window
 * has closed cannot sign its members in either. That is deliberate, and the
 * screen says so rather than blaming the member.
 */
export async function authenticateMember(
	gymCode: string,
	memberCode: string,
	password: string,
): Promise<
	{ ok: true; user: SessionUser } | { ok: false; reason: AuthFailure }
> {
	const gym = await db.gym.findUnique({
		where: { code: gymCode.toUpperCase().trim() },
		select: { id: true, status: true, tier: true, accessExpiresAt: true },
	});
	if (!gym) {
		await bcrypt.compare(password, DUMMY_HASH);
		return { ok: false, reason: "GYM_NOT_FOUND" };
	}

	const profile = await db.clientProfile.findFirst({
		where: { gymId: gym.id, memberCode: memberCode.toUpperCase().trim() },
		select: {
			user: { select: { id: true, passwordHash: true, isActive: true } },
		},
	});
	if (!profile) {
		await bcrypt.compare(password, DUMMY_HASH);
		return { ok: false, reason: "INVALID" };
	}
	if (!(await bcrypt.compare(password, profile.user.passwordHash))) {
		return { ok: false, reason: "INVALID" };
	}
	// Checked after the password, so a wrong password never reveals that a member
	// code exists but has been switched off.
	if (!profile.user.isActive) return { ok: false, reason: "DEACTIVATED" };
	if (gym.status === "SUSPENDED" || gym.status === "CANCELLED") {
		return { ok: false, reason: "GYM_SUSPENDED" };
	}
	if (!hasAccess(gym.tier, gym.accessExpiresAt)) {
		return { ok: false, reason: "GYM_LAPSED" };
	}

	const user = await db.user.findUniqueOrThrow({
		where: { id: profile.user.id },
		include: USER_INCLUDE,
	});
	await db.user.update({
		where: { id: user.id },
		data: { lastLoginAt: new Date() },
	});
	return { ok: true, user: toSession(user) };
}

/** True when the profile and gym the token points at are still live. */
async function sessionIsLive(session: SessionUser): Promise<boolean> {
	// A deactivated account loses access on its very next request.
	const account = await db.user.findFirst({
		where: { id: session.userId, isActive: true },
		select: { id: true, role: true, sessionVersion: true },
	});
	if (!account || account.role !== session.role || account.sessionVersion !== (session.sessionVersion ?? 0)) return false;

	if (session.role === "SUPER_ADMIN") return true;
	// A prospect has no gym or profile yet — the account alone is enough.
	if (session.role === "PROSPECT") return true;

	if (!session.profileId || !session.gymId) return false;

	const gym = await db.gym.findFirst({
		where: {
			id: session.gymId,
			status: { notIn: ["SUSPENDED", "CANCELLED"] },
		},
		select: { id: true, tier: true, accessExpiresAt: true },
	});
	if (!gym) return false;
	// The tier and the access window are both read from the token by the proxy.
	// If either changes — an upgrade, a renewal, an admin edit — the token is
	// stale, so the session is rejected rather than left holding access it no
	// longer has. The owner is re-issued a session on their next sign-in.
	if (session.gymTier !== null && session.gymTier !== gym.tier) return false;
	const expiry = gym.accessExpiresAt?.toISOString() ?? null;
	if (session.gymAccessExpiresAt !== expiry) return false;

	// A member's session is only as live as their gym's membership of ours: the
	// member app is part of what the gym pays for, and the proxy sends a lapsed
	// gym's members to a screen that explains that rather than to a blank app.
	if (session.role === "MEMBER") {
		const profile = await db.clientProfile.findFirst({
			where: { id: session.profileId, gymId: session.gymId },
			select: { id: true },
		});
		return profile !== null;
	}

	const found = await db.trainerProfile.findUnique({
		where: { id: session.profileId },
		select: { id: true },
	});
	return found !== null;
}

/**
 * A session backed by live rows. Used on entry points that would otherwise
 * bounce a stale cookie between /login and the app forever.
 */
export async function getValidSession(): Promise<SessionUser | null> {
	const session = await getSession();
	if (!session) return null;
	return (await sessionIsLive(session)) ? session : null;
}

export type MemberSession = SessionUser & {
	profileId: string;
	gymId: string;
	role: "MEMBER";
};

/** Gate for /me — a member of one gym, looking at their own record. */
export async function requireMember(): Promise<MemberSession> {
	const session = await getSession();
	if (!session) redirect("/login?next=/me");
	if (session.role !== "MEMBER") redirect(homeOf(session.role));
	if (!(await sessionIsLive(session))) redirect("/login?error=stale-session");
	if (!session.profileId || !session.gymId)
		redirect("/login?error=missing-profile");
	return session as MemberSession;
}

export type AdminSession = SessionUser & { role: "SUPER_ADMIN" };
export type StaffSession = SessionUser & { profileId: string; gymId: string };
export type ProspectSession = SessionUser & { email: string };

/** Gate for /start — someone with an account but no gym yet. */
export async function requireProspect(): Promise<ProspectSession> {
	const session = await getSession();
	// `/start` is the post-signup setup funnel. Keep unauthenticated visitors in
	// that funnel instead of presenting payment setup before an account exists.
	if (!session) redirect("/signup");
	if (session.role !== "PROSPECT") redirect(homeOf(session.role));
	if (!(await sessionIsLive(session))) redirect("/login?error=stale-session");
	return session as ProspectSession;
}

/** Gate for /admin — the platform operator only. */
export async function requireAdmin(): Promise<AdminSession> {
	const session = await getSession();
	if (!session) redirect("/login");
	if (session.role !== "SUPER_ADMIN") redirect(homeOf(session.role));
	if (!(await sessionIsLive(session))) redirect("/login?error=stale-session");
	return session as AdminSession;
}

/** Gate for /gym — gym owners and staff, scoped to their own tenant. */
export async function requireStaff(): Promise<StaffSession> {
	const session = await getSession();
	if (!session) redirect("/login");
	if (!isStaff(session.role)) redirect(homeOf(session.role));
	if (!session.profileId || !session.gymId)
		redirect("/login?error=missing-profile");
	if (!(await sessionIsLive(session))) redirect("/login?error=stale-session");
	return session as StaffSession;
}

/** Gate for /gym routes that only the owner may use (billing, branding, staff). */
export async function requireOwner(): Promise<StaffSession> {
	const session = await requireStaff();
	if (session.role !== "GYM_OWNER")
		redirect("/gym/dashboard?error=owner-only");
	return session;
}

/**
 * Gate for the operational workspace: signed in, staff, and paid up.
 *
 * `proxy.ts` already turns a lapsed gym away from these screens, but a proxy
 * routes *pages* and a server action is a POST to whatever route the browser
 * happens to be on. `/gym/settings`, `/gym/renew` and `/gym/billing` stay open
 * on purpose — locking somebody out of the page where they would pay you is a
 * good way to not get paid — and an action id is the same wherever it is called
 * from. So a lapsed gym that posts a members-or-money action at the settings
 * page clears the proxy entirely. Anything that runs the gym asks this instead.
 *
 * The window is re-read from the database rather than taken from the token,
 * because the token is held by the person we are checking.
 */
export async function requirePaidStaff(): Promise<StaffSession> {
	const session = await requireStaff();
	const gym = await db.gym.findUnique({
		where: { id: session.gymId },
		select: { tier: true, accessExpiresAt: true },
	});
	if (!gym || !hasAccess(gym.tier, gym.accessExpiresAt))
		redirect("/gym/renew");
	return session;
}

/** The same window, for the owner-only half of the workspace. */
export async function requirePaidOwner(): Promise<StaffSession> {
	const session = await requirePaidStaff();
	if (session.role !== "GYM_OWNER")
		redirect("/gym/dashboard?error=owner-only");
	return session;
}

/**
 * Gate for member actions that the gym's subscription pays for.
 *
 * Same reasoning as `requirePaidStaff`: `/me/paused` renders for a lapsed gym's
 * members, so booking and check-in are reachable from it unless the action says
 * no itself.
 */
export async function requirePaidMember(): Promise<MemberSession> {
	const session = await requireMember();
	const gym = await db.gym.findUnique({
		where: { id: session.gymId },
		select: { tier: true, accessExpiresAt: true },
	});
	if (!gym || !hasAccess(gym.tier, gym.accessExpiresAt))
		redirect("/me/paused");
	return session;
}

function homeOf(role: Role): string {
	if (role === "SUPER_ADMIN") return "/admin/overview";
	if (role === "PROSPECT") return "/start/plans";
	if (role === "MEMBER") return "/me";
	return "/gym/dashboard";
}
