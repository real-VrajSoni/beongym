"use server";

import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { db } from "@/lib/db";
import { hashPassword, requirePaidStaff } from "@/lib/auth";
import { guard, invalid, type ActionResult } from "@/lib/action-result";
import { createClientSchema, updateClientSchema } from "@/lib/validation";
import { assertGymMember, assertGymPlan } from "@/lib/data/tenant";
import { nextMemberCode } from "@/lib/data/member-code";
import { toDateOnly } from "@/lib/format";

function formObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) out[k] = typeof v === "string" ? v : undefined;
  return out;
}

/**
 * Onboards a client: creates the login, the profile and the first
 * subscription in one transaction so a client is never left without a
 * programme. Optionally records the opening payment.
 */
export async function createClientAction(formData: FormData): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();
    const parsed = createClientSchema.safeParse(formObject(formData));
    if (!parsed.success) return invalid(parsed.error);
    const d = parsed.data;

    if (!(await assertGymPlan(session.gymId, d.planId))) {
      return { ok: false, error: "That programme doesn't belong to you." };
    }

    const existing = await db.user.findUnique({ where: { email: d.email }, select: { id: true } });
    if (existing) {
      return { ok: false, error: "", fieldErrors: { email: "Someone already uses that email." } };
    }

    const plan = await db.plan.findUniqueOrThrow({ where: { id: d.planId } });
    const startDate = toDateOnly(d.startDate);
    const passwordHash = await hashPassword(d.password);
    const memberCode = await nextMemberCode(session.gymId);

    const clientId = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          gymId: session.gymId,
          name: d.name,
          email: d.email,
          phone: d.phone ?? null,
          passwordHash,
          role: "MEMBER",
          clientProfile: {
            create: {
              gymId: session.gymId,
              memberCode,
              trainerId: session.profileId,
              gender: d.gender ?? null,
              dateOfBirth: d.dateOfBirth ? toDateOnly(d.dateOfBirth) : null,
            },
          },
        },
        include: { clientProfile: true },
      });

      const subscription = await tx.subscription.create({
        data: {
          clientId: user.clientProfile!.id,
          planId: plan.id,
          startDate,
          endDate: addDays(startDate, plan.durationDays),
          status: d.status,
          autoRenew: d.autoRenew === "on",
        },
      });

      if (d.recordPayment === "on") {
        await tx.payment.create({
          data: {
            subscriptionId: subscription.id,
            amount: plan.price,
            paymentDate: startDate,
            paymentMethod: d.paymentMethod,
            status: "SUCCESSFUL",
            transactionId: `TXN${Date.now().toString().slice(-8)}`,
          },
        });
      }

      return user.clientProfile!.id;
    });

    revalidatePath("/gym/clients");
    revalidatePath("/gym/dashboard");
    revalidatePath("/gym/subscriptions");
    return { ok: true, message: `Member added — code ${memberCode}.`, id: clientId };
  });
}

export async function updateClientAction(formData: FormData): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();
    const parsed = updateClientSchema.safeParse(formObject(formData));
    if (!parsed.success) return invalid(parsed.error);
    const d = parsed.data;

    if (!(await assertGymMember(session.gymId, d.clientId))) {
      return { ok: false, error: "You don't have access to that client." };
    }

    const profile = await db.clientProfile.findUniqueOrThrow({
      where: { id: d.clientId },
      select: { userId: true },
    });

    const emailOwner = await db.user.findUnique({
      where: { email: d.email },
      select: { id: true },
    });
    if (emailOwner && emailOwner.id !== profile.userId) {
      return { ok: false, error: "", fieldErrors: { email: "Someone already uses that email." } };
    }

    await db.$transaction([
      db.user.update({
        where: { id: profile.userId },
        data: { name: d.name, email: d.email, phone: d.phone ?? null },
      }),
      db.clientProfile.update({
        where: { id: d.clientId },
        data: {
          gender: d.gender ?? null,
          dateOfBirth: d.dateOfBirth ? toDateOnly(d.dateOfBirth) : null,
        },
      }),
    ]);

    revalidatePath(`/gym/clients/${d.clientId}`);
    revalidatePath("/gym/clients");
    return { ok: true, message: "Client updated." };
  });
}

/**
 * Owner- or staff-set password for a member's app login.
 *
 * Members forget these, and the front desk is where they ask. There is no
 * self-serve reset because there is no email delivery — so the person at the
 * desk sets one, reads it out, and the member changes it never, which is fine
 * for an app that shows them their own dues.
 */
export async function resetMemberPasswordAction(
  clientId: string,
  password: string,
): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();

    if (password.trim().length < 8) {
      return { ok: false, error: "Use at least 8 characters." };
    }

    const member = await db.clientProfile.findFirst({
      where: { id: clientId, gymId: session.gymId },
      select: { id: true, user: { select: { id: true, name: true } } },
    });
    if (!member) return { ok: false, error: "That member isn't on your roster." };

    await db.user.update({
      where: { id: member.user.id },
      data: { passwordHash: await hashPassword(password) },
    });

    revalidatePath(`/gym/clients/${clientId}`);
    return { ok: true, message: `New app password set for ${member.user.name}.` };
  });
}
