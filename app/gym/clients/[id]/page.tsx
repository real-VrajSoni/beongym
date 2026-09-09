import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getClientDetail } from "@/lib/data/client-detail";
import { num } from "@/lib/data/serialize";
import { ClientDetailView, type DetailData } from "@/components/clients/client-detail-view";

const VALID_TABS = ["overview", "attendance", "classes", "notes", "subscription"];

/**
 * Ownership is checked here as well as in the page body. generateMetadata runs
 * before the response starts streaming, so notFound() from here produces a real
 * 404 rather than a 200 with a not-found body.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff();
  const { id } = await params;
  const client = await db.clientProfile.findFirst({
    where: { id, gymId: session.gymId },
    select: { user: { select: { name: true } } },
  });
  if (!client) notFound();
  return { title: client.user.name };
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireStaff();
  const { id } = await params;
  const { tab } = await searchParams;

  const [detail, plans] = await Promise.all([
    getClientDetail(session.gymId, id),
    db.plan.findMany({
      where: { gymId: session.gymId, isActive: true },
      orderBy: { price: "desc" },
      select: { id: true, name: true, price: true, durationDays: true, currency: true },
    }),
  ]);

  if (!detail) notFound();

  // Serialise dates for the client component boundary.
  const data: DetailData = {
    ...detail,
    gymCode: session.gymCode ?? "",
    joinedAt: detail.joinedAt.toISOString(),
    dateOfBirth: detail.dateOfBirth?.toISOString() ?? null,
    currentSubscription: detail.currentSubscription
      ? {
          ...detail.currentSubscription,
          startDate: detail.currentSubscription.startDate.toISOString(),
          endDate: detail.currentSubscription.endDate.toISOString(),
          payments: detail.currentSubscription.payments.map((p) => ({
            ...p,
            paymentDate: p.paymentDate.toISOString(),
          })),
        }
      : null,
    subscriptions: detail.subscriptions.map((s) => ({
      ...s,
      startDate: s.startDate.toISOString(),
      endDate: s.endDate.toISOString(),
    })),
    visits: detail.visits.map((v) => ({
      ...v,
      at: v.at.toISOString(),
      out: v.out?.toISOString() ?? null,
    })),
    attendance: {
      ...detail.attendance,
      lastVisit: detail.attendance.lastVisit?.toISOString() ?? null,
    },
    bookings: detail.bookings.map((b) => ({ ...b, date: b.date.toISOString() })),
    staffNotes: detail.staffNotes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
  };

  return (
    <ClientDetailView
      client={data}
      plans={plans.map((p) => ({
        id: p.id,
        name: p.name,
        price: num(p.price) ?? 0,
        durationDays: p.durationDays,
        currency: p.currency,
      }))}
      defaultTab={tab && VALID_TABS.includes(tab) ? tab : "overview"}
    />
  );
}
