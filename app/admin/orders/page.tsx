import { CheckCircle2, Clock, CreditCard, DollarSign } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { num } from "@/lib/data/serialize";
import { formatDateTime, formatUsd } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { OrdersTable, type OrderRow } from "@/components/admin/orders-table";

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage() {
  await requireAdmin();

  const orders = await db.platformOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      gym: { select: { id: true, name: true, code: true } },
    },
  });

  const rows: OrderRow[] = orders.map((o) => ({
    id: o.id,
    // A map listing can be bought before there is an account to attribute it
    // to, so the buyer's email on the order stands in for the user.
    userId: o.user?.id ?? null,
    userName: o.user?.name ?? "No account yet",
    userEmail: o.user?.email ?? o.email ?? "—",
    gymId: o.gym?.id ?? null,
    gymName: o.gym?.name ?? o.gymName,
    gymCode: o.gym?.code ?? null,
    tier: o.tier,
    billingCycle: o.billingCycle,
    amount: num(o.amount) ?? 0,
    status: o.status,
    provider: o.provider,
    providerRef: o.providerRef,
    createdAt: formatDateTime(o.createdAt),
    paidAt: o.paidAt ? formatDateTime(o.paidAt) : null,
  }));

  const paid = rows.filter((r) => r.status === "PAID");
  const booked = paid.reduce((a, r) => a + r.amount, 0);

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every plan purchase, who made it, and the gym it created."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Orders" value={rows.length} icon={CreditCard} accent />
        <StatCard label="Paid" value={paid.length} icon={CheckCircle2} />
        <StatCard
          label="Pending"
          value={rows.filter((r) => r.status === "PENDING").length}
          icon={Clock}
        />
        <StatCard label="Booked revenue" value={formatUsd(booked)} icon={DollarSign} />
      </div>

      <OrdersTable rows={rows} />

      <p className="mt-4 text-[12.5px] text-muted-foreground">
        Orders marked <span className="font-mono">manual</span> were activated without a gateway.
        Once Razorpay or Dodo is connected, the provider and its reference land in these columns.
      </p>
    </>
  );
}
