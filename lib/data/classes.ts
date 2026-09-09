import "server-only";
import { db } from "@/lib/db";
import { toDateOnly } from "@/lib/format";

/**
 * The timetable.
 *
 * A class is either a weekly slot (`date: null`) or a one-off on a given day.
 * Both live in one table, so a one-off behaves exactly like a recurring class
 * everywhere else — bookings, capacity, the register — and the calendar is one
 * query rather than two merged in the page.
 *
 * Occurrences are never materialised. A gym running 20 classes a week would be
 * 1,040 rows a year, almost all of them identical; instead the calendar expands
 * the templates over the fortnight it is showing, and `ClassCancellation`
 * strikes out the handful that are not running.
 */

/** How far ahead the calendar plans, and how far ahead a member may book. */
export const PLANNING_DAYS = 14;

const DAY_MS = 86_400_000;

/** UTC midnight for a date, which is how `@db.Date` columns come back. */
export function utcDay(date: Date | string): Date {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Local today as a UTC-midnight date, so "today" means the gym's today. */
export function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/** 1 = Monday … 7 = Sunday, from a UTC date. */
export function isoDayOfWeek(date: Date): number {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

/** The next occurrence of `dayOfWeek`, today included. */
export function nextOccurrence(dayOfWeek: number, from: Date = todayUtc()): Date {
  const base = utcDay(from);
  const ahead = (dayOfWeek - isoDayOfWeek(base) + 7) % 7;
  return new Date(base.getTime() + ahead * DAY_MS);
}

/** Every date in the planning window, starting today. */
export function planningWindow(from: Date = todayUtc()): Date[] {
  const start = utcDay(from);
  return Array.from({ length: PLANNING_DAYS }, (_, i) => new Date(start.getTime() + i * DAY_MS));
}

type ClassRow = {
  id: string;
  name: string;
  description: string | null;
  dayOfWeek: number;
  date: Date | null;
  startTime: string;
  durationMinutes: number;
  capacity: number;
  isActive: boolean;
  coach: { id: string; user: { name: string } } | null;
};

/** Does this class run on this date? */
function runsOn(row: ClassRow, date: Date): boolean {
  if (!row.isActive) return false;
  if (row.date) return utcDay(row.date).getTime() === date.getTime();
  return row.dayOfWeek === isoDayOfWeek(date);
}

const key = (classId: string, date: Date) => `${classId}:${date.toISOString().slice(0, 10)}`;

/**
 * The fortnight, day by day, with bookings and cancellations resolved.
 *
 * One query for the classes, one for the bookings in the window, one for the
 * cancellations — the expansion itself is arithmetic.
 */
export async function getCalendar(gymId: string, from: Date = todayUtc()) {
  const days = planningWindow(from);
  const last = days[days.length - 1];

  const [classes, bookings, cancellations] = await Promise.all([
    db.gymClass.findMany({
      where: {
        gymId,
        // A one-off outside the window cannot appear in it.
        OR: [{ date: null }, { date: { gte: days[0], lte: last } }],
      },
      orderBy: [{ startTime: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        dayOfWeek: true,
        date: true,
        startTime: true,
        durationMinutes: true,
        capacity: true,
        isActive: true,
        coach: { select: { id: true, user: { select: { name: true } } } },
      },
    }),
    db.classBooking.findMany({
      where: {
        gymClass: { gymId },
        date: { gte: days[0], lte: last },
        status: { in: ["BOOKED", "ATTENDED"] },
      },
      select: { classId: true, date: true, memberId: true },
    }),
    db.classCancellation.findMany({
      where: { gymClass: { gymId }, date: { gte: days[0], lte: last } },
      select: { classId: true, date: true, reason: true },
    }),
  ]);

  const booked = new Map<string, number>();
  for (const b of bookings) {
    const k = key(b.classId, utcDay(b.date));
    booked.set(k, (booked.get(k) ?? 0) + 1);
  }
  const cancelled = new Map<string, string | null>();
  for (const c of cancellations) cancelled.set(key(c.classId, utcDay(c.date)), c.reason);

  return days.map((date) => ({
    date,
    classes: classes
      .filter((c) => runsOn(c, date))
      .map((c) => {
        const k = key(c.id, date);
        return {
          id: c.id,
          name: c.name,
          description: c.description,
          startTime: c.startTime,
          durationMinutes: c.durationMinutes,
          capacity: c.capacity,
          booked: booked.get(k) ?? 0,
          coachId: c.coach?.id ?? null,
          coachName: c.coach?.user.name ?? null,
          oneOff: c.date !== null,
          cancelled: cancelled.has(k),
          cancelReason: cancelled.get(k) ?? null,
        };
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));
}

export type CalendarDay = Awaited<ReturnType<typeof getCalendar>>[number];
export type CalendarClass = CalendarDay["classes"][number];

/** The weekly templates, for the editor beside the calendar. */
export async function getTimetable(gymId: string) {
  const classes = await db.gymClass.findMany({
    where: { gymId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      dayOfWeek: true,
      date: true,
      startTime: true,
      durationMinutes: true,
      capacity: true,
      isActive: true,
      coach: { select: { id: true, user: { select: { name: true } } } },
    },
  });

  return classes.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    dayOfWeek: c.dayOfWeek,
    date: c.date,
    startTime: c.startTime,
    durationMinutes: c.durationMinutes,
    capacity: c.capacity,
    isActive: c.isActive,
    coachId: c.coach?.id ?? null,
    coachName: c.coach?.user.name ?? null,
  }));
}

export type TimetableClass = Awaited<ReturnType<typeof getTimetable>>[number];

/** Who is booked into one class on one date — the register the coach reads out. */
export async function getClassRegister(gymId: string, classId: string, date: Date) {
  const gymClass = await db.gymClass.findFirst({
    where: { id: classId, gymId },
    select: { id: true, name: true, capacity: true, startTime: true, durationMinutes: true },
  });
  if (!gymClass) return null;

  const bookings = await db.classBooking.findMany({
    where: { classId, date: utcDay(date) },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      member: { select: { id: true, memberCode: true, user: { select: { name: true } } } },
    },
  });

  return {
    gymClass,
    date: utcDay(date),
    bookings: bookings.map((b) => ({
      id: b.id,
      status: b.status as string,
      memberId: b.member.id,
      memberCode: b.member.memberCode,
      memberName: b.member.user.name,
    })),
  };
}

/**
 * What a member sees: every class they could book in the window, with the spots
 * left and their own booking on it if they have one.
 */
export async function getMemberTimetable(gymId: string, memberId: string) {
  const calendar = await getCalendar(gymId);

  const mine = await db.classBooking.findMany({
    where: {
      memberId,
      date: { gte: calendar[0].date, lte: calendar[calendar.length - 1].date },
      status: { in: ["BOOKED", "ATTENDED", "WAITLIST"] },
    },
    select: { id: true, classId: true, date: true, status: true },
  });
  const byKey = new Map(mine.map((b) => [key(b.classId, utcDay(b.date)), b]));

  return calendar.flatMap((day) =>
    day.classes
      .filter((c) => !c.cancelled)
      .map((c) => {
        const booking = byKey.get(key(c.id, day.date));
        return {
          classId: c.id,
          name: c.name,
          description: c.description,
          coachName: c.coachName,
          date: day.date,
          startTime: c.startTime,
          durationMinutes: c.durationMinutes,
          capacity: c.capacity,
          booked: c.booked,
          spotsLeft: Math.max(0, c.capacity - c.booked),
          myBooking: booking ? { id: booking.id, status: booking.status as string } : null,
        };
      }),
  );
}

export type MemberSlot = Awaited<ReturnType<typeof getMemberTimetable>>[number];

/** Kept for callers that still speak in "how far ahead can somebody book". */
export const BOOKING_HORIZON_DAYS = PLANNING_DAYS;

export { toDateOnly };
