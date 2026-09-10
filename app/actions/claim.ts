"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireProspect } from "@/lib/auth";
import { guard, invalid, type ActionResult } from "@/lib/action-result";
import { reissueFor, startPurchase } from "@/lib/payments/checkout";

const claimSchema = z.object({
	code: z.string().trim().min(3).max(24),
	/** Says how they are connected to the gym. Kept for the admin to read. */
	role: z.string().trim().min(2, "Tell us your role at the gym").max(60),
	phone: z.string().trim().min(6, "A number we can reach you on").max(20),
});

/**
 * Takes over an unclaimed listing.
 *
 * Payment first. The transfer — ownership, access, the starting programmes —
 * happens in `fulfilOrder` when a verified webhook says the money arrived. It
 * used to happen here, with the order written `status: "PAID"`, which meant
 * anybody who could reach this form could take a listing for nothing.
 *
 * A claim is still verified by a human afterwards: the admin sees the order,
 * the stated role and the phone number, and rings the gym. Handing a stranger
 * an existing listing on a card payment alone would be worse than no claim
 * flow at all.
 */
export async function claimGymAction(
	formData: FormData,
): Promise<ActionResult> {
	return guard(async () => {
		const session = await requireProspect();
		const parsed = claimSchema.safeParse(
			Object.fromEntries(formData.entries()),
		);
		if (!parsed.success) return invalid(parsed.error);
		const d = parsed.data;

		const gym = await db.gym.findFirst({
			where: { code: d.code.toUpperCase(), claimed: false },
			select: { id: true, name: true, city: true },
		});
		if (!gym) {
			return {
				ok: false as const,
				error: "That gym has already been claimed.",
			};
		}

		// The listing is not transferred until the money is verified. It used to
		// transfer on the spot with the order marked PAID, which meant anyone who
		// could reach this form could take over a listing for nothing.
		const result = await startPurchase({
			userId: session.userId,
			email: session.email,
			name: session.name,
			planKey: "MONTHLY",
			kind: "CLAIM",
			gymName: gym.name,
			city: gym.city,
			gymId: gym.id,
			returnPath: "/checkout/return",
			meta: { role: d.role, phone: d.phone },
		});

		if (!result.ok) return { ok: false as const, error: result.error };
		if (result.mode === "gateway") {
			return {
				ok: true as const,
				message: "Redirecting to payment…",
				checkoutUrl: result.checkoutUrl,
			};
		}
		await reissueFor(session.userId);
		return {
			ok: true as const,
			message: `${gym.name} is yours.`,
			id: "/gym/settings?claimed=1",
		};
	});
}
