import "server-only";
import { db } from "./db";
import { isStaff, type SessionUser } from "./session";

/** Resolve authorization from live account, profile and tenant rows, never cookie entitlements. */
export async function resolveLiveSession(session: SessionUser): Promise<SessionUser | null> {
  const user = await db.user.findFirst({
    where: { id: session.userId, isActive: true },
    select: { role: true, gymId: true, sessionVersion: true, name: true, email: true },
  });
  if (!user || user.role !== session.role || user.gymId !== session.gymId ||
    user.sessionVersion !== (session.sessionVersion ?? 0)) return null;

  const current = { ...session, name: user.name, email: user.email, sessionVersion: user.sessionVersion };
  if (user.role === "SUPER_ADMIN" || user.role === "PROSPECT") {
    if (user.gymId !== null || session.profileId !== null) return null;
    return { ...current, gymName: null, gymCode: null, gymTier: null, gymAccessExpiresAt: null };
  }
  if (!session.gymId || !session.profileId) return null;
  const gym = await db.gym.findFirst({
    where: { id: session.gymId, status: { notIn: ["SUSPENDED", "CANCELLED"] } },
    select: { name: true, code: true, tier: true, accessExpiresAt: true },
  });
  if (!gym) return null;
  const where = { id: session.profileId, userId: session.userId, gymId: session.gymId };
  const profile = user.role === "MEMBER"
    ? await db.clientProfile.findFirst({ where, select: { id: true } })
    : isStaff(user.role) ? await db.trainerProfile.findFirst({ where, select: { id: true } }) : null;
  if (!profile) return null;
  return { ...current, gymName: gym.name, gymCode: gym.code, gymTier: gym.tier,
    gymAccessExpiresAt: gym.accessExpiresAt?.toISOString() ?? null };
}
