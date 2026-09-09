import { notFound } from "next/navigation";
import { Flame } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { getMemberHome } from "@/lib/data/member";
import { AttendanceGrid } from "@/components/attendance/attendance-grid";
import { Section } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate, formatDateShort } from "@/lib/format";

export const metadata = { title: "Attendance" };

export default async function MemberAttendancePage() {
  const session = await requireMember();
  const me = await getMemberHome(session.profileId);
  if (!me) notFound();

  const now = new Date();
  const thisMonth = me.visits.filter((v) => {
    const d = new Date(v.at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const last = me.visits[0]?.at ?? null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">
          Your attendance
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Every day you scanned in at {me.gym.name}. One square a day — the more you train, the
          greener it gets.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="This month" value={thisMonth} icon={Flame} accent />
        <StatCard label="Last year" value={me.visits.length} hint="days trained" />
        <StatCard
          label="Last visit"
          value={last ? formatDateShort(last) : "—"}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <Section title="The last year" bodyClassName="px-5 py-4">
        <AttendanceGrid visits={me.visits.map((v) => ({ at: v.at }))} />
      </Section>

      <Section title="Recent visits" bodyClassName="px-0 py-0">
        {me.visits.length === 0 ? (
          <EmptyState
            icon={Flame}
            title="No visits yet"
            description="Scan your gym's QR code on the way in and your first square lights up."
          />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {me.visits.slice(0, 20).map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <p className="text-[13.5px] font-medium">{formatDate(v.at)}</p>
                <p className="tabular text-[12.5px] text-muted-foreground">
                  {new Date(v.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  {v.out
                    ? ` → ${new Date(v.out).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                    : " · still inside"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
