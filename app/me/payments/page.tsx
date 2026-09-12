import { notFound } from "next/navigation";
import { CircleAlert, Receipt } from "lucide-react";
import { requirePaidMember } from "@/lib/auth";
import { getMemberHome } from "@/lib/data/member";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { formatCurrency, formatDate } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, label } from "@/lib/labels";
import { DEFAULT_CURRENCY } from "@/lib/geo/currency";

export const metadata = { title: "Payments" };

export default async function MemberPaymentsPage() {
  const session = await requirePaidMember();
  const me = await getMemberHome(session.profileId);
  if (!me) notFound();

  const m = me.membership;
  const paidTotal = me.payments
    .filter((p) => p.status === "SUCCESSFUL")
    .reduce((sum, p) => sum + p.amount, 0);
  const currency = m?.currency ?? me.payments[0]?.currency ?? DEFAULT_CURRENCY;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">Payments</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          What you have paid {me.gym.name}, and anything still owed on your membership.
        </p>
      </div>

      {m && m.outstanding > 0 ? (
        <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--warning)]/25 bg-[var(--warning-soft)] px-5 py-4">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" />
          <div>
            <p className="text-[14px] font-semibold text-[var(--warning)]">
              {formatCurrency(m.outstanding, m.currency)} outstanding on {m.planName}
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              Pay it at the desk and your gym records it — it appears here straight away. Paying
              from this screen arrives with online payments; nothing here can charge a card today,
              and no screen will pretend otherwise.
            </p>
          </div>
        </div>
      ) : null}

      <Section
        title="Receipts"
        description={`${formatCurrency(paidTotal, currency)} paid in total`}
        bodyClassName="px-0 py-0"
      >
        {me.payments.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Nothing recorded yet"
            description="Payments your gym records against your membership show up here, with the date and how you paid."
          />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {me.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium">{p.planName}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {formatDate(p.date)} · {label(PAYMENT_METHOD_LABELS, p.method)}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge kind="payment" status={p.status} />
                  <p className="tabular text-[13.5px] font-semibold">
                    {formatCurrency(p.amount, p.currency)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {me.pastMemberships.length > 0 ? (
        <Section title="Past memberships" bodyClassName="px-0 py-0">
          <ul className="divide-y divide-[var(--border)]">
            {me.pastMemberships.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium">{s.planName}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {formatDate(s.startDate)} → {formatDate(s.endDate)}
                  </p>
                </div>
                <StatusBadge kind="subscription" status={s.status} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
