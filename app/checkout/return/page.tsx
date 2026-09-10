import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock } from "lucide-react";
import { db } from "@/lib/db";
import { destroySession, getSession } from "@/lib/auth";
import { reissueFor } from "@/lib/payments/checkout";

export const metadata = { title: "Confirming your payment" };

/**
 * Dodo's return destination intentionally sits outside `/start`.
 *
 * A verified payment changes a prospect into an owner, which makes the signed
 * prospect cookie invalid. A return page below the Prospect-only layout would
 * be rejected before it could read the fulfilled order. This page only observes
 * the order written by the verified webhook; the browser redirect itself grants
 * nothing.
 */
export default async function CheckoutReturnPage({
	searchParams,
}: {
	searchParams: Promise<{ order?: string }>;
}) {
	const { order: orderId } = await searchParams;
	const session = await getSession();

	const order = orderId
		? await db.platformOrder.findUnique({
				where: { id: orderId },
				select: {
					id: true,
					kind: true,
					status: true,
					gymId: true,
					gymName: true,
					userId: true,
				},
			})
		: null;

	if (order?.status === "PAID" && order.gymId) {
		if (order.kind === "RENEWAL" && session?.userId === order.userId) {
			await reissueFor(session.userId);
			redirect("/gym/billing?renewed=1");
		}

		// First purchases convert a Prospect into an owner. Remove the stale cookie
		// and require a normal sign-in instead of attempting to reuse old claims.
		if (session) await destroySession();
		redirect("https://beongym.com/login?paid=1");
	}

	const failed = order?.status === "FAILED" || order?.status === "CANCELLED";

	return (
		<main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
			{failed ? (
				<>
					<h1 className="text-[26px] font-semibold tracking-[-0.02em]">
						That payment did not go through
					</h1>
					<p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
						We have not received a verified payment confirmation, so
						nothing has been activated. If your bank shows a
						completed charge, contact us before trying again and we
						will reconcile it.
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
						We are waiting for a verified confirmation from Dodo
						Payments. This usually takes a few seconds.
					</p>
					{order ? (
						<p className="mt-4 text-[12.5px] text-[var(--subtle-foreground)]">
							Order {order.id.slice(-8)} for {order.gymName}
						</p>
					) : null}
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
