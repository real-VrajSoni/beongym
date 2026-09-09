import Link from "next/link";
import { ArrowRight, Check, Lock, RefreshCw, Timer } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  INCLUDED,
  PURCHASABLE_PLANS,
  accessState,
  daysLeft,
  discountFor,
} from "@/lib/platform-plans";
import { formatDate, formatUsd } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Renew" };

/**
 * Where a lapsed gym lands.
 *
 * The tone here matters: nothing has been taken away, it is only switched off,
 * and one payment turns it back on. Frightening somebody who has already lost
 * access is how you turn a lapse into a cancellation.
 */
export default async function RenewPage() {
  const session = await requireStaff();
  const gym = await db.gym.findUniqueOrThrow({
    where: { id: session.gymId },
    select: {
      name: true,
      code: true,
      city: true,
      accessExpiresAt: true,
      tier: true,
      viewCount: true,
      _count: { select: { members: true, staff: true } },
      links: { select: { clickCount: true } },
    },
  });

  const state = accessState(gym.tier, gym.accessExpiresAt);
  const remaining = daysLeft(gym.accessExpiresAt);
  const clicks = gym.links.reduce((sum, l) => sum + l.clickCount, 0);
  const isOwner = session.role === "GYM_OWNER";

  return (
    <>
      <PageHeader
        title={state === "none" ? "Switch your gym on" : "Your access has run out"}
        description={
          state === "none"
            ? `One payment puts ${gym.name} on the map and opens the workspace.`
            : `${gym.name} is off the map until you renew. Nothing has been deleted.`
        }
      />

      <div className="mb-5 flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-5 py-4">
        <Lock className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" />
        <div>
          <p className="text-[13.5px] font-medium text-[var(--warning)]">
            {state === "expired" && gym.accessExpiresAt
              ? `Expired on ${formatDate(gym.accessExpiresAt)}`
              : "No active membership"}
          </p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
            Your {gym._count.members} member{gym._count.members === 1 ? "" : "s"}, their payments,
            attendance and progress are all exactly where you left them. Renewing brings the whole
            thing back in one click — and puts your pin back on the map, where{" "}
            {gym.viewCount.toLocaleString()} people have already looked you up
            {clicks > 0 ? ` and ${clicks.toLocaleString()} clicked through` : ""}.
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
        {PURCHASABLE_PLANS.map((plan) => {
          return (
            <div
              key={plan.key}
              className={cn(
                "relative flex flex-col rounded-[var(--radius-card)] border p-5 shadow-[var(--shadow-card)]",
                plan.popular
                  ? "border-[var(--brand)] bg-[var(--surface)]"
                  : "border-[var(--brand)]/45 bg-[var(--surface)]",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[15.5px] font-semibold">{plan.name}</h3>
                {plan.bestValue ? (
                  <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-[10.5px] font-semibold tracking-wide text-[var(--brand-foreground)] uppercase">
                    Best value
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <p className="tabular text-[30px] leading-none font-semibold">
                  {formatUsd(plan.price)}
                </p>
                <span className="tabular text-[13px] text-muted-foreground line-through">
                  {formatUsd(plan.listPrice)}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">{plan.per}</p>
              <p className="mt-1.5 text-[12px] font-medium text-[var(--success)]">
                {plan.saving} · {discountFor(plan.key)}% off
              </p>

              <ul className="mt-4 flex-1 space-y-2">
                {INCLUDED.slice(0, 4).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12.5px]">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--success)]" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className="mt-5 w-full"
                variant={plan.popular ? "primary" : "secondary"}
              >
                <Link href="/gym/billing">
                  <RefreshCw />
                  {`Renew · ${plan.days} days`}
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          );
        })}
      </div>

      {!isOwner ? (
        <div className="mt-5">
          <Section title="Ask your owner" bodyClassName="px-5 py-4">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Only the gym owner can renew. Let them know and the floor is back the moment they do.
            </p>
          </Section>
        </div>
      ) : null}

      <div className="mt-5">
        <Section title="Why there is no free plan" bodyClassName="px-5 py-4">
          <p className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted-foreground">
            <Timer className="mt-0.5 size-4 shrink-0 text-[var(--subtle-foreground)]" />
            <span>
              A directory anybody can list in for nothing fills up with gyms that shut two years
              ago, and the ones still trading get buried under them. Every gym on {BRAND.name} has
              paid to be there — {remaining > 0 ? "including yours" : "yours included, when you were on it"} —
              which is what makes the map worth showing to somebody looking for a gym.
            </span>
          </p>
        </Section>
      </div>
    </>
  );
}
