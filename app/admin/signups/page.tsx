import Link from "next/link";
import { CheckCircle2, TrendingUp, UserPlus, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime, relativeTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ClientAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Signups" };

/**
 * The acquisition funnel: who registered, who bought, and who is stuck in
 * between. The stuck ones are the list worth working.
 */
export default async function AdminSignupsPage() {
  await requireAdmin();

  const signups = await db.user.findMany({
    where: { role: { in: ["PROSPECT", "GYM_OWNER"] } },
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
      orders: {
        orderBy: { createdAt: "desc" },
        select: { id: true, tier: true, status: true, createdAt: true },
      },
    },
  });

  const converted = signups.filter((s) => s.role === "GYM_OWNER");
  const stuck = signups.filter((s) => s.role === "PROSPECT");
  const rate = signups.length > 0 ? Math.round((converted.length / signups.length) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Signups"
        description="Everyone who registered to run a gym, and whether they went on to buy."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total signups" value={signups.length} icon={UserPlus} accent />
        <StatCard label="Converted" value={converted.length} icon={CheckCircle2} hint="bought a plan" />
        <StatCard label="Not yet bought" value={stuck.length} icon={Users} hint="worth a nudge" />
        <StatCard label="Conversion" value={`${rate}%`} icon={TrendingUp} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section
          title="Signed up, no plan yet"
          description="Registered but never completed checkout"
          bodyClassName="pb-1"
        >
          {stuck.length === 0 ? (
            <EmptyState
              compact
              icon={CheckCircle2}
              title="Everyone converted"
              description="No account is sitting without a plan."
            />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {stuck.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                  <ClientAvatar name={s.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{s.name}</p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {s.email} · {s.phone ?? "no phone"}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-[var(--subtle-foreground)]">
                      Signed up {relativeTime(s.createdAt)}
                      {s.orders.length > 0
                        ? ` · started checkout for ${s.orders[0].tier.toLowerCase()}`
                        : " · never started checkout"}
                    </p>
                  </div>
                  <Badge tone="warning">Prospect</Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Converted to gyms"
          description={`${converted.length} owners running on the platform`}
          bodyClassName="pb-1"
        >
          {converted.length === 0 ? (
            <EmptyState compact icon={UserPlus} title="No conversions yet" />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {converted.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                  <ClientAvatar name={s.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{s.name}</p>
                    {s.gym ? (
                      <Link
                        href={`/admin/gyms/${s.gym.id}`}
                        className="block truncate text-[12px] text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {s.gym.name}{" "}
                        <span className="font-mono text-[11px]">{s.gym.code}</span>
                      </Link>
                    ) : null}
                    <p className="mt-0.5 text-[11.5px] text-[var(--subtle-foreground)]">
                      Joined {formatDateTime(s.createdAt)}
                    </p>
                  </div>
                  <Badge tone="success" dot>
                    Owner
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
