import Link from "next/link";
import { notFound } from "next/navigation";
import { Apple, Banknote, Dumbbell, Users } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { num } from "@/lib/data/serialize";
import { formatCurrency, formatDate, fromDateOnly } from "@/lib/format";
import { BILLING_LABELS, DAY_LABELS, PLAN_TYPE_LABELS, label } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { ClientAvatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PlanActions } from "@/components/plans/plan-actions";
import { DietPlanButton, WorkoutPlanButton } from "@/components/plans/attachment-forms";

/** Runs before streaming begins, so an unowned plan returns a real 404. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff();
  const { id } = await params;
  const plan = await db.plan.findFirst({
    where: { id, gymId: session.gymId },
    select: { name: true },
  });
  if (!plan) notFound();
  return { title: plan.name };
}

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff();
  const { id } = await params;

  const plan = await db.plan.findFirst({
    where: { id, gymId: session.gymId },
    include: {
      workoutPlans: {
        include: {
          days: {
            orderBy: { sortOrder: "asc" },
            include: { exercises: { orderBy: { sortOrder: "asc" } } },
          },
        },
      },
      dietPlans: { include: { meals: { orderBy: { sortOrder: "asc" } } } },
      subscriptions: {
        orderBy: { startDate: "desc" },
        include: {
          client: { include: { user: { select: { name: true, email: true } } } },
          payments: { select: { amount: true, status: true } },
        },
      },
    },
  });

  if (!plan) notFound();

  const price = num(plan.price) ?? 0;
  const activeSubs = plan.subscriptions.filter(
    (s) => s.status === "ACTIVE" || s.status === "TRIAL",
  );
  const revenue = plan.subscriptions.reduce(
    (acc, s) =>
      acc +
      s.payments
        .filter((p) => p.status === "SUCCESSFUL")
        .reduce((a, p) => a + (num(p.amount) ?? 0), 0),
    0,
  );
  const workout = plan.workoutPlans[0] ?? null;
  const diet = plan.dietPlans[0] ?? null;

  return (
    <>
      <header className="mb-6">
        <Link
          href="/gym/plans"
          className="mb-4 inline-block text-[12.5px] text-muted-foreground hover:text-foreground"
        >
          ← All programmes
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[22px] leading-tight font-semibold sm:text-[26px]">
                {plan.name}
              </h1>
              {plan.isActive ? (
                <Badge tone="success" dot>
                  Active
                </Badge>
              ) : (
                <Badge tone="outline">Archived</Badge>
              )}
            </div>
            <p className="mt-1.5 text-[13.5px] text-muted-foreground">
              {label(PLAN_TYPE_LABELS, plan.planType)} ·{" "}
              {label(BILLING_LABELS, plan.billingInterval)} · {plan.durationDays} days
            </p>
            {plan.description ? (
              <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
                {plan.description}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <PlanActions
              currency={plan.currency}
              plan={{
                planId: plan.id,
                name: plan.name,
                description: plan.description ?? "",
                planType: plan.planType,
                price,
                durationDays: plan.durationDays,
                billingInterval: plan.billingInterval,
                isActive: plan.isActive,
                showPrice: plan.showPrice,
              }}
              subscriberCount={plan.subscriptions.length}
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Price"
          value={formatCurrency(price, plan.currency)}
          icon={Banknote}
          accent
        />
        <StatCard label="Active clients" value={activeSubs.length} icon={Users} />
        <StatCard label="Total subscriptions" value={plan.subscriptions.length} />
        <StatCard label="Revenue collected" value={formatCurrency(revenue, plan.currency)} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Section
          title="Workout plan"
          description={workout ? workout.name : "Nothing attached yet"}
          action={<WorkoutPlanButton planId={plan.id} workoutPlan={workout} />}
        >
          {workout ? (
            <div className="px-5 py-4">
              {workout.description ? (
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {workout.description}
                </p>
              ) : null}

              {workout.days.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {workout.days.map((day) => (
                    <details
                      key={day.id}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                        <span>
                          <span className="text-[13.5px] font-medium">{day.title}</span>
                          <span className="ml-2 text-[12px] text-muted-foreground">
                            {DAY_LABELS[day.dayOfWeek] ?? ""}
                            {day.focus ? ` · ${day.focus}` : ""}
                          </span>
                        </span>
                        <span className="tabular text-[12px] text-[var(--subtle-foreground)]">
                          {day.exercises.length} exercises
                        </span>
                      </summary>
                      <ul className="mt-3 space-y-1.5 border-t border-[var(--border)] pt-3">
                        {day.exercises.map((ex) => (
                          <li key={ex.id} className="flex items-baseline justify-between gap-3">
                            <span className="text-[13px]">{ex.name}</span>
                            <span className="tabular shrink-0 text-[12.5px] text-muted-foreground">
                              {ex.sets} × {ex.reps}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                  <p className="text-[12px] text-[var(--subtle-foreground)]">
                    Exercise-level editing isn&rsquo;t in this release — days and exercises are
                    seeded data shown read-only. The plan name and description above are editable.
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState
              compact
              icon={Dumbbell}
              title="No workout plan"
              description="Attach the training template clients on this programme should follow."
            />
          )}
        </Section>

        <Section
          title="Nutrition plan"
          description={diet ? diet.name : "Nothing attached yet"}
          action={<DietPlanButton planId={plan.id} dietPlan={diet} />}
        >
          {diet ? (
            <div className="px-5 py-4">
              <div className="grid grid-cols-4 gap-2.5">
                {(
                  [
                    ["Calories", diet.caloriesTarget, "kcal"],
                    ["Protein", diet.proteinTarget, "g"],
                    ["Carbs", diet.carbsTarget, "g"],
                    ["Fats", diet.fatsTarget, "g"],
                  ] as const
                ).map(([term, value, unit]) => (
                  <div key={term} className="rounded-lg bg-[var(--surface-muted)] px-3 py-2.5">
                    <p className="text-[11px] tracking-wide text-[var(--subtle-foreground)] uppercase">
                      {term}
                    </p>
                    <p className="tabular mt-0.5 text-[14px] font-semibold">
                      {value ?? "—"}
                      <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">
                        {value !== null ? unit : ""}
                      </span>
                    </p>
                  </div>
                ))}
              </div>

              {diet.description ? (
                <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
                  {diet.description}
                </p>
              ) : null}

              {diet.meals.length > 0 ? (
                <ul className="mt-4 space-y-2.5 border-t border-[var(--border)] pt-4">
                  {diet.meals.map((meal) => (
                    <li key={meal.id}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-[13px] font-medium">{meal.title}</p>
                        <p className="tabular shrink-0 text-[12px] text-muted-foreground">
                          {meal.timing ?? ""}
                        </p>
                      </div>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                        {meal.description}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <EmptyState
              compact
              icon={Apple}
              title="No nutrition plan"
              description="Set daily macro targets and meal guidance for this programme."
            />
          )}
        </Section>
      </div>

      <div className="mt-5">
        <Section
          title="Subscribers"
          description={`${plan.subscriptions.length} subscription${plan.subscriptions.length === 1 ? "" : "s"} on this programme`}
        >
          {plan.subscriptions.length === 0 ? (
            <EmptyState
              compact
              icon={Users}
              title="Nobody subscribed yet"
              description="Add a client and choose this programme to get started."
            />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {plan.subscriptions.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                  <ClientAvatar name={s.client.user.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/gym/clients/${s.clientId}`}
                      className="block truncate text-[13.5px] font-medium hover:underline"
                    >
                      {s.client.user.name}
                    </Link>
                    <p className="tabular text-[12px] text-muted-foreground">
                      {formatDate(fromDateOnly(s.startDate))} →{" "}
                      {formatDate(fromDateOnly(s.endDate))}
                    </p>
                  </div>
                  <StatusBadge kind="subscription" status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
