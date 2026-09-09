import "server-only";
import { db } from "@/lib/db";
import { endOfDay, startOfDay, subDays } from "date-fns";

/** Live floor state plus the history behind the attendance screen. */
export async function getAttendance(gymId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);

  const [insideNow, todayVisits, recent, last30] = await Promise.all([
    db.attendance.findMany({
      where: { gymId, checkOutAt: null },
      orderBy: { checkInAt: "asc" },
      include: { member: { include: { user: { select: { name: true } } } } },
    }),
    db.attendance.count({
      where: { gymId, checkInAt: { gte: todayStart, lte: endOfDay(now) } },
    }),
    db.attendance.findMany({
      where: { gymId },
      orderBy: { checkInAt: "desc" },
      take: 40,
      include: { member: { include: { user: { select: { name: true } } } } },
    }),
    db.attendance.findMany({
      where: { gymId, checkInAt: { gte: subDays(todayStart, 29) } },
      select: { checkInAt: true, memberId: true },
    }),
  ]);

  // Visits per day for the last 30 days, oldest first.
  const dayBuckets = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    dayBuckets.set(subDays(todayStart, i).toDateString(), 0);
  }
  for (const row of last30) {
    const key = startOfDay(row.checkInAt).toDateString();
    if (dayBuckets.has(key)) dayBuckets.set(key, dayBuckets.get(key)! + 1);
  }

  // Which hours the gym is busiest — drives staffing decisions.
  const hourBuckets = new Array(24).fill(0) as number[];
  for (const row of last30) hourBuckets[row.checkInAt.getHours()] += 1;

  const uniqueVisitors = new Set(last30.map((r) => r.memberId)).size;

  return {
    insideNow: insideNow.map((a) => ({
      id: a.id,
      memberId: a.memberId,
      name: a.member.user.name,
      memberCode: a.member.memberCode,
      checkInAt: a.checkInAt,
      source: a.source as string,
    })),
    todayVisits,
    uniqueVisitors,
    recent: recent.map((a) => ({
      id: a.id,
      memberId: a.memberId,
      name: a.member.user.name,
      memberCode: a.member.memberCode,
      checkInAt: a.checkInAt,
      checkOutAt: a.checkOutAt,
      source: a.source as string,
    })),
    daily: Array.from(dayBuckets.entries()).map(([day, visits]) => ({
      date: new Date(day),
      visits,
    })),
    hourly: hourBuckets.map((visits, hour) => ({ hour, visits })),
  };
}
