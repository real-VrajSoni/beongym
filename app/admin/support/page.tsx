import Link from "next/link";
import { AlertTriangle, Ban, Building2, Timer, TrendingDown } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { requireAdmin } from "@/lib/auth";
import { getGymTable } from "@/lib/data/admin";
import { formatCurrency, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { GymMark } from "@/components/admin/gym-mark";
import { GymStatusBadge } from "@/components/admin/gym-badges";

export const metadata = { title: "Support" };

/**
 * The accounts that need a human today: trials about to lapse, gyms with no
 * members yet, and anything suspended.
 */
export default async function AdminSupportPage() {
  await requireAdmin();
  const gyms = await getGymTable();

  const trialsEnding = gyms
    .filter((g) => g.status === "TRIAL" && g.trialEndsAt)
    .map((g) => ({ ...g, daysLeft: differenceInCalendarDays(g.trialEndsAt!, new Date()) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const empty = gyms.filter((g) => g.members === 0 && g.status !== "CANCELLED");
  const suspended = gyms.filter((g) => g.status === "SUSPENDED" || g.status === "CANCELLED");
  const noRevenue = gyms.filter(
    (g) => g.collected === 0 && g.members > 0 && g.status === "ACTIVE",
  );

  const lists = [
    {
      key: "trials",
      title: "Trials ending",
      description: "Reach out before the trial lapses",
      icon: Timer,
      rows: trialsEnding,
      meta: (g: (typeof trialsEnding)[number]) =>
        g.daysLeft >= 0
          ? `${g.daysLeft} day${g.daysLeft === 1 ? "" : "s"} left · ends ${formatDate(g.trialEndsAt!)}`
          : `expired ${Math.abs(g.daysLeft)} days ago`,
    },
    {
      key: "empty",
      title: "No members yet",
      description: "Signed up but never onboarded anyone",
      icon: AlertTriangle,
      rows: empty,
      meta: (g: (typeof empty)[number]) => `joined ${formatDate(g.createdAt)} · ${g.plans} plans`,
    },
    {
      key: "norevenue",
      title: "No payments recorded",
      description: "Active with members but nothing collected",
      icon: TrendingDown,
      rows: noRevenue,
      meta: (g: (typeof noRevenue)[number]) => `${g.members} members · ${formatCurrency(0)} collected`,
    },
    {
      key: "suspended",
      title: "Suspended or cancelled",
      description: "Locked out of the platform",
      icon: Ban,
      rows: suspended,
      meta: (g: (typeof suspended)[number]) => `${g.members} members · ${formatCurrency(g.collected)} collected`,
    },
  ];

  return (
    <>
      <PageHeader
        title="Support"
        description="Accounts that need attention today."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {lists.map((list) => (
          <Section
            key={list.key}
            title={list.title}
            description={list.description}
            bodyClassName="pb-1"
          >
            {list.rows.length === 0 ? (
              <EmptyState
                compact
                icon={list.icon}
                title="Nothing here"
                description="No gyms match this signal right now."
              />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {list.rows.map((g) => (
                  <li key={g.id} className="flex items-center gap-3.5 px-5 py-3.5">
                    <GymMark
                      name={g.name}
                      logoText={g.logoText}
                      accentColor={g.accentColor}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/gyms/${g.id}`}
                        className="block truncate text-[13.5px] font-medium hover:underline"
                      >
                        {g.name}
                      </Link>
                      <p className="truncate text-[12px] text-muted-foreground">{list.meta(g as never)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <GymStatusBadge status={g.status} />
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/admin/gyms/${g.id}`}>Open</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        ))}
      </div>

      <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
        <p className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
          <Building2 className="mt-0.5 size-3.5 shrink-0" />
          These lists are computed from live data — there is no separate ticketing system in this
          release. Opening a gym gives you its full detail, people and lifecycle controls.
        </p>
      </div>
    </>
  );
}
