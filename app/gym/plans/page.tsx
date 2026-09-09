import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { num } from "@/lib/data/serialize";
import { PageHeader } from "@/components/ui/page-header";
import { PlanGrid, type PlanCardData } from "@/components/plans/plan-grid";
import { CreatePlanButton } from "@/components/plans/plan-form";

export const metadata = { title: "Membership plans" };

export default async function PlansPage() {
  const session = await requireStaff();

  const plans = await db.plan.findMany({
    where: { gymId: session.gymId },
    orderBy: [{ isActive: "desc" }, { price: "desc" }],
    include: {
      subscriptions: {
        select: { status: true, payments: { select: { amount: true, status: true } } },
      },
    },
  });

  const cards: PlanCardData[] = plans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    planType: p.planType,
    billingInterval: p.billingInterval,
    price: num(p.price) ?? 0,
    durationDays: p.durationDays,
    isActive: p.isActive,
    showPrice: p.showPrice,
    subscriptionCount: p.subscriptions.length,
    activeClients: p.subscriptions.filter((s) => s.status === "ACTIVE" || s.status === "TRIAL")
      .length,
    totalRevenue: p.subscriptions.reduce(
      (acc, s) =>
        acc +
        s.payments
          .filter((pay) => pay.status === "SUCCESSFUL")
          .reduce((a, pay) => a + (num(pay.amount) ?? 0), 0),
      0,
    ),
  }));

  return (
    <>
      <div
        className="section-hero mb-6 rounded-[var(--radius-card)] border border-[var(--border)] px-5 py-6 sm:px-7 sm:py-8"
        style={
          {
            "--hero-a": "rgba(143,128,255,0.20)",
            "--hero-b": "rgba(47,198,191,0.13)",
          } as React.CSSProperties
        }
      >
        <PageHeader
          className="mb-0"
          title="Membership plans"
          description="What you sell: the name, the price and how long it runs. Rename, reprice or remove any of these — they're yours."
          actions={<CreatePlanButton />}
        />
      </div>

      <PlanGrid plans={cards} />
    </>
  );
}
