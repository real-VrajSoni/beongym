import Link from "next/link";
import {
  CalendarRange,
  Filter,
  Package,
  Plus,
  TrendingUp,
  Users,
  DoorOpen,
  Inbox,
  Sparkles,
} from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getDashboard, getFollowUpQueue, getRevenueSeries } from "@/lib/data/gym";
import { getAttendance } from "@/lib/data/attendance";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Section } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { CountBarChart } from "@/components/charts/bar-chart";
import { TodayClasses } from "@/components/dashboard/today-classes";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { FollowUpPreview, type FollowUpRow } from "@/components/dashboard/follow-up-preview";
import { greetingFor } from "@/components/dashboard/greeting";

export const metadata = { title: "Dashboard" };

export default async function TrainerDashboardPage() {
  const session = await requireStaff();
  // Revenue is the owner's business, not the front desk's. Staff get floor
  // numbers in its place.
  const isOwner = session.role === "GYM_OWNER";
  const [dashboard, revenue, queue, attendance] = await Promise.all([
    getDashboard(session.gymId, isOwner),
    isOwner ? getRevenueSeries(session.gymId, 6) : Promise.resolve([]),
    getFollowUpQueue(session.gymId),
    getAttendance(session.gymId),
  ]);
  const footfall = attendance.daily.slice(-14);

  const kpis = { ...dashboard.kpis, insideNow: attendance.insideNow.length };
  const firstName = session.name.split(" ")[0];

  const queueRows: FollowUpRow[] = queue.map((row) => ({
    ...row,
    dueOn: row.dueOn.toISOString(),
  }));

  return (
    <>
      <div
        className="section-hero mb-5 rounded-[var(--radius-card)] border border-[var(--border)] px-5 py-6 sm:px-7 sm:py-7"
        style={
          {
            "--hero-a": "rgba(143,128,255,0.20)",
            "--hero-b": "rgba(47,198,191,0.12)",
          } as React.CSSProperties
        }
      >
      <PageHeader
        className="mb-0"
        title={`${greetingFor()}, ${firstName}`}
        description="Here's what's happening at your gym today."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/gym/classes">
                <CalendarRange />
                <span className="hidden sm:inline">Timetable</span>
                <span className="sm:hidden">Classes</span>
              </Link>
            </Button>
            <Button asChild>
              <Link href="/gym/clients">
                <Plus />
                <span className="hidden sm:inline">Add member</span>
                <span className="sm:hidden">Member</span>
              </Link>
            </Button>
          </>
        }
      />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Active members"
          value={kpis.activeClients}
          icon={Users}
          accent
          hint="on a live membership"
        />
        {isOwner ? (
          <StatCard
            label="Revenue this month"
            value={formatCurrencyCompact(kpis.monthRevenue ?? 0)}
            icon={TrendingUp}
            delta={kpis.revenueDeltaPct !== null ? { value: kpis.revenueDeltaPct } : null}
            hint={
              kpis.revenueDeltaPct === null ? formatCurrency(kpis.monthRevenue ?? 0) : "vs last month"
            }
          />
        ) : (
          <StatCard
            label="On the floor now"
            value={kpis.insideNow}
            icon={DoorOpen}
            hint="live occupancy"
          />
        )}
        <StatCard label="Plans on sale" value={kpis.activePlans} icon={Package} hint="published" />
        <StatCard
          label="Classes running"
          value={kpis.classesThisWeek}
          icon={CalendarRange}
          hint="on the timetable"
        />
        <StatCard
          label="Calls due"
          value={kpis.followUpsDue}
          icon={Filter}
          hint="enquiries to chase"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Section
            title="Today's classes"
            description={
              dashboard.todayClasses.length > 0
                ? `${dashboard.todayClasses.length} class${dashboard.todayClasses.length === 1 ? "" : "es"} on today`
                : undefined
            }
            href="/gym/classes"
            bodyClassName="pb-1"
          >
            {dashboard.todayClasses.length > 0 ? (
              <TodayClasses classes={dashboard.todayClasses} />
            ) : (
              <EmptyState
                compact
                icon={CalendarRange}
                title="No classes today"
                description="Put your weekly slots on the timetable and members book their own spot from the app."
                action={
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/gym/classes">Open the timetable</Link>
                  </Button>
                }
              />
            )}
          </Section>

          {isOwner ? (
            <Section
              title="Revenue"
              description="Successful payments over the last six months"
              href="/gym/payments"
              hrefLabel="View payments"
            >
              <div className="px-3 pt-4 pb-2">
                <RevenueChart
                  data={revenue.map((r) => ({ month: r.month.toISOString(), revenue: r.revenue }))}
                />
              </div>
            </Section>
          ) : (
            <Section
              title="Footfall"
              description="Visits per day over the last two weeks"
              href="/gym/attendance"
              hrefLabel="Attendance"
            >
              <div className="px-3 pt-4 pb-2">
                <CountBarChart
                  data={footfall.map((d) => ({ label: d.date.toISOString(), visits: d.visits }))}
                  xKey="label"
                  xFormat="date"
                  height={256}
                />
              </div>
            </Section>
          )}
        </div>

        <div className="space-y-5">
          <Section
            title="Needs a call"
            description="Enquiries due or overdue a follow-up"
            href="/gym/leads"
            bodyClassName="pb-1"
          >
            {queueRows.length > 0 ? (
              <FollowUpPreview rows={queueRows} />
            ) : (
              <EmptyState
                compact
                icon={Sparkles}
                title="All caught up"
                description="Nobody is waiting on a call from you today."
              />
            )}
          </Section>

          <Section title="Recent activity" bodyClassName="pb-1">
            {dashboard.activity.length > 0 ? (
              <ActivityFeed items={dashboard.activity} />
            ) : (
              <EmptyState
                compact
                icon={Inbox}
                title="No activity yet"
                description="Visits, renewals and payments will show up here."
              />
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
