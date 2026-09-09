"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarRange,
  CreditCard,
  Dumbbell,
  Flame,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  Users,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { ClientAvatar } from "@/components/ui/avatar";
import { StatCard } from "@/components/ui/stat-card";
import { Section } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useAction } from "@/components/ui/use-action";
import { AttendanceGrid } from "@/components/attendance/attendance-grid";
import { MemberAppCard } from "./member-app-card";
import { NotesPanel, type NoteItem } from "./notes-panel";
import { ClientFormDialog, type PlanOption } from "./client-form";
import {
  daysUntil,
  formatCurrency,
  formatDate,
  formatDateShort,
  percentElapsed,
} from "@/lib/format";
import { GENDER_LABELS, PAYMENT_METHOD_LABELS, PLAN_TYPE_LABELS, label } from "@/lib/labels";
import { renewSubscriptionAction } from "@/app/actions/subscriptions";

export type DetailData = {
  id: string;
  memberCode: string;
  gymCode: string;
  name: string;
  email: string | null;
  phone: string | null;
  joinedAt: string;
  dateOfBirth: string | null;
  gender: string | null;
  notes: string | null;
  currentSubscription: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    autoRenew: boolean;
    /** What this member was sold, and in what. `plan.price` is the list price. */
    price: number;
    currency: string;
    plan: {
      id: string;
      name: string;
      price: number;
      currency: string;
      durationDays: number;
      planType: string;
    };
    payments: {
      id: string;
      amount: number;
      currency: string;
      paymentDate: string;
      status: string;
      method: string;
    }[];
  } | null;
  subscriptions: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    planName: string;
    price: number;
    currency: string;
  }[];
  visits: { id: string; at: string; out: string | null; source: string }[];
  attendance: { thisMonth: number; total: number; lastVisit: string | null; daysAway: number | null };
  bookings: { id: string; date: string; status: string; className: string; startTime: string }[];
  staffNotes: NoteItem[];
};

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "attendance", label: "Attendance" },
  { value: "classes", label: "Classes" },
  { value: "notes", label: "Notes" },
  { value: "subscription", label: "Subscription" },
];

/**
 * One member, everything the gym keeps about them.
 *
 * Attendance is the progress story here — whether somebody is still turning up
 * is the only number that predicts whether they renew, and it is the one thing
 * the gym records without anybody filling in a form.
 */
