import { AlertCircle, CheckCircle2, Clock, IndianRupee } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRevenueSeries, getGymCurrency } from "@/lib/data/gym";
import { num } from "@/lib/data/serialize";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Section } from "@/components/ui/section";
import { RevenueChart } from "@/components/charts/revenue-chart";
import {
  PaymentsTable,
  RecordPaymentButton,
  type PaymentRow,
} from "@/components/payments/payments-view";

export const metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const session = await requireStaff();

  const [payments, subscriptions, revenue, currency] = await Promise.all([
    db.payment.findMany({
      where: { subscription: { plan: { gymId: session.gymId } } },
      orderBy: { paymentDate: "desc" },
      include: {
        subscription: {
          include: {
            plan: { select: { name: true } },
            client: { include: { user: { select: { name: true } } } },
          },
        },
      },
    }),
    db.subscription.findMany({
      where: { plan: { gymId: session.gymId }, status: { in: ["ACTIVE", "TRIAL", "PAUSED"] } },
      orderBy: { startDate: "desc" },
      include: {
        plan: { select: { name: true, price: true } },
        client: { include: { user: { select: { name: true } } } },
      },
    }),
    getRevenueSeries(session.gymId, 6),
    getGymCurrency(session.gymId),
  ]);

  const rows: PaymentRow[] = payments.map((p) => ({
    id: p.id,
    clientId: p.subscription.clientId,
    clientName: p.subscription.client.user.name,
    planName: p.subscription.plan.name,
    amount: num(p.amount) ?? 0,
    paymentDate: p.paymentDate.toISOString(),
    paymentMethod: p.paymentMethod,
    status: p.status,
    transactionId: p.transactionId,
  }));

  const total = (status: string) =>
    rows.filter((r) => r.status === status).reduce((a, r) => a + r.amount, 0);

  return (
    <>
      <PageHeader
        title="Payments"
        description="Revenue and every transaction recorded against your programmes."
        actions={
          <RecordPaymentButton
            currency={currency}
            subscriptions={subscriptions.map((s) => ({
              id: s.id,
              labelText: `${s.client.user.name} — ${s.plan.name}`,
              price: num(s.plan.price) ?? 0,
            }))}
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total revenue"
          value={formatCurrency(total("SUCCESSFUL"), currency)}
          icon={IndianRupee}
          accent
          hint="successful payments"
        />
        <StatCard
          label="Successful"
          value={rows.filter((r) => r.status === "SUCCESSFUL").length}
          icon={CheckCircle2}
          hint={formatCurrency(total("SUCCESSFUL"), currency)}
        />
        <StatCard
          label="Pending"
          value={rows.filter((r) => r.status === "PENDING").length}
          icon={Clock}
          hint={formatCurrency(total("PENDING"), currency)}
        />
        <StatCard
          label="Failed"
          value={rows.filter((r) => r.status === "FAILED").length}
          icon={AlertCircle}
          hint={formatCurrency(total("FAILED"), currency)}
        />
      </div>

      <div className="mt-5 mb-5">
        <Section title="Revenue" description="Successful payments over the last six months">
          <div className="px-3 pt-4 pb-2">
            <RevenueChart
              currency={currency}
              data={revenue.map((r) => ({ month: r.month.toISOString(), revenue: r.revenue }))}
            />
          </div>
        </Section>
      </div>

      <h2 className="mb-3 text-[15px] font-semibold">Transactions</h2>
      <PaymentsTable currency={currency} rows={rows} />

      <p className="mt-4 text-[12.5px] text-muted-foreground">
        Payments are recorded manually in this release — no gateway is connected. Each row is a real
        database record used for revenue reporting.
      </p>
    </>
  );
}
