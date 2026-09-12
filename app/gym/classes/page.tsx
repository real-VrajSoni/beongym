import { requirePaidStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANNING_DAYS, getCalendar, getTimetable } from "@/lib/data/classes";
import { PageHeader } from "@/components/ui/page-header";
import { ClassesView } from "@/components/classes/classes-view";

export const metadata = { title: "Classes" };

export default async function ClassesPage() {
  const session = await requirePaidStaff();

  const [calendar, classes, coaches] = await Promise.all([
    getCalendar(session.gymId),
    getTimetable(session.gymId),
    db.trainerProfile.findMany({
      where: { gymId: session.gymId },
      select: { id: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Classes"
        description={`Plan the next ${PLANNING_DAYS} days. Members book their own spot inside the same window — capacity decides, so nobody has to approve anything.`}
      />
      <ClassesView
        days={calendar.map((d) => ({
          date: d.date.toISOString(),
          classes: d.classes,
        }))}
        classes={classes.map((c) => ({
          ...c,
          date: c.date ? c.date.toISOString().slice(0, 10) : null,
        }))}
        coaches={coaches.map((c) => ({ id: c.id, name: c.user.name }))}
      />
    </>
  );
}
