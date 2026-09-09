import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarClock,
  CircleAlert,
  Clock,
  Flame,
  MapPin,
  Phone,
  Target,
  UserRound,
} from "lucide-react";
import { requireMember } from "@/lib/auth";
import { getMemberHome } from "@/lib/data/member";
import { GymLinks } from "@/components/directory/gym-links";
import { Section } from "@/components/ui/section";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatCurrency, formatDate, formatDateShort, daysUntil, percentElapsed } from "@/lib/format";
import { label, PLAN_TYPE_LABELS } from "@/lib/labels";

export const metadata = { title: "Home" };

export default async function MemberHomePage() {
  const session = await requireMember();
  const me = await getMemberHome(session.profileId);
  if (!me) notFound();

  const m = me.membership;
  const left = m ? daysUntil(m.endDate) : 0;
  const elapsed = m ? percentElapsed(m.startDate, m.endDate) : 0;

  const thisMonth = me.visits.filter((v) => {
    const d = new Date(v.at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const lastVisit = me.visits[0]?.at ?? null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] leading-tight font-semibold tracking-[-0.02em]">
          Hello, {me.name.split(" ")[0]}.
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Your membership, your attendance and what you owe — all of it read from your gym&rsquo;s
          own records.
        </p>
      </div>

      {/* The membership. The one thing a member opens this app to check. */}
      {m ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[16px] font-semibold">{m.planName}</p>
                <StatusBadge kind="subscription" status={m.status} />
              </div>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                {label(PLAN_TYPE_LABELS, m.planType)} · started {formatDateShort(m.startDate)}
              </p>
            </div>
            <div className="text-right">
              <p className="tabular text-[22px] leading-none font-semibold">{Math.max(0, left)}</p>
              <p className="mt-1 text-[11.5px] text-muted-foreground">
                {left === 1 ? "day left" : "days left"}
              </p>
            </div>
          </div>

          <ProgressBar value={elapsed} className="mt-4" />
          <p className="mt-2 text-[12px] text-muted-foreground">
            Runs to {formatDate(m.endDate)}
            {m.autoRenew ? " · renews automatically" : ""}
          </p>

          {m.outstanding > 0 ? (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[var(--warning)]/25 bg-[var(--warning-soft)] px-4 py-3">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" />
              <div>
                <p className="text-[13px] font-medium text-[var(--warning)]">
                  {formatCurrency(m.outstanding, m.currency)} outstanding
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  Settle it at the desk on your next visit — online payment is coming, and until it
                  lands nothing here can take your money.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
          <EmptyState
            icon={CalendarClock}
            title="No live membership"
            description="Your gym hasn't got an active plan against your name. Have a word at the desk and it will show up here."
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Visits this month" value={thisMonth} icon={Flame} accent />
        <StatCard
          label="Last visit"
          value={lastVisit ? formatDateShort(lastVisit) : "—"}
          icon={Clock}
        />
        <StatCard
          label="Visits all year"
          value={me.visits.length}
          icon={Target}
          hint="every day you scanned in"
        />
        <StatCard
          label="Member since"
          value={formatDateShort(me.memberSince)}
          icon={UserRound}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {me.coach ? (
        <Section title="Your coach" bodyClassName="px-5 py-4">
          <p className="text-[13.5px] font-medium">{me.coach.name}</p>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            {me.coach.title ?? "Coach"} at {me.gym.name}
          </p>

        </Section>
      ) : null}

      <Section title="Your gym" bodyClassName="px-5 py-4">
        <div className="space-y-2.5 text-[13px]">
          {me.gym.address ? (
            <p className="flex items-start gap-2.5 text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              {me.gym.address}
            </p>
          ) : null}
          {me.gym.openingHours ? (
            <p className="flex items-start gap-2.5 text-muted-foreground">
              <Clock className="mt-0.5 size-3.5 shrink-0" />
              {me.gym.openingHours}
            </p>
          ) : null}
          {me.gym.phone ? (
            <p className="flex items-start gap-2.5 text-muted-foreground">
              <Phone className="mt-0.5 size-3.5 shrink-0" />
              <a href={`tel:${me.gym.phone.replace(/\s/g, "")}`} className="hover:underline">
                {me.gym.phone}
              </a>
            </p>
          ) : null}
        </div>

        {me.gym.links.length > 0 ? <GymLinks links={me.gym.links} size="sm" className="mt-4" /> : null}

        <p className="mt-4 border-t border-[var(--border)] pt-3 text-[12px] leading-relaxed text-muted-foreground">
          Book a class from the app; anything else — personal training, a change of plan — is a
          word at the desk. Everything your gym records shows up here.
        </p>
      </Section>

      <p className="text-center text-[12px] text-[var(--subtle-foreground)]">
        Something wrong on this page?{" "}
        <Link href="/me/payments" className="text-[var(--brand)] hover:underline">
          Check your payments
        </Link>{" "}
        or ask at the desk — your gym can correct any of it.
      </p>
    </div>
  );
}
