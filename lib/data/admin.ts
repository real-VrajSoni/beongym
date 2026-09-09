import "server-only";
import { db } from "@/lib/db";
import { num } from "./serialize";
import { startOfMonth, subMonths } from "date-fns";

/**
 * Platform-wide queries. These deliberately span every tenant and are only
 * ever reached through requireAdmin().
 */

/** What the platform charges each gym per month. Defined once, in lib/platform-plans. */
import { ENTRY_PRICE, monthlyValue } from "@/lib/platform-plans";

/** What each tier bills per month. Elite bills nothing after the first payment. */
export const TIER_PRICE: Record<string, number> = { PRO: ENTRY_PRICE, ELITE: 0 };

export async function getPlatformOverview() {
  const now = new Date();
  const monthStart = startOfMonth(now);

  const [gyms, memberCount, staffCount, monthPayments, lastMonthPayments, recentGyms, recentUsers] =
    await Promise.all([
      db.gym.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          code: true,
          name: true,
          city: true,
          status: true,
          tier: true,
          accentColor: true,
          logoText: true,
          createdAt: true,
          trialEndsAt: true,
              accessExpiresAt: true,
          _count: { select: { members: true, staff: true, plans: true } },
        },
      }),
      db.user.count({ where: { role: "MEMBER" } }),
      db.user.count({ where: { role: { in: ["GYM_OWNER", "GYM_STAFF"] } } }),
      db.payment.findMany({
        where: { status: "SUCCESSFUL", paymentDate: { gte: monthStart } },
        select: { amount: true },
      }),
      db.payment.findMany({
        where: {
          status: "SUCCESSFUL",
          paymentDate: { gte: startOfMonth(subMonths(now, 1)), lt: monthStart },
        },
        select: { amount: true },
      }),
      db.gym.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, code: true, city: true, createdAt: true, status: true },
      }),
      db.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        where: { role: { not: "SUPER_ADMIN" } },
        select: {
          id: true,
          name: true,
          role: true,
          createdAt: true,
          gym: { select: { name: true, id: true } },
        },
      }),
    ]);

  const sum = (rows: { amount: unknown }[]) =>
    rows.reduce((a, r) => a + (num(r.amount as never) ?? 0), 0);

  /**
   * Member fees flow to the gyms; the platform's own revenue is subscriptions.
   *
   * Lifetime buyers contribute nothing recurring — see `monthlyValue`.
   */
  const platformMrr = gyms
    .filter((g) => g.status === "ACTIVE" || g.status === "TRIAL")
    .reduce((a, g) => a + monthlyValue(g.tier, g.accessExpiresAt), 0);

  const [prospectCount, paidOrders] = await Promise.all([
    db.user.count({ where: { role: "PROSPECT" } }),
    db.platformOrder.count({ where: { status: "PAID" } }),
  ]);

  return {
    gyms,
    kpis: {
      prospectCount,
      paidOrders,
      totalGyms: gyms.length,
      activeGyms: gyms.filter((g) => g.status === "ACTIVE").length,
      trialGyms: gyms.filter((g) => g.status === "TRIAL").length,
      suspendedGyms: gyms.filter((g) => g.status === "SUSPENDED" || g.status === "CANCELLED").length,
      memberCount,
      staffCount,
      platformMrr,
      gmv: sum(monthPayments),
      gmvDeltaPct: (() => {
        const last = sum(lastMonthPayments);
        const current = sum(monthPayments);
        return last > 0 ? Number((((current - last) / last) * 100).toFixed(1)) : null;
      })(),
    },
    recentGyms,
    recentUsers,
  };
}

/** Gross merchandise value flowing through the platform, by month. */
export async function getPlatformRevenueSeries(months = 6) {
  const from = startOfMonth(subMonths(new Date(), months - 1));
  const payments = await db.payment.findMany({
    where: { status: "SUCCESSFUL", paymentDate: { gte: from } },
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

/** Per-gym rollup used by the admin gyms table. */
export async function getGymTable() {
  const gyms = await db.gym.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      name: true,
      city: true,
      status: true,
      tier: true,
      accentColor: true,
      logoText: true,
      createdAt: true,
      trialEndsAt: true,
      // Tells a live membership from a lapsed one.
      accessExpiresAt: true,
      _count: { select: { members: true, staff: true, plans: true } },
      plans: {
        select: {
          subscriptions: {
            select: {
              status: true,
              payments: { select: { amount: true, status: true } },
            },
          },
        },
      },
    },
  });

  return gyms.map((g) => {
    const subs = g.plans.flatMap((p) => p.subscriptions);
    return {
      id: g.id,
      code: g.code,
      name: g.name,
      city: g.city,
      status: g.status as string,
      tier: g.tier as string,
      accentColor: g.accentColor,
      logoText: g.logoText,
      createdAt: g.createdAt,
      trialEndsAt: g.trialEndsAt,
      members: g._count.members,
      staff: g._count.staff,
      plans: g._count.plans,
      activeSubscriptions: subs.filter((s) => s.status === "ACTIVE" || s.status === "TRIAL").length,
      collected: subs.reduce(
        (a, s) =>
          a +
          s.payments
            .filter((p) => p.status === "SUCCESSFUL")
            .reduce((x, p) => x + (num(p.amount) ?? 0), 0),
        0,
      ),
      mrr: monthlyValue(g.tier, g.accessExpiresAt),
    };
  });
}

export type AdminGymRow = Awaited<ReturnType<typeof getGymTable>>[number];

/** Full detail for one gym, from the platform's point of view. */
export async function getGymDetail(gymId: string) {
  const gym = await db.gym.findUnique({
    where: { id: gymId },
    include: {
      users: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          lastLoginAt: true,
        },
      },
      plans: {
        select: {
          id: true,
          name: true,
          price: true,
          isActive: true,
          _count: { select: { subscriptions: true } },
        },
      },
      order: { select: { billingCycle: true } },
      _count: { select: { members: true, staff: true, attendance: true } },
    },
  });
  if (!gym) return null;

  const [payments, activeSubs] = await Promise.all([
    db.payment.findMany({
      where: { subscription: { plan: { gymId } }, status: "SUCCESSFUL" },
      select: { amount: true },
    }),
    db.subscription.count({
      where: { plan: { gymId }, status: { in: ["ACTIVE", "TRIAL"] } },
    }),
  ]);

  return {
    ...gym,
    plans: gym.plans.map((p) => ({ ...p, price: num(p.price) ?? 0 })),
    collected: payments.reduce((a, p) => a + (num(p.amount) ?? 0), 0),
    activeSubscriptions: activeSubs,
    mrr: monthlyValue(gym.tier, gym.accessExpiresAt),
  };
}
