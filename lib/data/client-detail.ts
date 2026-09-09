import "server-only";
import { db } from "@/lib/db";
import { num } from "./serialize";

/**
 * Full member dossier for gym staff. Includes private staff notes — this
 * function must never be called from a member-facing route.
 *
 * Progress here is attendance, not measurements. A gym knows whether somebody
 * turned up; asking it to also record weights every week was a form nobody
 * filled in, and a chart built on a form nobody fills in is a lie with axes.
 */

/** A year of squares, which is what the attendance grid draws. */
export const ATTENDANCE_WINDOW_DAYS = 364;

export async function getClientDetail(gymId: string, clientId: string) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - ATTENDANCE_WINDOW_DAYS);

  const client = await db.clientProfile.findFirst({
    where: { id: clientId, gymId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
      subscriptions: {
        orderBy: { startDate: "desc" },
        include: {
          plan: true,
          payments: { orderBy: { paymentDate: "desc" } },
        },
      },
      attendance: {
        where: { checkInAt: { gte: since } },
        orderBy: { checkInAt: "desc" },
        select: { id: true, checkInAt: true, checkOutAt: true, source: true },
      },
      trainerNotes: {
        // Notes are private to staff, but shared across the gym's staff.
        where: { trainer: { gymId } },
        orderBy: { createdAt: "desc" },
      },
      bookings: {
        orderBy: { date: "desc" },
        take: 10,
        select: {
          id: true,
          date: true,
          status: true,
          gymClass: { select: { name: true, startTime: true } },
        },
      },
    },
  });

  if (!client) return null;

  const current =
    client.subscriptions.find((s) => s.status === "ACTIVE" || s.status === "TRIAL") ??
    client.subscriptions[0] ??
    null;

  const visits = client.attendance.map((a) => ({
    id: a.id,
    at: a.checkInAt,
    out: a.checkOutAt,
    source: a.source as string,
  }));

  const now = new Date();
  const thisMonth = visits.filter(
    (v) => v.at.getMonth() === now.getMonth() && v.at.getFullYear() === now.getFullYear(),
  ).length;
  const lastVisit = visits[0]?.at ?? null;

  /** Days since the last visit — the number that says who is drifting away. */
  const daysAway =
    lastVisit === null
      ? null
      : Math.floor((now.getTime() - lastVisit.getTime()) / 86_400_000);

  return {
    id: client.id,
    memberCode: client.memberCode,
    name: client.user.name,
    email: client.user.email,
    phone: client.user.phone,
    joinedAt: client.createdAt,
    dateOfBirth: client.dateOfBirth,
    gender: client.gender as string | null,
    notes: client.notes,

    currentSubscription: current
      ? {
          id: current.id,
          status: current.status as string,
          startDate: current.startDate,
          endDate: current.endDate,
          autoRenew: current.autoRenew,
          // What this member was actually sold. The plan's price is carried too,
          // so the UI can say "list price is X" when the two differ.
          price: num(current.price) ?? 0,
          currency: current.currency,
          plan: {
            id: current.plan.id,
            name: current.plan.name,
            price: num(current.plan.price) ?? 0,
            currency: current.plan.currency,
            durationDays: current.plan.durationDays,
            planType: current.plan.planType as string,
          },
          payments: current.payments.map((p) => ({
            id: p.id,
            amount: num(p.amount) ?? 0,
            currency: p.currency,
            paymentDate: p.paymentDate,
            status: p.status as string,
            method: p.paymentMethod as string,
          })),
        }
      : null,

    subscriptions: client.subscriptions.map((s) => ({
      id: s.id,
      status: s.status as string,
      startDate: s.startDate,
      endDate: s.endDate,
      planName: s.plan.name,
      price: num(s.price) ?? 0,
      currency: s.currency,
    })),

    visits,
    attendance: { thisMonth, total: visits.length, lastVisit, daysAway },

    bookings: client.bookings.map((b) => ({
      id: b.id,
      date: b.date,
      status: b.status as string,
      className: b.gymClass.name,
      startTime: b.gymClass.startTime,
    })),

    /** PRIVATE — staff only. */
    staffNotes: client.trainerNotes.map((n) => ({
      id: n.id,
      note: n.note,
      createdAt: n.createdAt,
    })),
  };
}

export type ClientDetail = NonNullable<Awaited<ReturnType<typeof getClientDetail>>>;
