import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRoster } from "@/lib/data/gym";
import { num } from "@/lib/data/serialize";
import { PageHeader } from "@/components/ui/page-header";
import { ClientsView, type RosterRow } from "@/components/clients/clients-view";
import { AddClientButton } from "@/components/clients/clients-view";

export const metadata = { title: "Clients" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; name?: string; email?: string; phone?: string }>;
}) {
  const session = await requireStaff();
  const params = await searchParams;
  const [roster, plans] = await Promise.all([
    getRoster(session.gymId),
    db.plan.findMany({
      where: { gymId: session.gymId, isActive: true },
      orderBy: { price: "desc" },
      select: { id: true, name: true, price: true, durationDays: true, currency: true },
    }),
  ]);

  const rows: RosterRow[] = roster.map((c) => ({
    id: c.id,
    memberCode: c.memberCode,
    name: c.name,
    email: c.email,
    phone: c.phone,
    program: c.program?.name ?? null,
    status: c.status,
    startDate: c.startDate?.toISOString() ?? null,
    endDate: c.endDate?.toISOString() ?? null,
    lastVisit: c.lastVisit?.toISOString() ?? null,
    visitsThisMonth: c.visitsThisMonth,
    daysAway: c.daysAway,
    programProgress: c.programProgress,
  }));

  const planOptions = plans.map((p) => ({
    id: p.id,
    name: p.name,
    price: num(p.price) ?? 0,
    durationDays: p.durationDays,
    currency: p.currency,
  }));

  return (
    <>
      <PageHeader
        title="Members"
        description={`${roster.length} people on your roster, each with their own member code.`}
        actions={
          <div className="hidden lg:block">
            <AddClientButton plans={planOptions} />
          </div>
        }
      />
      <ClientsView
        rows={rows}
        plans={planOptions}
        prefill={
          params.new
            ? { name: params.name, email: params.email, phone: params.phone }
            : undefined
        }
      />
    </>
  );
}
