import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, CreditCard, Package, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getGymDetail } from "@/lib/data/admin";
import { formatCurrency, formatDate, relativeTime } from "@/lib/format";
import { Section } from "@/components/ui/section";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { GymMark } from "@/components/admin/gym-mark";
import { GymStatusBadge, RoleBadge, TierBadge } from "@/components/admin/gym-badges";
import { GymControls } from "@/components/admin/gym-controls";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const gym = await getGymDetail(id);
  if (!gym) notFound();
  return { title: gym.name };
}

export default async function AdminGymDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const gym = await getGymDetail(id);
  if (!gym) notFound();

  const owner = gym.users.find((u) => u.role === "GYM_OWNER");

  return (
    <>
      <header className="mb-6">
        <Link
          href="/admin/gyms"
          className="mb-4 inline-block text-[12.5px] text-muted-foreground hover:text-foreground"
        >
          ← All gyms
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <GymMark
              name={gym.name}
              logoText={gym.logoText}
              accentColor={gym.accentColor}
              size="lg"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[22px] leading-tight font-semibold sm:text-[26px]">
                  {gym.name}
                </h1>
                <GymStatusBadge status={gym.status} />
                <TierBadge tier={gym.tier} />
              </div>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                <span className="font-mono">{gym.code}</span>
                {gym.city ? ` · ${gym.city}` : ""} · joined {formatDate(gym.createdAt)}
              </p>
              {gym.tagline ? (
                <p className="mt-2 text-[13px] text-muted-foreground italic">{gym.tagline}</p>
              ) : null}
              {owner ? (
                <p className="mt-2 text-[13px] text-muted-foreground">
                  Owner: <span className="font-medium text-foreground">{owner.name}</span>
                  {owner.email ? ` · ${owner.email}` : ""}
                </p>
              ) : null}
            </div>
          </div>

          <GymControls gymId={gym.id} name={gym.name} status={gym.status} tier={gym.tier} />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Members" value={gym._count.members} icon={Users} accent />
        <StatCard label="Staff" value={gym._count.staff} icon={Users} />
        <StatCard
          label="Collected"
          value={formatCurrency(gym.collected)}
          icon={CreditCard}
          hint={`${gym.activeSubscriptions} live subscriptions`}
        />
        <StatCard
          label="Gym visits"
          value={gym._count.attendance.toLocaleString("en-IN")}
          icon={Activity}
          hint="all time"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Section title="People" description={`${gym.users.length} accounts`} bodyClassName="pb-1">
          <ul className="max-h-[26rem] divide-y divide-[var(--border)] overflow-y-auto">
            {gym.users.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{u.name}</p>
                  <p className="truncate text-[11.5px] text-muted-foreground">
                    {u.email ?? "no email"} ·{" "}
                    {u.lastLoginAt ? `seen ${relativeTime(u.lastLoginAt)}` : "never signed in"}
                  </p>
                </div>
                <RoleBadge role={u.role} />
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Plans" description={`${gym.plans.length} on sale`} bodyClassName="pb-1">
          {gym.plans.length === 0 ? (
            <EmptyState compact icon={Package} title="No plans yet" />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {gym.plans.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{p.name}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {p._count.subscriptions} subscription
                      {p._count.subscriptions === 1 ? "" : "s"}
                      {p.isActive ? "" : " · archived"}
                    </p>
                  </div>
                  <span className="tabular shrink-0 text-[13px] font-medium">
                    {formatCurrency(p.price)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