export function ClientDetailView({
  client,
  plans,
  defaultTab,
}: {
  client: DetailData;
  plans: PlanOption[];
  defaultTab: string;
}) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState(defaultTab);

  const sub = client.currentSubscription;
  const daysLeft = sub ? daysUntil(sub.endDate) : null;
  const paid = sub
    ? sub.payments.filter((p) => p.status === "SUCCESSFUL").reduce((a, p) => a + p.amount, 0)
    : 0;
  const owed = sub ? Math.max(0, sub.price - paid) : 0;

  return (
    <>
      <div className="mb-5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-5 py-5 shadow-[var(--shadow-card)] sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <ClientAvatar name={client.name} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[22px] leading-tight font-semibold sm:text-[26px]">
                  {client.name}
                </h1>
                {sub ? (
                  <StatusBadge kind="subscription" status={sub.status} />
                ) : (
                  <Badge tone="outline">No programme</Badge>
                )}
                {client.attendance.daysAway !== null && client.attendance.daysAway >= 14 ? (
                  <Badge tone="warning">
                    Not seen in {client.attendance.daysAway} days
                  </Badge>
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
                <span className="font-mono text-[12px]">{client.memberCode}</span>
                {client.email ? (
                  <a
                    href={`mailto:${client.email}`}
                    className="inline-flex items-center gap-1.5 hover:text-foreground"
                  >
                    <Mail className="size-3.5" /> {client.email}
                  </a>
                ) : null}
                {client.phone ? (
                  <a
                    href={`tel:${client.phone}`}
                    className="inline-flex items-center gap-1.5 hover:text-foreground"
                  >
                    <Phone className="size-3.5" /> {client.phone}
                  </a>
                ) : null}
                {sub ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Dumbbell className="size-3.5" />
                    <Link
                      href={`/gym/plans/${sub.plan.id}`}
                      className="hover:text-foreground hover:underline"
                    >
                      {sub.plan.name}
                    </Link>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil /> Edit details
            </Button>
            {sub ? (
              <Button
                loading={pending}
                onClick={() =>
                  run(() => renewSubscriptionAction(sub.id), { onSuccess: () => router.refresh() })
                }
              >
                <RefreshCw /> Renew
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Visits this month"
          value={client.attendance.thisMonth}
          icon={Flame}
          accent
        />
        <StatCard
          label="Last seen"
          value={client.attendance.lastVisit ? formatDateShort(client.attendance.lastVisit) : "—"}
          icon={Users}
          hint={
            client.attendance.daysAway === null
              ? "never checked in"
              : client.attendance.daysAway === 0
                ? "today"
                : `${client.attendance.daysAway} days ago`
          }
        />
        <StatCard
          label="Days left"
          value={daysLeft === null ? "—" : Math.max(0, daysLeft)}
          icon={CalendarRange}
          hint={sub ? `to ${formatDate(sub.endDate)}` : "no live plan"}
        />
        <StatCard
          label="Outstanding"
          value={sub ? formatCurrency(owed, sub.currency) : "—"}
          icon={CreditCard}
          hint={sub ? `${formatCurrency(paid, sub.currency)} paid` : undefined}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview">
          <div className="grid gap-5 lg:grid-cols-2">
            <Section title="Membership">
              {sub ? (
                <div className="px-5 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[15px] font-semibold">{sub.plan.name}</p>
                    <p className="tabular text-[14px] font-semibold">
                      {formatCurrency(sub.price, sub.currency)}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                    {label(PLAN_TYPE_LABELS, sub.plan.planType)} · {sub.plan.durationDays} days
                  </p>
                  <ProgressBar
                    className="mt-4"
                    value={percentElapsed(sub.startDate, sub.endDate)}
                    showLabel
                    label={`${formatDate(sub.startDate)} → ${formatDate(sub.endDate)}`}
                  />
                  {daysLeft !== null ? (
                    <p className="mt-2 text-[12.5px] text-muted-foreground">
                      {daysLeft >= 0
                        ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining`
                        : `Ended ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} ago`}
                      {sub.autoRenew ? " · auto-renews" : ""}
                    </p>
                  ) : null}
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={Dumbbell}
                  title="No active programme"
                  description="Start a subscription to put this member on a plan."
                />
              )}
            </Section>

            <Section title="Details" bodyClassName="px-0 py-0">
              <dl className="divide-y divide-[var(--border)]">
                <div className="px-5 py-3.5">
                  <dt className="text-[12px] text-muted-foreground">Member since</dt>
                  <dd className="mt-1 text-[13.5px] font-medium">{formatDate(client.joinedAt)}</dd>
                </div>
                <div className="px-5 py-3.5">
                  <dt className="text-[12px] text-muted-foreground">Date of birth</dt>
                  <dd className="mt-1 text-[13.5px] font-medium">
                    {client.dateOfBirth ? formatDate(client.dateOfBirth) : "—"}
                  </dd>
                </div>
                <div className="px-5 py-3.5">
                  <dt className="text-[12px] text-muted-foreground">Gender</dt>
                  <dd className="mt-1 text-[13.5px] font-medium">
                    {client.gender ? label(GENDER_LABELS, client.gender) : "—"}
                  </dd>
                </div>
                <div className="px-5 py-3.5">
                  <dt className="text-[12px] text-muted-foreground">Total visits</dt>
                  <dd className="tabular mt-1 text-[13.5px] font-medium">
                    {client.attendance.total} in the last year
                  </dd>
                </div>
              </dl>
            </Section>

            <div className="lg:col-span-2">
              <Section title="Attendance" description="Every day they scanned in">
                <div className="px-5 py-4">
                  <AttendanceGrid visits={client.visits} />
                </div>
              </Section>
            </div>

            <MemberAppCard
              clientId={client.id}
              memberCode={client.memberCode}
              gymCode={client.gymCode}
              canEdit
            />
          </div>
        </TabsContent>

        {/* ── Attendance ── */}
        <TabsContent value="attendance">
          <div className="space-y-5">
            <Section title="The last year">
              <div className="px-5 py-4">
                <AttendanceGrid visits={client.visits} />
              </div>
            </Section>

            <Section title="Recent visits" bodyClassName="px-0 py-0">
              {client.visits.length === 0 ? (
                <EmptyState
                  compact
                  icon={Flame}
                  title="No visits recorded"
                  description="Visits appear here when they scan the gym's QR code, or when the desk checks them in."
                />
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {client.visits.slice(0, 25).map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div>
                        <p className="text-[13.5px] font-medium">{formatDate(v.at)}</p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          {new Date(v.at).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {v.out
                            ? ` → ${new Date(v.out).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                            : " · still inside"}
                        </p>
                      </div>
                      <Badge tone="outline">
                        {v.source === "MEMBER_APP" ? "Scanned in" : "Front desk"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </TabsContent>

        {/* ── Classes ── */}
        <TabsContent value="classes">
          <Section title="Class bookings" bodyClassName="px-0 py-0">
            {client.bookings.length === 0 ? (
              <EmptyState
                compact
                icon={CalendarRange}
                title="No bookings"
                description="Classes this member books from the app show up here."
              />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {client.bookings.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div>
                      <p className="text-[13.5px] font-medium">{b.className}</p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">
                        {formatDate(b.date)} · {b.startTime}
                      </p>
                    </div>
                    <Badge
                      tone={
                        b.status === "ATTENDED"
                          ? "success"
                          : b.status === "NO_SHOW"
                            ? "danger"
                            : b.status === "WAITLIST"
                              ? "warning"
                              : "info"
                      }
                    >
                      {b.status.toLowerCase().replace("_", " ")}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </TabsContent>

        {/* ── Notes ── */}
        <TabsContent value="notes">
          <NotesPanel clientId={client.id} notes={client.staffNotes} />
        </TabsContent>

        {/* ── Subscription history ── */}
        <TabsContent value="subscription">
          <div className="space-y-5">
            <Section title="Payments" bodyClassName="px-0 py-0">
              {!sub || sub.payments.length === 0 ? (
                <EmptyState
                  compact
                  icon={CreditCard}
                  title="Nothing recorded"
                  description="Payments you record against this membership appear here."
                />
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {sub.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div>
                        <p className="text-[13.5px] font-medium">
                          {formatCurrency(p.amount, p.currency)}
                        </p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          {formatDate(p.paymentDate)} · {label(PAYMENT_METHOD_LABELS, p.method)}
                        </p>
                      </div>
                      <StatusBadge kind="payment" status={p.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="History" bodyClassName="px-0 py-0">
              <ul className="divide-y divide-[var(--border)]">
                {client.subscriptions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div>
                      <p className="text-[13.5px] font-medium">{s.planName}</p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">
                        {formatDate(s.startDate)} → {formatDate(s.endDate)}
                      </p>
                    </div>
                    <StatusBadge kind="subscription" status={s.status} />
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        </TabsContent>
      </Tabs>

      <ClientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        plans={plans}
        client={{
          clientId: client.id,
          name: client.name,
          email: client.email ?? "",
          phone: client.phone ?? "",
          gender: client.gender ?? "",
          dateOfBirth: client.dateOfBirth?.slice(0, 10) ?? "",
        }}
      />
    </>
  );
}
