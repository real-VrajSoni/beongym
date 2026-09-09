import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { LeadsView } from "@/components/leads/leads-view";

export const metadata = { title: "Enquiries" };

export default async function LeadsPage() {
  const session = await requireStaff();

  const leads = await db.lead.findMany({
    where: { gymId: session.gymId },
    orderBy: { createdAt: "desc" },
    include: {
      activity: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  return (
    <>
      <PageHeader
        title="Enquiries"
        description="Everyone who asked about joining, who owes them a call, and how many of them became members."
      />
      <LeadsView
        leads={leads.map((l) => ({
          id: l.id,
          name: l.name,
          phone: l.phone,
          email: l.email,
          source: l.source as string,
          status: l.status as string,
          interest: l.interest,
          notes: l.notes,
          nextFollowUpAt: l.nextFollowUpAt?.toISOString() ?? null,
          joinedAt: l.joinedAt?.toISOString() ?? null,
          lostReason: l.lostReason,
          createdAt: l.createdAt.toISOString(),
          activity: l.activity.map((a) => ({
            id: a.id,
            note: a.note,
            createdAt: a.createdAt.toISOString(),
          })),
        }))}
      />
    </>
  );
}
