import { AppShell } from "@/components/layout/app-shell";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasAccess } from "@/lib/platform-plans";
import { SessionGuard } from "@/components/layout/session-guard";

export default async function GymLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaff();

  const [gym, followUpsDue, queuedMessages, insideNow] = await Promise.all([
    db.gym.findUniqueOrThrow({
      where: { id: session.gymId },
      select: {
        name: true,
        code: true,
        logoText: true,
        imageUrl: true,
        accentColor: true,
        tier: true,
        accessExpiresAt: true,
      },
    }),
    // Enquiries owed a call today: the only nav badge worth interrupting for.
    db.lead.count({
      where: {
        gymId: session.gymId,
        status: { notIn: ["JOINED", "LOST"] },
        nextFollowUpAt: { lte: new Date() },
      },
    }),
    db.messageLog.count({ where: { gymId: session.gymId, status: "QUEUED" } }),
    db.attendance.count({
      where: { gymId: session.gymId, checkOutAt: null },
    }),
  ]);

  return (
    <>
      <SessionGuard />
      <AppShell
        portal="gym"
        isOwner={session.role === "GYM_OWNER"}
        hasAccess={hasAccess(gym.tier, gym.accessExpiresAt)}
        user={{
          name: session.name,
          email: session.email,
          roleLabel: session.role === "GYM_OWNER" ? "Owner" : "Staff",
        }}
        brand={{
          name: gym.name,
          subtitle: gym.code,
          mark: gym.logoText ?? gym.name.slice(0, 2).toUpperCase(),
          imageUrl: gym.imageUrl,
          accentColor: gym.accentColor,
        }}
        badges={{ followUpsDue, queuedMessages, insideNow }}
      >
        {children}
      </AppShell>
    </>
  );
}
