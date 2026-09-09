"use server";

import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { db } from "@/lib/db";
import { requirePaidStaff } from "@/lib/auth";
import { guard, invalid, type ActionResult } from "@/lib/action-result";
import { subscriptionSchema, subStatusEnum } from "@/lib/validation";
import { assertGymMember, assertGymPlan, assertGymSubscription } from "@/lib/data/tenant";
import { toDateOnly } from "@/lib/format";

const obj = (fd: FormData) => Object.fromEntries(fd.entries());

export async function saveSubscriptionAction(formData: FormData): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();
    const parsed = subscriptionSchema.safeParse(obj(formData));
    if (!parsed.success) return invalid(parsed.error);
    const d = parsed.data;

    const [ownsClient, ownsPlan] = await Promise.all([
      assertGymMember(session.gymId, d.clientId),
      assertGymPlan(session.gymId, d.planId),
    ]);
    if (!ownsClient || !ownsPlan) {
      return { ok: false, error: "You don't have access to that client or programme." };
    }

    const plan = await db.plan.findUniqueOrThrow({
      where: { id: d.planId },
      include: { gym: { select: { currency: true } } },
    });
    const startDate = toDateOnly(d.startDate);
    const data = {
      clientId: d.clientId,
      planId: d.planId,
      startDate,
      endDate: addDays(startDate, plan.durationDays),
      status: d.status,
      autoRenew: d.autoRenew === "on",
      price: d.price,
      currency: plan.gym.currency,
    };

    if (d.subscriptionId) {
      if (!(await assertGymSubscription(session.gymId, d.subscriptionId))) {
        return { ok: false, error: "Subscription not found." };
      }
      await db.subscription.update({ where: { id: d.subscriptionId }, data });
    } else {
      await db.subscription.create({ data });
    }

    revalidatePath("/gym/subscriptions");
    revalidatePath(`/gym/clients/${d.clientId}`);
    revalidatePath("/gym/dashboard");
    return {
      ok: true,
      message: d.subscriptionId ? "Subscription updated." : "Subscription created.",
    };
  });
}

export async function setSubscriptionStatusAction(
  subscriptionId: string,
  status: string,
): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();
    const parsedStatus = subStatusEnum.safeParse(status);
    if (!parsedStatus.success) return { ok: false, error: "Unknown status." };

    const sub = await db.subscription.findFirst({
      where: { id: subscriptionId, plan: { gymId: session.gymId } },
      select: { id: true, clientId: true },
    });
    if (!sub) return { ok: false, error: "Subscription not found." };

    await db.subscription.update({
      where: { id: sub.id },
      data: { status: parsedStatus.data },
    });

    revalidatePath("/gym/subscriptions");
    revalidatePath(`/gym/clients/${sub.clientId}`);
    return { ok: true, message: "Subscription updated." };
  });
}

export async function toggleAutoRenewAction(
  subscriptionId: string,
  autoRenew: boolean,
): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();
    const sub = await db.subscription.findFirst({
      where: { id: subscriptionId, plan: { gymId: session.gymId } },
      select: { id: true, clientId: true },
    });
    if (!sub) return { ok: false, error: "Subscription not found." };

    await db.subscription.update({ where: { id: sub.id }, data: { autoRenew } });
    revalidatePath("/gym/subscriptions");
    revalidatePath(`/gym/clients/${sub.clientId}`);
    return { ok: true, message: autoRenew ? "Auto-renew on." : "Auto-renew off." };
  });
}

/** Starts a fresh subscription cycle the day after the current one ends. */
export async function renewSubscriptionAction(subscriptionId: string): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();
    const sub = await db.subscription.findFirst({
      where: { id: subscriptionId, plan: { gymId: session.gymId } },
      include: { plan: true },
    });
    if (!sub) return { ok: false, error: "Subscription not found." };

    const start = sub.endDate > new Date() ? addDays(sub.endDate, 1) : toDateOnly();
    await db.$transaction([
      db.subscription.update({ where: { id: sub.id }, data: { status: "EXPIRED" } }),
      db.subscription.create({
        data: {
          clientId: sub.clientId,
          planId: sub.planId,
          startDate: start,
          endDate: addDays(start, sub.plan.durationDays),
          status: "ACTIVE",
          autoRenew: sub.autoRenew,
          // A renewal carries the rate the member is actually on. Somebody who
          // negotiated a price keeps it; putting the list price back here would
          // be a silent increase nobody at the desk agreed to.
          price: sub.price,
          currency: sub.currency,
        },
      }),
    ]);

    revalidatePath("/gym/subscriptions");
    revalidatePath(`/gym/clients/${sub.clientId}`);
    revalidatePath("/gym/dashboard");
    return { ok: true, message: `${sub.plan.name} renewed.` };
  });
}
