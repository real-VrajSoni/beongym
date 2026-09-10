"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, requireProspect } from "@/lib/auth";
import { guard, invalid, type ActionResult } from "@/lib/action-result";
import { CLAIM_PRICE_USD, extendAccess } from "@/lib/platform-plans";
import { STARTER_PLANS } from "@/lib/data/starter-plans";

const claimSchema = z.object({
  code: z.string().trim().min(3).max(24),
  /** Says how they are connected to the gym. Kept for the admin to read. */
  role: z.string().trim().min(2, "Tell us your role at the gym").max(60),
  phone: z.string().trim().min(6, "A number we can reach you on").max(20),
});

/**
 * Takes over an unclaimed listing.
 *
 * NO PAYMENT GATEWAY IS CONNECTED YET — same as the plan checkout, the order
 * is written `provider: "manual"` and marked paid so the flow completes end to
 * end. When the gateway goes in, create the order PENDING, hand off, and run
 * the transfer below from the webhook.
 *
 * A claim is verified by a human today: the admin sees the order, the role and
 * the phone number, and calls the gym. That is deliberate — handing a stranger
 * an existing listing on nothing but a form would be worse than no claim flow.
 */
export async function claimGymAction(formData: FormData): Promise<ActionResult> {
  const result = await guard(async () => {
    const session = await requireProspect();
    const parsed = claimSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return invalid(parsed.error);
    const d = parsed.data;

    const gym = await db.gym.findFirst({
      where: { code: d.code.toUpperCase(), claimed: false },
      select: { id: true, name: true, code: true, city: true, tier: true, currency: true },
    });
    if (!gym) {
      return { ok: false as const, error: "That gym has already been claimed." };
    }

    // Claiming buys the entry plan; longer ones are offered inside the app.
    const claimedAccess = extendAccess(null, "MONTHLY")!;

    await db.$transaction(async (tx) => {
      const order = await tx.platformOrder.create({
        data: {
          userId: session.userId,
          gymId: gym.id,
          tier: "PRO",
          billingCycle: "MONTHLY",
          amount: CLAIM_PRICE_USD,
          currency: "USD",
          status: "PAID",
          provider: "manual",
          kind: "CLAIM",
          // What the admin rings to verify the claim. It was being smuggled
          // into providerRef, which now means one thing only: the gateway's id.
          meta: { role: d.role, phone: d.phone },
          gymName: gym.name,
          city: gym.city,
          paidAt: new Date(),
        },
      });

      // Paying is what makes a gym live, whichever door it came through.
      await tx.gym.update({
        where: { id: gym.id },
        data: {
          claimed: true,
          status: "ACTIVE",
          tier: "PRO",
          accessExpiresAt: extendAccess(null),
        },
      });

      const owner = await tx.user.update({
        where: { id: session.userId },
        data: {
          gymId: gym.id,
          phone: d.phone,
          role: "GYM_OWNER",
          trainerProfile: { create: { gymId: gym.id, title: "Owner" } },
        },
        include: { trainerProfile: true },
      });

      await tx.platformOrder.update({ where: { id: order.id }, data: { gymId: gym.id } });

      // A store needs something to show, so the starting programmes land with
      // it — unpriced, in the gym's own currency, and off the public store
      // until the owner has said what each one costs.
      await tx.plan.createMany({
        data: STARTER_PLANS.map((plan) => ({
          ...plan,
          gymId: gym.id,
          currency: gym.currency,
          trainerId: owner.trainerProfile!.id,
        })),
      });

      // The session carries role and tenant, so it has to be reissued.
      await createSession({
        userId: owner.id,
        email: owner.email,
        name: owner.name,
        role: "GYM_OWNER",
        profileId: owner.trainerProfile!.id,
        gymId: gym.id,
        gymName: gym.name,
        gymCode: gym.code,
        gymTier: "PRO",
        gymAccessExpiresAt: claimedAccess.toISOString(),
      });
    });

    return { ok: true as const, message: `${gym.name} is yours.` };
  });

  if (result.ok) redirect("/gym/settings?claimed=1");
  return result;
}
