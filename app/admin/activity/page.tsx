import Link from "next/link";
import { Building2, ClipboardCheck, CreditCard, Repeat, UserPlus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, relativeTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export const metadata = { title: "Activity" };

const ICONS = {
  gym: { icon: Building2, className: "bg-[var(--brand-soft)] text-[var(--brand-soft-foreground)]" },
  user: { icon: UserPlus, className: "bg-[var(--info-soft)] text-[var(--info)]" },
  payment: { icon: CreditCard, className: "bg-[var(--success-soft)] text-[var(--success)]" },
  subscription: { icon: Repeat, className: "bg-[var(--warning-soft)] text-[var(--warning)]" },
  checkin: { icon: ClipboardCheck, className: "bg-[var(--surface-muted)] text-muted-foreground" },
} as const;

export default async function AdminActivityPage() {
  await requireAdmin();

  const [gyms, users, payments, subscriptions] = await Promise.all([
    db.gym.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, name: true, city: true, createdAt: true },
    }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      where: { role: { not: "SUPER_ADMIN" } },
      select: {
        id: true,
        name: true,
        role: true,
        createdAt: true,
        gym: { select: { id: true, name: true } },
      },
    }),
    db.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        subscription: {
          select: {
            plan: { select: { name: true, gym: { select: { id: true, name: true } } } },
            client: { select: { user: { select: { name: true } } } },
          },
        },
      },
    }),
    db.subscription.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        plan: { select: { name: true, gym: { select: { id: true, name: true } } } },
        client: { select: { user: { select: { name: true } } } },
      },
    }),
  ]);

  type Item = {
    id: string;
    kind: keyof typeof ICONS;
    at: Date;
    text: React.ReactNode;
    gym: { id: string; name: string } | null;
  };

  const items: Item[] = [
    ...gyms.map((g) => ({
      id: `gym-${g.id}`,
      kind: "gym" as const,
      at: g.createdAt,
      gym: { id: g.id, name: g.name },
      text: (
        <>
          <span className="font-medium">{g.name}</span> joined the platform
          {g.city ? ` from ${g.city}` : ""}
        </>
      ),
    })),
    ...users.map((u) => ({
      id: `user-${u.id}`,
      kind: "user" as const,
      at: u.createdAt,
      gym: u.gym ? { id: u.gym.id, name: u.gym.name } : null,
      text: (
        <>
          <span className="font-medium">{u.name}</span> joined as{" "}
          {u.role === "GYM_OWNER" ? "an owner" : u.role === "GYM_STAFF" ? "staff" : "a member"}
        </>
      ),
    })),
    ...payments.map((p) => ({
      id: `pay-${p.id}`,
      kind: "payment" as const,
      at: p.createdAt,
      gym: p.subscription.plan.gym ? { id: p.subscription.plan.gym.id, name: p.subscription.plan.gym.name } : null,
      text: (
        <>
          <span className="font-medium">{p.subscription.client.user.name}</span>{" "}
          {p.status === "SUCCESSFUL" ? "paid" : p.status === "FAILED" ? "failed to pay" : "owes"}{" "}
          {formatCurrency(Number(p.amount))} for {p.subscription.plan.name}
        </>
      ),
    })),
    ...subscriptions.map((s) => ({
      id: `sub-${s.id}`,
      kind: "subscription" as const,
      at: s.createdAt,
      gym: s.plan.gym ? { id: s.plan.gym.id, name: s.plan.gym.name } : null,
      text: (
        <>
          <span className="font-medium">{s.client.user.name}</span> started {s.plan.name}
        </>
      ),
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 60);

  return (
    <>
      <PageHeader
        title="Activity"
        description="Everything happening across every gym, newest first."
      />

      <Section title="Platform feed" bodyClassName="pb-2">
        {items.length === 0 ? (
          <EmptyState icon={Building2} title="Nothing yet" />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {items.map((item) => {
              const meta = ICONS[item.kind];
              const Icon = meta.icon;
              return (
                <li key={item.id} className="flex items-start gap-3.5 px-5 py-3.5">
                  <span
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                      meta.className,
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug">{item.text}</p>
                    <p className="mt-0.5 text-[11.5px] text-[var(--subtle-foreground)]">
                      {relativeTime(item.at)}
                      {item.gym ? (
                        <>
                          {" · "}
                          <Link
                            href={`/admin/gyms/${item.gym.id}`}
                            className="hover:text-foreground hover:underline"
                          >
                            {item.gym.name}
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
