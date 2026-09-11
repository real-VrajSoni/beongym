import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Payment status", robots: { index: false, follow: false } };

export default async function CheckoutReturnPage({ searchParams }: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");
  // Role may have changed from prospect to owner. Validate the live identity,
  // then scope the receipt to that buyer without mutating cookies during render.
  const buyer = await db.user.findFirst({ where: { id: session.userId, isActive: true }, select: { id: true, sessionVersion: true } });
  if (!buyer || buyer.sessionVersion !== (session.sessionVersion ?? 0) || !orderId || orderId.length > 200) notFound();
  const order = await db.platformOrder.findFirst({ where: { id: orderId, userId: buyer.id },
    select: { id: true, status: true, gymName: true, meta: true, kind: true },
  });
  if (!order) notFound();
  const fulfilled = Boolean((order.meta as Record<string, unknown> | null)?.fulfilledAt);
  const paid = order.status === "PAID";
  const pending = order.status === "PENDING" || (paid && !fulfilled);
  const title = order.status === "REFUNDED" ? "Payment refunded" : paid && fulfilled ? "Your payment is confirmed" :
    paid ? "Payment received; activation pending" : pending ? "Waiting for payment confirmation" : "Payment not confirmed";
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-4 text-muted-foreground">Order {order.id.slice(-8)} for {order.gymName}</p>
      <p className="mt-4 text-sm text-muted-foreground">
        {paid && fulfilled ? "Sign in again to load your updated access." :
          order.kind === "CLAIM" && paid ? "Ownership must be independently verified before this business can be transferred." :
          "Access changes only after verified provider confirmation. If your bank shows a charge, contact support before starting another payment."}
      </p>
      <div className="mt-6 flex justify-center gap-5">
        {paid && fulfilled ? <Link href="/login?paid=1" className="underline">Sign in</Link> :
          <Link href={`/checkout/return?order=${encodeURIComponent(order.id)}`} className="underline">Check status again</Link>}
        <Link href="/contact" className="underline">Contact support</Link>
      </div>
    </main>
  );
}
