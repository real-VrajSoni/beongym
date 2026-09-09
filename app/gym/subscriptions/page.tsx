import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRoster, getGymCurrency } from "@/lib/data/gym";
import { num } from "@/lib/data/serialize";
import { formatCurrency, fromDateOnly } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  SubscriptionsTable,
  type SubscriptionRow,
} from "@/components/subscriptions/subscriptions-table";
import { NewSubscriptionButton } from "@/components/subscriptions/subscription-form";
import { AlertTriangle, Repeat, Users } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";

export const metadata = { title: "Memberships" };

export default async function SubscriptionsPage() {
  const session = await requireStaff();

  const [subscriptions, plans, roster, currency] = await Promise.all([
    db.subscription.findMany({
      where: { plan: { gymId: session.gymId } },
      orderBy: [{ startDate: "desc" }],
      include: {
        client: { include: { user: { select: { name: true } } } },
        plan: { select: { id: true, name: true, price: true } },
        payments: { select: { amount: true, status: true } },
      },
    }),
    db.plan.findMany({
      where: { gymId: session.gymId, isActive: true },
      orderBy: { price: "desc" },
      select: { id: true, name: true, price: true, durationDays: true, currency: true },
    }),
    getRoster(session.gymId),
    getGymCurrency(session.gymId),
  ]);

  const rows: SubscriptionRow[] = subscriptions.map((s) => ({
    id: s.id,
    clientId: s.clientId,
    clientName: s.client.user.name,
    planId: s.plan.id,
    planName: s.plan.name,
    price: num(s.plan.price) ?? 0,
    startDate: fromDateOnly(s.startDate).toISOString(),
    endDate: fromDateOnly(s.endDate).toISOString(),
    status: s.status,
    autoRenew: s.autoRenew,
    collected: s.payments
      .filter((p) => p.status === "SUCCESSFUL")
      .reduce((a, p) => a + (num(p.amount) ?? 0), 0),
  }));

  const live = rows.filter((r) => r.status === "ACTIVE" || r.status === "TRIAL");
  const expiringSoon = live.filter((r) => {
    const left = differenceInCalendarDays(new Date(r.endDate), new Date());
    return left >= 0 && left <= 14;
  });
  const recurringValue = live.filter((r) => r.autoRenew).reduce((a, r) => a + r.price, 0);

  return (
    <>
      <PageHeader
        title="Memberships"
        description="Who is on which plan, until when, and what it's worth."
        actions={
          <NewSubscriptionButton
            clients={roster.map((c) => ({ id: c.id, name: c.name }))}
            plans={plans.map((p) => ({
              id: p.id,
              name: p.name,
              price: num(p.price) ?? 0,
              durationDays: p.durationDays,
              currency: p.currency,
            }))}
          />
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Live memberships" value={live.length} icon={Repeat} accent />
        <StatCard label="Total subscriptions" value={rows.length} icon={Users} />
        <StatCard
          label="Expiring in 14 days"
          value={expiringSoon.length}
          icon={AlertTriangle}
          hint="worth a renewal conversation"
        />
        <StatCard
          label="Committed to renew"
          value={formatCurrency(recurringValue, currency)}
          hint="auto-renew turned on"
        />
      </div>

      <SubscriptionsTable currency={currency} rows={rows} />
    </>
  );
}
