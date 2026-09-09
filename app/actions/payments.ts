"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePaidStaff } from "@/lib/auth";
import { guard, invalid, type ActionResult } from "@/lib/action-result";
import { paymentSchema, paymentStatusEnum } from "@/lib/validation";

const obj = (fd: FormData) => Object.fromEntries(fd.entries());

/**
 * MVP payments are database records, not gateway charges — the trainer logs
 * what they received. Wiring a gateway later replaces this action only.
 */
export async function recordPaymentAction(formData: FormData): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();
    const parsed = paymentSchema.safeParse(obj(formData));
    if (!parsed.success) return invalid(parsed.error);
    const d = parsed.data;

    const sub = await db.subscription.findFirst({
      where: { id: d.subscriptionId, plan: { gymId: session.gymId } },
      select: { id: true, clientId: true },
    });
    if (!sub) return { ok: false, error: "Subscription not found." };

    if (d.transactionId) {
      // Scoped to this gym on purpose. A global lookup answers "has anybody on
      // the platform used this reference", which is another tenant's business
      // and not something a receipt number should be able to ask.
      const clash = await db.payment.findFirst({
        where: {
          transactionId: d.transactionId,
          subscription: { plan: { gymId: session.gymId } },
        },
        select: { id: true },
      });
      if (clash) {
        return {
          ok: false,
          error: "",
          fieldErrors: { transactionId: "That transaction ID is already recorded." },
        };
      }
    }

    await db.payment.create({
      data: {
        subscriptionId: sub.id,
        amount: d.amount,
        paymentDate: new Date(d.paymentDate),
        paymentMethod: d.paymentMethod,
        status: d.status,
        transactionId: d.transactionId ?? null,
      },
    });

    revalidatePath("/gym/payments");
    revalidatePath("/gym/dashboard");
    revalidatePath(`/gym/clients/${sub.clientId}`);
    return { ok: true, message: "Payment recorded." };
  });
}

export async function setPaymentStatusAction(
  paymentId: string,
  status: string,
): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();
    const parsedStatus = paymentStatusEnum.safeParse(status);
    if (!parsedStatus.success) return { ok: false, error: "Unknown status." };

    const payment = await db.payment.findFirst({
      where: { id: paymentId, subscription: { plan: { gymId: session.gymId } } },
      select: { id: true, subscription: { select: { clientId: true } } },
    });
    if (!payment) return { ok: false, error: "Payment not found." };

    await db.payment.update({ where: { id: payment.id }, data: { status: parsedStatus.data } });

    revalidatePath("/gym/payments");
    revalidatePath("/gym/dashboard");
    revalidatePath(`/gym/clients/${payment.subscription.clientId}`);
    return { ok: true, message: "Payment updated." };
  });
}
