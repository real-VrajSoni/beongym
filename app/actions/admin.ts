"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { guard, type ActionResult } from "@/lib/action-result";

const gymStatusEnum = z.enum(["TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"]);
const tierEnum = z.enum(["PRO", "ELITE"]);

/**
 * Suspending a gym locks out its owner, staff and members immediately —
 * sessionIsLive() rejects any token bound to a suspended tenant.
 */
export async function setGymStatusAction(gymId: string, status: string): Promise<ActionResult> {
  return guard(async () => {
    await requireAdmin();
    const parsed = gymStatusEnum.safeParse(status);
    if (!parsed.success) return { ok: false, error: "Unknown status." };

    const gym = await db.gym.update({
      where: { id: gymId },
      data: { status: parsed.data },
      select: { name: true },
    });

    revalidatePath("/admin/gyms");
    revalidatePath(`/admin/gyms/${gymId}`);
    revalidatePath("/admin/overview");
    return { ok: true, message: `${gym.name} is now ${parsed.data.toLowerCase()}.` };
  });
}

export async function setGymTierAction(gymId: string, tier: string): Promise<ActionResult> {
  return guard(async () => {
    await requireAdmin();
    const parsed = tierEnum.safeParse(tier);
    if (!parsed.success) return { ok: false, error: "Unknown tier." };

    const gym = await db.gym.update({
      where: { id: gymId },
      data: { tier: parsed.data },
      select: { name: true },
    });

    revalidatePath("/admin/gyms");
    revalidatePath(`/admin/gyms/${gymId}`);
    revalidatePath("/admin/overview");
    return { ok: true, message: `${gym.name} moved to ${parsed.data.toLowerCase()}.` };
  });
}

/**
 * Removes a gym and everything inside it. Guarded by an explicit name match
 * because there is no undo — the cascade takes members, payments and history.
 */
export async function deleteGymAction(gymId: string, confirmName: string): Promise<ActionResult> {
  return guard(async () => {
    await requireAdmin();

    const gym = await db.gym.findUnique({
      where: { id: gymId },
      select: { name: true, _count: { select: { members: true } } },
    });
    if (!gym) return { ok: false, error: "Gym not found." };

    if (confirmName.trim() !== gym.name) {
      return { ok: false, error: "The name you typed doesn't match. Nothing was deleted." };
    }

    // Restrict-guarded history has to go first, innermost outwards.
    await db.$transaction(async (tx) => {
      const planIds = (await tx.plan.findMany({ where: { gymId }, select: { id: true } })).map(
        (p) => p.id,
      );
      const subIds = (
        await tx.subscription.findMany({ where: { planId: { in: planIds } }, select: { id: true } })
      ).map((s) => s.id);

      await tx.trainerNote.deleteMany({ where: { client: { gymId } } });
      await tx.payment.deleteMany({ where: { subscriptionId: { in: subIds } } });
      await tx.subscription.deleteMany({ where: { id: { in: subIds } } });
      await tx.exerciseLog.deleteMany({ where: { client: { gymId } } });
      await tx.gym.delete({ where: { id: gymId } });
    });

    revalidatePath("/admin/gyms");
    revalidatePath("/admin/overview");
    return { ok: true, message: `${gym.name} and all of its data were deleted.` };
  });
}
