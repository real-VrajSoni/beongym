import Link from "next/link";
import { Building2, DollarSign, TrendingUp, UserRound, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getPlatformOverview, getPlatformRevenueSeries } from "@/lib/data/admin";
import { formatCurrencyCompact, formatDate, formatUsd, relativeTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Section } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { GymMark } from "@/components/admin/gym-mark";
import { GymStatusBadge, RoleBadge, TierBadge } from "@/components/admin/gym-badges";

export const metadata = { title: "Platform overview" };

export default async function AdminOverviewPage() {
  const session = await requireAdmin();
  const [overview, revenue] = await Promise.all([
    getPlatformOverview(),
    getPlatformRevenueSeries(6),
  ]);
  const { kpis } = overview;

  return (
    <>
      <div
        className="section-hero mb-5 rounded-[var(--radius-card)] border border-[var(--border)] px-5 py-6 sm:px-7 sm:py-7"
        style={
          {
            "--hero-a": "rgba(224,72,60,0.20)",
            "--hero-b": "rgba(143,128,255,0.16)",
          } as React.CSSProperties
        }
      >
        <PageHeader
          className="mb-0"
          title="Platform overview"
          description={`Every gym running on BeOnGym, ${session.name.split(" ")[0]}.`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Gyms"
          value={kpis.totalGyms}
          icon={Building2}
          accent
          hint={`${kpis.activeGyms} active · ${kpis.trialGyms} trial`}
        />
        <StatCard
          label="Platform MRR"
          value={formatUsd(kpis.platformMrr)}
          icon={DollarSign}
          hint="tier subscriptions"
        />
        {/* Gyms trade in their own money, so this is a list rather than a
            total. Adding rupees to dirhams produced a number with no unit. */}
        <StatCard
          label="GMV this month"
          value={
            kpis.gmv.length === 0
              ? formatCurrencyCompact(0, "USD")
              : kpis.gmv.map((g) => formatCurrencyCompact(g.amount, g.currency)).join(" · ")
          }
          icon={TrendingUp}
          hint={kpis.gmv.length > 1 ? `${kpis.gmv.length} currencies` : "collected by gyms"}
        />
        <StatCard label="Members" value={kpis.memberCount} icon={Users} hint="across all gyms" />
        <StatCard
          label="Signups not converted"
          value={kpis.prospectCount}
          icon={UserRound}
          hint={`${kpis.paidOrders} paid orders`}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Section
            title="Gyms"
            description="Everyone on the platform, newest first"
            href="/admin/gyms"
            bodyClassName="pb-1"
          >
            <ul className="divide-y divide-[var(--border)]">
              {overview.gyms.slice(0, 6).map((g) => (
                <li key={g.id} className="flex items-center gap-3.5 px-5 py-3.5">
                  <GymMark name={g.name} logoText={g.logoText} accentColor={g.accentColor} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/gyms/${g.id}`}
                      className="block truncate text-[13.5px] font-medium hover:underline"
                    >
                      {g.name}
                    </Link>
                    <p className="truncate text-[12px] text-muted-foreground">
                      <span className="font-mono">{g.code}</span>
                      {g.city ? ` · ${g.city}` : ""} · {g._count.members} members
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <TierBadge tier={g.tier} />
                    <GymStatusBadge status={g.status} />
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section
            title="Gross merchandise value"
            description="Membership payments collected across every gym"
            href="/admin/revenue"
            hrefLabel="Break down"
          >
            <div className="px-3 pt-4 pb-2">
              {/* One chart per currency: a single line adding them together
                  drew a shape the numbers could not support. */}
              {revenue.map((c) => (
                <div key={c.currency} className="mb-2">
                  {revenue.length > 1 ? (
                    <p className="px-1 pb-1 text-[11.5px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                      {c.currency}
                    </p>
                  ) : null}
                  <RevenueChart
                    currency={c.currency}
                    data={c.series.map((r) => ({
                      month: r.month.toISOString(),
                      revenue: r.revenue,
                    }))}
                  />
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Newest gyms" bodyClassName="pb-1">
            {overview.recentGyms.length === 0 ? (
              <EmptyState compact icon={Building2} title="No gyms yet" />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {overview.recentGyms.map((g) => (
                  <li key={g.id} className="px-5 py-3">
                    <Link
                      href={`/admin/gyms/${g.id}`}
                      className="block text-[13px] font-medium hover:underline"
                    >
                      {g.name}
                    </Link>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                      {g.city ? `${g.city} · ` : ""}
                      joined {formatDate(g.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Newest people" href="/admin/users" bodyClassName="pb-1">
            <ul className="divide-y divide-[var(--border)]">
              {overview.recentUsers.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{u.name}</p>
                    <p className="truncate text-[11.5px] text-muted-foreground">
                      {u.gym?.name ?? "—"} · {relativeTime(u.createdAt)}
                    </p>
                  </div>
                  <RoleBadge role={u.role} />
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
}
