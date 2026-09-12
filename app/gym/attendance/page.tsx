import Link from "next/link";
import { Activity, DoorOpen, QrCode, Repeat, Users } from "lucide-react";
import { requirePaidStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAttendance } from "@/lib/data/attendance";
import { relativeTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Section } from "@/components/ui/section";
import { CountBarChart } from "@/components/charts/bar-chart";
import { AttendanceView } from "@/components/attendance/attendance-view";

export const metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const session = await requirePaidStaff();

  const [data, members] = await Promise.all([
    getAttendance(session.gymId),
    db.clientProfile.findMany({
      where: { gymId: session.gymId },
      orderBy: { memberCode: "asc" },
      select: { id: true, memberCode: true, user: { select: { name: true } } },
    }),
  ]);

  const busiestHour = [...data.hourly].sort((a, b) => b.visits - a.visits)[0];

  return (
    <>
      <div
        className="section-hero mb-5 rounded-[var(--radius-card)] border border-[var(--border)] px-5 py-6 sm:px-7 sm:py-7"
        style={
          {
            "--hero-a": "rgba(47,198,191,0.18)",
            "--hero-b": "rgba(143,128,255,0.16)",
          } as React.CSSProperties
        }
      >
        <PageHeader
          className="mb-0"
          title="Attendance"
          description="Who is on the floor right now, and how busy the week has been."
          actions={
            <Link
              href="/gym/attendance/qr"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 text-[13.5px] font-medium whitespace-nowrap hover:border-[var(--brand)]/50"
            >
              <QrCode className="size-4" /> Check-in code
            </Link>
          }
        />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Inside now"
          value={data.insideNow.length}
          icon={DoorOpen}
          accent
          hint="live occupancy"
        />
        <StatCard label="Visits today" value={data.todayVisits} icon={Activity} />
        <StatCard
          label="Unique visitors"
          value={data.uniqueVisitors}
          icon={Users}
          hint="last 30 days"
        />
        <StatCard
          label="Busiest hour"
          value={busiestHour ? `${busiestHour.hour}:00` : "—"}
          icon={Repeat}
          hint={busiestHour ? `${busiestHour.visits} visits` : undefined}
        />
      </div>

      <AttendanceView
        inside={data.insideNow.map((r) => ({
          ...r,
          checkInAt: r.checkInAt.toISOString(),
          sinceLabel: relativeTime(r.checkInAt),
        }))}
        recent={data.recent.map((r) => ({
          ...r,
          checkInAt: r.checkInAt.toISOString(),
          checkOutAt: r.checkOutAt?.toISOString() ?? null,
        }))}
        members={members.map((m) => ({
          id: m.id,
          name: m.user.name,
          memberCode: m.memberCode,
        }))}
      />

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Section title="Visits per day" description="Last 30 days">
          <div className="px-3 pt-4 pb-2">
            <CountBarChart
              data={data.daily.map((d) => ({ label: d.date.toISOString(), visits: d.visits }))}
              xKey="label"
              xFormat="date"
            />
          </div>
        </Section>

        <Section title="Busiest hours" description="When the floor fills up">
          <div className="px-3 pt-4 pb-2">
            <CountBarChart
              data={data.hourly.filter((h) => h.hour >= 5 && h.hour <= 23)}
              xKey="hour"
              xFormat="hour"
            />
          </div>
        </Section>
      </div>
    </>
  );
}
