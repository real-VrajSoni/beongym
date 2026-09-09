import { ShieldCheck, UserCheck, Users } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StaffView, type StaffRow } from "@/components/staff/staff-view";
import { relativeTime, withinLastDays } from "@/lib/format";

export const metadata = { title: "Team" };

export default async function StaffPage() {
  const session = await requireOwner();

  const [gym, staff] = await Promise.all([
    db.gym.findUniqueOrThrow({ where: { id: session.gymId }, select: { code: true } }),
    db.user.findMany({
      where: { gymId: session.gymId, role: { in: ["GYM_OWNER", "GYM_STAFF"] } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        trainerProfile: {
          select: {
            title: true,
            specialization: true,
            _count: { select: { plans: true, classes: true } },
          },
        },
      },
    }),
  ]);

  const rows: StaffRow[] = staff.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    role: s.role,
    title: s.trainerProfile?.title ?? null,
    specialization: s.trainerProfile?.specialization ?? null,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    lastSeenLabel: s.lastLoginAt ? relativeTime(s.lastLoginAt) : null,
    recentlyActive: withinLastDays(s.lastLoginAt, 7),
    isSelf: s.id === session.userId,
    plans: s.trainerProfile?._count.plans ?? 0,
    classes: s.trainerProfile?._count.classes ?? 0,
  }));

  return (
    <>
      <PageHeader
        title="Team"
        description="Who works at your gym, and what they're allowed to do."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard
          label="Active team"
          value={rows.filter((r) => r.isActive).length}
          icon={Users}
          accent
          hint="can sign in today"
        />
        <StatCard
          label="Owners"
          value={rows.filter((r) => r.role === "GYM_OWNER" && r.isActive).length}
          icon={ShieldCheck}
          hint="full control"
        />
        <StatCard
          label="Signed in this week"
          value={rows.filter((r) => r.recentlyActive).length}
          icon={UserCheck}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <StaffView rows={rows} gymCode={gym.code} />
    </>
  );
}
