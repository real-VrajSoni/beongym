import "server-only";
import { db } from "@/lib/db";
import { num } from "./serialize";

/**
 * Everything the member app is allowed to see about one member.
 *
 * SECURITY: scoped by the caller's own `ClientProfile.id` and deliberately
 * never selecting `TrainerNote` — coaching notes are written for the gym's own
 * staff and must not reach a member-facing route. Nothing here reads across to
 * another member, and nothing reads the gym's revenue.
 *
 * The member app is read-mostly by design. The first one had members asking for
 * slots and gyms answering inside the product, which produced a queue nobody at
 * the front desk wanted to work. Sessions are agreed at the gym; this shows a
 * member what they have, what they owe and how they are doing.
 */
export async function getMemberHome(profileId: string) {
  const me = await db.clientProfile.findUnique({
    where: { id: profileId },
    include: {
      user: { select: { name: true, email: true, phone: true, createdAt: true } },
      gym: {
        select: {
          name: true,
          code: true,
          city: true,
          phone: true,
          email: true,
          address: true,
          openingHours: true,
          accentColor: true,
          logoText: true,
          imageUrl: true,
          links: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, kind: true, label: true, url: true },
          },
        },
      },
      trainer: { select: { user: { select: { name: true } }, title: true } },
      subscriptions: {
        orderBy: { startDate: "desc" },
        include: {
          plan: {
            select: {
              name: true,
              description: true,
              planType: true,
              durationDays: true,
              billingInterval: true,
              price: true,
              currency: true,
            },
          },
          payments: {
            orderBy: { paymentDate: "desc" },
            select: {
              id: true,
              amount: true,
              currency: true,
              paymentDate: true,
              status: true,
              paymentMethod: true,
              transactionId: true,
            },
          },
        },
      },
      attendance: {
        orderBy: { checkInAt: "desc" },
        // A year of days, which is what the attendance grid draws.
        where: { checkInAt: { gte: new Date(Date.now() - 364 * 86_400_000) } },
        select: { id: true, checkInAt: true, checkOutAt: true },
      },
    },
  });

  if (!me) return null;

  const current = me.subscriptions.find((s) => s.status === "ACTIVE" || s.status === "TRIAL") ?? null;

  const payments = me.subscriptions.flatMap((s) =>
    s.payments.map((p) => ({
      id: p.id,
      amount: num(p.amount) ?? 0,
      currency: p.currency,
      date: p.paymentDate,
      status: p.status as string,
      method: p.paymentMethod as string,
      reference: p.transactionId,
      planName: s.plan.name,
    })),
  );
  payments.sort((a, b) => b.date.getTime() - a.date.getTime());

  /** What is still owed on the live membership, if anything. */
  const paidOnCurrent = current
    ? current.payments
        .filter((p) => p.status === "SUCCESSFUL")
        .reduce((sum, p) => sum + (num(p.amount) ?? 0), 0)
    : 0;
  // What this member was sold, taken from the membership itself. Reading the
  // plan instead meant a price rise landed retroactively on everybody already
  // on it — including people paid in full, who would find themselves in arrears
  // for a number nobody ever quoted them.
  const priceOfCurrent = current ? (num(current.price) ?? 0) : 0;
  const outstanding = current ? Math.max(0, priceOfCurrent - paidOnCurrent) : 0;

  return {
    name: me.user.name,
    email: me.user.email,
    phone: me.user.phone,
    memberCode: me.memberCode,
    memberSince: me.createdAt,
    coach: me.trainer ? { name: me.trainer.user.name, title: me.trainer.title } : null,
    gym: me.gym,
    membership: current
      ? {
          id: current.id,
          planName: current.plan.name,
          planDescription: current.plan.description,
          planType: current.plan.planType as string,
          status: current.status as string,
          startDate: current.startDate,
          endDate: current.endDate,
          autoRenew: current.autoRenew,
          price: priceOfCurrent,
          currency: current.plan.currency,
          paid: paidOnCurrent,
          outstanding,
        }
      : null,
    /** Older memberships, so a returning member sees their own history. */
    pastMemberships: me.subscriptions
      .filter((s) => s.id !== current?.id)
      .map((s) => ({
        id: s.id,
        planName: s.plan.name,
        status: s.status as string,
        startDate: s.startDate,
        endDate: s.endDate,
      })),
    payments,
    visits: me.attendance.map((a) => ({
      id: a.id,
      at: a.checkInAt,
      out: a.checkOutAt,
    })),
  };
}

export type MemberHome = NonNullable<Awaited<ReturnType<typeof getMemberHome>>>;

/**
 * The training and nutrition attached to the member's live membership.
 *
 * Split from the home query because it is a different page and a much wider
 * read — no point paying for exercise rows on a screen that shows dues.
 */
export async function getMemberProgramme(profileId: string) {
  const sub = await db.subscription.findFirst({
    where: { clientId: profileId, status: { in: ["ACTIVE", "TRIAL"] } },
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      plan: {
        select: {
          name: true,
          description: true,
          planType: true,
          workoutPlans: {
            take: 1,
            select: {
              id: true,
              name: true,
              description: true,
              days: {
                orderBy: [{ sortOrder: "asc" }, { dayOfWeek: "asc" }],
                select: {
                  id: true,
                  dayOfWeek: true,
                  title: true,
                  focus: true,
                  exercises: {
                    orderBy: { sortOrder: "asc" },
                    select: {
                      id: true,
                      name: true,
                      sets: true,
                      reps: true,
                      restSeconds: true,
                      tempo: true,
                      coachCue: true,
                    },
                  },
                },
              },
            },
          },
          dietPlans: {
            take: 1,
            select: {
              id: true,
              name: true,
              description: true,
              caloriesTarget: true,
              proteinTarget: true,
              carbsTarget: true,
              fatsTarget: true,
              meals: {
                orderBy: { sortOrder: "asc" },
                select: {
                  id: true,
                  title: true,
                  timing: true,
                  description: true,
                  calories: true,
                  protein: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!sub) return null;

  return {
    planName: sub.plan.name,
    planDescription: sub.plan.description,
    workout: sub.plan.workoutPlans[0] ?? null,
    diet: sub.plan.dietPlans[0] ?? null,
  };
}

export type MemberProgramme = NonNullable<Awaited<ReturnType<typeof getMemberProgramme>>>;
