import { DollarSign, Layers, TrendingUp } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getGymTable, getPlatformRevenueSeries, TIER_PRICE } from "@/lib/data/admin";
import { formatCurrency, formatUsd } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { StatCard } from "@/components/ui/stat-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { GymMark } from "@/components/admin/gym-mark";
import { TierBadge } from "@/components/admin/gym-badges";

export const metadata = { title: "Revenue" };

export default async function AdminRevenuePage() {
  await requireAdmin();
  const [gyms, series] = await Promise.all([getGymTable(), getPlatformRevenueSeries(6)]);

  const live = gyms.filter((g) => g.status === "ACTIVE" || g.status === "TRIAL");
  // Per-gym MRR already accounts for lifetime buyers paying nothing recurring.
  const mrr = live.reduce((a, g) => a + g.mrr, 0);
  const gmvTotal = gyms.reduce((a, g) => a + g.collected, 0);
  const byRevenue = [...gyms].sort((a, b) => b.collected - a.collected);

  const tierRows = (["PRO", "ELITE"] as const).map((tier) => {
    const inTier = live.filter((g) => g.tier === tier);
    return {
      tier,
      count: inTier.length,
      mrr: inTier.reduce((a, g) => a + g.mrr, 0),
    };
  });

  return (
    <>
      <PageHeader
        title="Revenue"
        description="What the platform earns, and what flows through it."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Platform MRR"
          value={formatUsd(mrr)}
          icon={DollarSign}
          accent
          hint="from tier subscriptions"
        />
        <StatCard
          label="Annual run rate"
          value={formatUsd(mrr * 12)}
          icon={TrendingUp}
          hint="MRR × 12"
        />
        <StatCard
          label="GMV all time"
          value={formatCurrency(gmvTotal)}
          icon={Layers}
          hint="collected by gyms"
        />
        <StatCard
          label="Paying gyms"
          value={live.filter((g) => g.mrr > 0).length}
          hint={`of ${live.length} live`}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Section
          title="GMV by month"
          description="Membership payments collected across every gym"
          className="lg:col-span-2"
        >
          <div className="px-3 pt-4 pb-2">
            <RevenueChart
              data={series.map((r) => ({ month: r.month.toISOString(), revenue: r.revenue }))}
            />
          </div>
        </Section>

        <Section title="MRR by tier" bodyClassName="pb-1">
          <ul className="divide-y divide-[var(--border)]">
            {tierRows.map((t) => (
              <li key={t.tier} className="flex items-center gap-3 px-5 py-3.5">
                <TierBadge tier={t.tier} />
                <span className="tabular flex-1 text-[12.5px] text-muted-foreground">
                  {t.count} gym{t.count === 1 ? "" : "s"} · {formatUsd(TIER_PRICE[t.tier])}/mo
                </span>
                <span className="tabular text-[13px] font-medium">{formatUsd(t.mrr)}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="mt-5">
        <Section title="Gyms by volume" description="Ranked by payments collected">
          <ul className="divide-y divide-[var(--border)]">
            {byRevenue.map((g, i) => (
              <li key={g.id} className="flex items-center gap-3.5 px-5 py-3.5">
                <span className="tabular w-5 shrink-0 text-[12px] text-[var(--subtle-foreground)]">
                  {i + 1}
                </span>
                <GymMark
                  name={g.name}
                  logoText={g.logoText}
                  accentColor={g.accentColor}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium">{g.name}</p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {g.members} members · {g.activeSubscriptions} live subscriptions
                  </p>
                </div>
                <div className="tabular shrink-0 text-right">
                  <p className="text-[13px] font-medium">{formatCurrency(g.collected)}</p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {g.mrr > 0 ? `${formatUsd(g.mrr)}/mo to BeOnGym` : "not billing"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}
