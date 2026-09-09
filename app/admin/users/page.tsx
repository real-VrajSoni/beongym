import { Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { relativeTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { UsersTable, type PlatformUserRow } from "@/components/admin/users-table";

export const metadata = { title: "People" };

export default async function AdminUsersPage() {
  await requireAdmin();

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
      gym: { select: { id: true, name: true, code: true } },
      clientProfile: { select: { memberCode: true } },
    },
  });

  const rows: PlatformUserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    memberCode: u.clientProfile?.memberCode ?? null,
    gymId: u.gym?.id ?? null,
    gymName: u.gym?.name ?? null,
    gymCode: u.gym?.code ?? null,
    createdAt: u.createdAt.toISOString(),
    lastSeenLabel: u.lastLoginAt ? relativeTime(u.lastLoginAt) : null,
  }));

  const count = (role: string) => rows.filter((r) => r.role === role).length;

  return (
    <>
      <PageHeader
        title="People"
        description="Every account on the platform, across every gym."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="All accounts" value={rows.length} icon={Users} accent />
        <StatCard label="Members" value={count("MEMBER")} />
        <StatCard label="Gym owners" value={count("GYM_OWNER")} />
        <StatCard label="Staff" value={count("GYM_STAFF")} />
      </div>

      <UsersTable rows={rows} />
    </>
  );
}
