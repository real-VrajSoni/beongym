"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePaidStaff } from "@/lib/auth";
import { guard, invalid, type ActionResult } from "@/lib/action-result";
import { dietPlanSchema, planSchema, workoutPlanSchema } from "@/lib/validation";
import { assertGymPlan, assertPlanDiet, assertPlanWorkout } from "@/lib/data/tenant";

const obj = (fd: FormData) => Object.fromEntries(fd.entries());

export async function savePlanAction(formData: FormData): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();
    const parsed = planSchema.safeParse(obj(formData));
    if (!parsed.success) return invalid(parsed.error);
    const d = parsed.data;

    // The gym's currency, written onto the row. Left to the schema default,
    // every plan any gym created came out priced in rupees — which the grid hid
    // (it reads the gym) and the detail page showed (it read the plan).
    const gym = await db.gym.findUniqueOrThrow({
      where: { id: session.gymId },
      select: { currency: true },
    });

    const data = {
      name: d.name,
      description: d.description ?? null,
      planType: d.planType,
      price: d.price,
      currency: gym.currency,
      durationDays: d.durationDays,
      billingInterval: d.billingInterval,
      isActive: d.isActive === "on",
      showPrice: d.showPrice === "on",
    };

    let id: string;
    if (d.planId) {
      if (!(await assertGymPlan(session.gymId, d.planId))) {
        return { ok: false, error: "You don't have access to that programme." };
      }
      const updated = await db.plan.update({ where: { id: d.planId }, data });
      id = updated.id;
    } else {
      const created = await db.plan.create({
        data: { ...data, gymId: session.gymId, trainerId: session.profileId },
      });
      id = created.id;
    }

    revalidatePath("/gym/plans");
    revalidatePath("/gyms");
    revalidatePath(`/gym/plans/${id}`);
    revalidatePath("/gym/dashboard");
    return { ok: true, message: d.planId ? "Programme updated." : "Programme created.", id };
  });
}

export async function deletePlanAction(planId: string): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();
    if (!(await assertGymPlan(session.gymId, planId))) {
      return { ok: false, error: "You don't have access to that programme." };
    }

    const subscriptions = await db.subscription.count({ where: { planId } });
    if (subscriptions > 0) {
      // Historical subscriptions and their payments must survive — archive instead.
      await db.plan.update({ where: { id: planId }, data: { isActive: false } });
      revalidatePath("/gym/plans");
      revalidatePath("/gyms");
      return {
        ok: true,
        message: `Programme archived — ${subscriptions} subscription${subscriptions === 1 ? "" : "s"} reference it, so its history is preserved.`,
      };
    }

    await db.plan.delete({ where: { id: planId } });
    revalidatePath("/gym/plans");
    revalidatePath("/gyms");
    return { ok: true, message: "Programme deleted." };
  });
}

export async function saveWorkoutPlanAction(formData: FormData): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();
    const parsed = workoutPlanSchema.safeParse(obj(formData));
    if (!parsed.success) return invalid(parsed.error);
    const d = parsed.data;

    if (!(await assertGymPlan(session.gymId, d.planId))) {
      return { ok: false, error: "You don't have access to that programme." };
    }

    // The plan is ours; that says nothing about the attachment id posted with
    // it. Without this, a gym could pass its own planId and another gym's
    // workoutPlanId and rewrite their programme.
    if (d.workoutPlanId) {
      if (!(await assertPlanWorkout(d.planId, d.workoutPlanId))) {
        return { ok: false, error: "That workout plan isn't part of this programme." };
      }
      await db.workoutPlan.update({
        where: { id: d.workoutPlanId },
        data: { name: d.name, description: d.description ?? null },
      });
    } else {
      await db.workoutPlan.create({
        data: { planId: d.planId, name: d.name, description: d.description ?? null },
      });
    }

    revalidatePath(`/gym/plans/${d.planId}`);
    return { ok: true, message: "Workout plan saved." };
  });
}

export async function saveDietPlanAction(formData: FormData): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();
    const parsed = dietPlanSchema.safeParse(obj(formData));
    if (!parsed.success) return invalid(parsed.error);
    const d = parsed.data;

    if (!(await assertGymPlan(session.gymId, d.planId))) {
      return { ok: false, error: "You don't have access to that programme." };
    }

    const data = {
      name: d.name,
      description: d.description ?? null,
      caloriesTarget: d.caloriesTarget,
      proteinTarget: d.proteinTarget,
      carbsTarget: d.carbsTarget,
      fatsTarget: d.fatsTarget,
    };

    if (d.dietPlanId) {
      if (!(await assertPlanDiet(d.planId, d.dietPlanId))) {
        return { ok: false, error: "That nutrition plan isn't part of this programme." };
      }
      await db.dietPlan.update({ where: { id: d.dietPlanId }, data });
    } else {
      await db.dietPlan.create({ data: { ...data, planId: d.planId } });
    }

    revalidatePath(`/gym/plans/${d.planId}`);
    return { ok: true, message: "Nutrition plan saved." };
  });
}
