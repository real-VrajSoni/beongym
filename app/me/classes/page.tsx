import { requirePaidMember } from "@/lib/auth";
import { getMemberTimetable, PLANNING_DAYS } from "@/lib/data/classes";
import { MemberClasses } from "@/components/member/classes-view";

export const metadata = { title: "Classes" };

export default async function MemberClassesPage() {
  const session = await requirePaidMember();
  const slots = await getMemberTimetable(session.gymId, session.profileId);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">Classes</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Book your own spot up to {PLANNING_DAYS} days ahead. If a class is full you go on
          the waitlist and move up automatically when somebody cancels.
        </p>
      </div>

      <MemberClasses slots={slots.map((s) => ({ ...s, date: s.date.toISOString() }))} />
    </div>
  );
}
