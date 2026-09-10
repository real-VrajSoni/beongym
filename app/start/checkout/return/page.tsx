import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock } from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { reissueFor } from "@/lib/payments/checkout";

export const metadata = { title: "Confirming your payment" };

/**
 * Where the browser lands after paying.
 *
 * It grants nothing. Reaching this URL is not proof of payment — anyone can
 * type it — so the page reads the order the webhook writes and reports what it
 * finds. That separation is the whole point of the design: the only thing that
 * moves access is a verified `subscription.active`.
 *
 * A webhook usually beats the redirect back, but not always, so a still-pending
 * order is normal rather than an error. The page refreshes itself and says so
 * plainly instead of showing a spinner that means nothing.
 */
export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; status?: string }>;
}) {
  const { order: orderId } = await searchParams;
  const session = await getSession();

  const order = orderId
    ? await db.platformOrder.findUnique({
        where: { id: orderId },
        select: { id: true, status: true, gymId: true, gymName: true, userId: true },
      })
    : null;

  // Paid and provisioned. The token still says PROSPECT, so it is re-signed
  // before we send them in — otherwise the workspace bounces them to /login.
  if (order?.status === "PAID" && order.gymId) {
    if (session && order.userId === session.userId) {
      await reissueFor(session.userId);
      redirect("/gym/dashboard?welcome=1");
    }
    redirect("/login?paid=1");
  }

  const failed = order?.status === "FAILED" || order?.status === "CANCELLED";

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      {failed ? (
        <>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">
            That payment didn&rsquo;t go through
          </h1>
          <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
            Nothing was charged and no gym was created. You can try again, or email us and we will
            sort it out.
          </p>
          <div className="mt-7 flex gap-3">
            <Link
              href="/start/plans"
              className="inline-flex h-11 items-center rounded-lg bg-[var(--brand)] px-5 text-[14px] font-medium text-[var(--brand-foreground)]"
            >
              Try again
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-11 items-center rounded-lg border border-[var(--border-strong)] px-5 text-[14px] font-medium"
            >
              Contact us
            </Link>
          </div>
        </>
      ) : (
        <>
          <span className="flex size-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
            {order ? (
              <Clock className="size-5 text-[var(--brand)]" />
            ) : (
              <CheckCircle2 className="size-5" />
            )}
          </span>
          <h1 className="mt-5 text-[26px] font-semibold tracking-[-0.02em]">
            Confirming your payment
          </h1>
          <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
            Your bank has told the payment provider, and we are waiting to hear it from them rather
            than taking the browser&rsquo;s word for it. This is usually a few seconds.
          </p>
          {order ? (
            <p className="mt-4 text-[12.5px] text-[var(--subtle-foreground)]">
              Order {order.id.slice(-8)} for {order.gymName}
            </p>
          ) : null}
          {/* No JavaScript needed: if the webhook lands while this is on screen,
              the reload picks it up and the redirect above fires. */}
          <meta httpEquiv="refresh" content="4" />
          <p className="mt-7 text-[12.5px] text-[var(--subtle-foreground)]">
            Taking longer than a minute?{" "}
            <Link href="/contact" className="underline">
              Tell us
            </Link>{" "}
            — your payment is safe either way.
          </p>
        </>
      )}
    </main>
  );
}
