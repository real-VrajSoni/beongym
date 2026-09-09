import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "apex_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * A MEMBER is still, first and foremost, a row their gym manages. The member
 * app they can sign into is read-mostly on purpose: it shows them what they
 * have, what they owe and how they are doing, and it never asks the front desk
 * to answer anything.
 */
export type Role = "SUPER_ADMIN" | "GYM_OWNER" | "GYM_STAFF" | "MEMBER" | "PROSPECT";

export type SessionUser = {
  userId: string;
  email: string | null;
  name: string;
  role: Role;
  /** TrainerProfile.id or ClientProfile.id depending on role. Null for admins. */
  profileId: string | null;
  /** The tenant this session is bound to. Null for SUPER_ADMIN. */
  gymId: string | null;
  gymName: string | null;
  gymCode: string | null;
  gymTier: string | null;
  /**
   * When this gym's paid access runs out, as an ISO string.
   *
   * Carried in the token so `proxy.ts` can turn an expired gym away before the
   * response starts streaming, without a database round trip on every request.
   * A stale token cannot buy extra time — the date is compared against the
   * clock, not trusted as a flag — and `sessionIsLive()` re-reads it from the
   * database so a renewal or an admin change lands on the next request.
   */
  gymAccessExpiresAt: string | null;
};

/** Edge-safe: used by proxy.ts as well as the Node server runtime. */
export function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a string of at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.userId || !payload.role) return null;
    return {
      userId: String(payload.userId),
      email: payload.email ? String(payload.email) : null,
      name: String(payload.name),
      role: payload.role as Role,
      profileId: payload.profileId ? String(payload.profileId) : null,
      gymId: payload.gymId ? String(payload.gymId) : null,
      gymName: payload.gymName ? String(payload.gymName) : null,
      gymCode: payload.gymCode ? String(payload.gymCode) : null,
      gymTier: payload.gymTier ? String(payload.gymTier) : null,
      gymAccessExpiresAt: payload.gymAccessExpiresAt
        ? String(payload.gymAccessExpiresAt)
        : null,
    };
  } catch {
    return null;
  }
}

export const STAFF_ROLES: Role[] = ["GYM_OWNER", "GYM_STAFF"];

export function isStaff(role: Role): boolean {
  return role === "GYM_OWNER" || role === "GYM_STAFF";
}

/** Where a role lands after signing in. */
export function homeFor(role: Role): string {
  if (role === "SUPER_ADMIN") return "/admin/overview";
  // A prospect has an account but no gym yet — send them to pick a plan.
  if (role === "PROSPECT") return "/start/plans";
  if (role === "MEMBER") return "/me";
  return "/gym/dashboard";
}

/**
 * The portal prefix a role is allowed to use.
 *
 * One prefix each, checked in the proxy before anything renders. A member token
 * reaches `/me` and nothing else — never the workspace it belongs to.
 */
export function portalFor(role: Role): "/admin" | "/gym" | "/start" | "/me" {
  if (role === "SUPER_ADMIN") return "/admin";
  if (role === "PROSPECT") return "/start";
  if (role === "MEMBER") return "/me";
  return "/gym";
}
