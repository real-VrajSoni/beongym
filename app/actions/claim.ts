"use server";

import { Prisma } from "@/lib/generated/prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProspect } from "@/lib/auth";
import { guard, invalid, type ActionResult } from "@/lib/action-result";
import { startPurchase } from "@/lib/payments/checkout";

const claimSchema = z.object({
	code: z.string().trim().min(3).max(24),
	/** Says how they are connected to the gym. Kept for the admin to read. */
	role: z.string().trim().min(2, "Tell us your role at the gym").max(60),
	phone: z.string().trim().min(6, "A number we can reach you on").max(20),
});

/** Claims require independent ownership verification; payment cannot transfer a gym. */
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

		const createClaim = async () =>
			db.$transaction(
				async (tx) => {
					const gym = await tx.gym.findFirst({
						where: { code: d.code.toUpperCase(), claimed: false },
						select: { id: true, name: true, city: true },
					});
					if (!gym) return null;

					const openClaim = await tx.platformOrder.findFirst({
						where: {
							gymId: gym.id,
							kind: "CLAIM",
							status: "PENDING",
						},
						select: { id: true },
					});
					if (openClaim) return null;
					return gym;
				},
				{
					isolationLevel:
						Prisma.TransactionIsolationLevel.Serializable,
				},
			);

		let gym: Awaited<ReturnType<typeof createClaim>> = null;
		for (let attempt = 0; attempt < 3; attempt++) {
			try {
				gym = await createClaim();
				break;
			} catch (error) {
				if (
					error instanceof Prisma.PrismaClientKnownRequestError &&
					error.code === "P2034" &&
					attempt < 2
				)
					continue;
				throw error;
			}
		}
		if (!gym) {
			return {
				ok: false as const,
				error: "That gym is already being claimed or has been claimed.",
			};
		}

		let result;
		try {
			result = await startPurchase({
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
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				return {
					ok: false as const,
					error: "That gym is already being claimed. Please try again later.",
				};
			}
			throw error;
		}

		if (!result.ok) return { ok: false as const, error: result.error };
		return { ok: true, message: "Redirecting to payment…", checkoutUrl: result.checkoutUrl };
	});
}
