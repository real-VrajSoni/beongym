import "server-only";
import { db } from "@/lib/db";
import { num } from "./serialize";
import { fromDateOnly } from "@/lib/format";
import { differenceInCalendarDays, endOfDay, startOfDay, startOfMonth, subMonths } from "date-fns";

const LIVE_STATUSES = ["ACTIVE", "TRIAL"] as const;

/* ── shared shapes ─────────────────────────────────────────── */

export type RosterClient = {
  id: string;
  userId: string;
  memberCode: string;
  name: string;
  email: string | null;
  phone: string | null;
  joinedAt: Date;
  program: { name: string; planId: string } | null;
  subscriptionId: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  /** Last time they scanned in or were checked in at the desk. */
  lastVisit: Date | null;
  /** Visits this calendar month — the number that says who is drifting. */
  visitsThisMonth: number;
  daysAway: number | null;
  /** % of the subscription window elapsed. */
  programProgress: number | null;
};

/**
 * Every member of one gym. Scoped by `gymId` alone — staff see the whole
 * floor, not just the members assigned to them.
 */
export async function getRoster(gymId: string): Promise<RosterClient[]> {
  const clients = await db.clientProfile.findMany({
    where: { gymId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
      subscriptions: {
        orderBy: [{ startDate: "desc" }],
        include: { plan: { select: { id: true, name: true } } },
      },
      attendance: {
        orderBy: { checkInAt: "desc" },
        select: { id: true, checkInAt: true },
      },
    },
  });

  return clients
    .map((c) => {
      const current =
        c.subscriptions.find((s) => LIVE_STATUSES.includes(s.status as never)) ??
        c.subscriptions[0] ??
        null;
      const startDate = current ? fromDateOnly(current.startDate) : null;
      const endDate = current ? fromDateOnly(current.endDate) : null;

      const now = new Date();
      const lastVisit = c.attendance[0]?.checkInAt ?? null;
      const visitsThisMonth = c.attendance.filter(
        (a) =>
          a.checkInAt.getMonth() === now.getMonth() &&
          a.checkInAt.getFullYear() === now.getFullYear(),
      ).length;

      let programProgress: number | null = null;
      if (startDate && endDate) {
        const total = differenceInCalendarDays(endDate, startDate) || 1;
        const done = differenceInCalendarDays(new Date(), startDate);
        programProgress = Math.max(0, Math.min(100, Math.round((done / total) * 100)));
      }

      return {
        id: c.id,
        userId: c.user.id,
        memberCode: c.memberCode,
        name: c.user.name,
        email: c.user.email,
        phone: c.user.phone,
        joinedAt: c.user.createdAt,
        program: current ? { name: current.plan.name, planId: current.plan.id } : null,
        subscriptionId: current?.id ?? null,
        status: current?.status ?? "NONE",
        startDate,
        endDate,
        lastVisit,
        visitsThisMonth,
        daysAway:
          lastVisit === null ? null : Math.floor((Date.now() - lastVisit.getTime()) / 86_400_000),
        programProgress,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* ── dashboard ─────────────────────────────────────────────── */

/**
 * @param includeRevenue false for GYM_STAFF — revenue is the owner's business,
 * and leaving it out of the payload means it is not merely hidden in the UI.
 */
export async function getDashboard(gymId: string, includeRevenue = true) {
  const now = new Date();
  const monthStart = startOfMonth(now);

  const [
    activeClients,
    activePlans,
    monthPayments,
    lastMonthPayments,
    classesThisWeek,
    todayClasses,
    followUpsDue,
    recentVisits,
    recentSubscriptions,
    recentPayments,
  ] = await Promise.all([
    db.subscription.findMany({
      where: { plan: { gymId }, status: { in: ["ACTIVE", "TRIAL"] } },
      select: { clientId: true },
      distinct: ["clientId"],
    }),
    db.plan.count({ where: { gymId, isActive: true } }),
    includeRevenue
      ? db.payment.findMany({
          where: {
            subscription: { plan: { gymId } },
            status: "SUCCESSFUL",
            paymentDate: { gte: monthStart },
          },
          select: { amount: true },
        })
      : Promise.resolve([]),
    includeRevenue
      ? db.payment.findMany({
          where: {
            subscription: { plan: { gymId } },
            status: "SUCCESSFUL",
            paymentDate: { gte: startOfMonth(subMonths(now, 1)), lt: monthStart },
          },
          select: { amount: true },
        })
      : Promise.resolve([]),
    db.gymClass.count({ where: { gymId, isActive: true } }),
    // Today's timetable, with how many have booked the occurrence running now.
    db.gymClass.findMany({
      where: { gymId, isActive: true, dayOfWeek: now.getDay() === 0 ? 7 : now.getDay() },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        name: true,
        startTime: true,
        durationMinutes: true,
        capacity: true,
        coach: { select: { user: { select: { name: true } } } },
        _count: {
          select: {
            bookings: {
              where: {
                date: { gte: startOfDay(now), lte: endOfDay(now) },
                status: { in: ["BOOKED", "ATTENDED"] },
              },
            },
          },
        },
      },
    }),
    db.lead.count({
      where: {
        gymId,
        status: { notIn: ["JOINED", "LOST"] },
        nextFollowUpAt: { lte: endOfDay(now) },
      },
    }),
    db.attendance.findMany({
      where: { gymId },
      orderBy: { checkInAt: "desc" },
      take: 6,
      include: { member: { include: { user: { select: { name: true } } } } },
    }),
    db.subscription.findMany({
      where: { plan: { gymId } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        plan: { select: { name: true } },
        client: { include: { user: { select: { name: true } } } },
      },
    }),
    db.payment.findMany({
      where: { subscription: { plan: { gymId } } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        subscription: {
          include: {
            plan: { select: { name: true } },
            client: { include: { user: { select: { name: true } } } },
          },
        },
      },
    }),
  ]);

  const sum = (rows: { amount: unknown }[]) =>
    rows.reduce((acc, r) => acc + (num(r.amount as never) ?? 0), 0);
  const monthRevenue = sum(monthPayments);
  const lastMonthRevenue = sum(lastMonthPayments);

  type Activity = { id: string; kind: string; who: string; text: string; at: Date; href: string };
  const activity: Activity[] = [
    ...recentVisits.map((a) => ({
      id: `att-${a.id}`,
      kind: "attendance",
      who: a.member.user.name,
      text: "came in",
      at: a.checkInAt,
      href: `/gym/clients/${a.memberId}?tab=attendance`,
    })),
    ...recentSubscriptions.map((s) => ({
      id: `sub-${s.id}`,
      kind: "subscription",
      who: s.client.user.name,
      text: `started ${s.plan.name}`,
      at: s.createdAt,
      href: `/gym/clients/${s.clientId}?tab=subscription`,
    })),
    ...recentPayments.map((p) => ({
      id: `pay-${p.id}`,
      kind: "payment",
      who: p.subscription.client.user.name,
      text: `${p.status === "SUCCESSFUL" ? "paid for" : p.status === "FAILED" ? "had a failed payment for" : "has a pending payment for"} ${p.subscription.plan.name}`,
      at: p.createdAt,
      href: "/gym/payments",
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8);

  return {
    kpis: {
      activeClients: activeClients.length,
      monthRevenue: includeRevenue ? monthRevenue : null,
      revenueDeltaPct:
        includeRevenue && lastMonthRevenue > 0
          ? Number((((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1))
          : null,
      activePlans,
      classesThisWeek,
      followUpsDue,
    },
    todayClasses: todayClasses.map((c) => ({
      id: c.id,
      name: c.name,
      startTime: c.startTime,
      durationMinutes: c.durationMinutes,
      capacity: c.capacity,
      booked: c._count.bookings,
      coachName: c.coach?.user.name ?? null,
    })),
    activity,
  };
}

/** Monthly successful revenue for the last `months` months, oldest first. */
export async function getRevenueSeries(gymId: string, months = 6) {
  const from = startOfMonth(subMonths(new Date(), months - 1));
  const payments = await db.payment.findMany({
    where: {
      subscription: { plan: { gymId } },
      status: "SUCCESSFUL",
      paymentDate: { gte: from },
    },
    select: { amount: true, paymentDate: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const d = startOfMonth(subMonths(new Date(), months - 1 - i));
    buckets.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
  }
  for (const p of payments) {
    const key = `${p.paymentDate.getFullYear()}-${p.paymentDate.getMonth()}`;
    if (buckets.has(key)) buckets.set(key, buckets.get(key)! + (num(p.amount) ?? 0));
  }

  return Array.from(buckets.entries()).map(([key, revenue]) => {
    const [y, m] = key.split("-").map(Number);
    return { month: new Date(y!, m!, 1), revenue };
  });
}

/**
 * Who needs a phone call today.
 *
 * The dashboard's one to-do list. Overdue first, because an enquiry that went
 * cold three days ago is worth more attention than one due this afternoon.
 */
export async function getFollowUpQueue(gymId: string) {
  const now = new Date();
  const leads = await db.lead.findMany({
    where: {
      gymId,
      status: { notIn: ["JOINED", "LOST"] },
      nextFollowUpAt: { lte: endOfDay(now) },
    },
    orderBy: { nextFollowUpAt: "asc" },
    take: 8,
    select: {
      id: true,
      name: true,
      phone: true,
      status: true,
      interest: true,
      nextFollowUpAt: true,
    },
  });

  return leads.map((l) => ({
    id: l.id,
    name: l.name,
    phone: l.phone,
    status: l.status as string,
    interest: l.interest,
    dueOn: l.nextFollowUpAt!,
    daysOverdue: Math.max(
      0,
      differenceInCalendarDays(startOfDay(now), startOfDay(l.nextFollowUpAt!)),
    ),
  }));
}

/**
 * What this gym charges in.
 *
 * A separate one-column read rather than a field on the session token: the
 * token is signed at sign-in and would go stale the moment an owner changed
 * currency in settings, and `sessionIsLive` rejects a token whose contents no
 * longer match the database — so putting it there would sign people out for
 * editing a dropdown. This is an indexed primary-key lookup on a page that is
 * already querying.
 */
export async function getGymCurrency(gymId: string): Promise<string> {
  const gym = await db.gym.findUnique({ where: { id: gymId }, select: { currency: true } });
  return gym?.currency ?? "INR";
}
