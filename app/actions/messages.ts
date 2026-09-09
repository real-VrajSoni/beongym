"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePaidStaff } from "@/lib/auth";
import { guard, type ActionResult } from "@/lib/action-result";
import { buildQueue, MESSAGE_KINDS } from "@/lib/data/messaging";

const kindEnum = z.enum(MESSAGE_KINDS);

const ruleSchema = z.object({
  kind: kindEnum,
  enabled: z.boolean(),
  daysBefore: z.coerce.number().int().min(0).max(60).nullable(),
  template: z.string().trim().min(10, "Write a message worth sending").max(600),
});

/**
 * Save one rule.
 *
 * Upserted per (gym, kind) — a gym has one rule of each kind or none, and
 * "none" is the same as "off", which is why the form never needs a delete.
 */
export async function saveMessageRuleAction(input: {
  kind: string;
  enabled: boolean;
  daysBefore: number | null;
  template: string;
}): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();
    const parsed = ruleSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "That rule isn't valid." };
    }
    const d = parsed.data;

    await db.messageRule.upsert({
      where: { gymId_kind: { gymId: session.gymId, kind: d.kind } },
      create: {
        gymId: session.gymId,
        kind: d.kind,
        enabled: d.enabled,
        daysBefore: d.daysBefore,
        template: d.template,
      },
      update: { enabled: d.enabled, daysBefore: d.daysBefore, template: d.template },
    });

    revalidatePath("/gym/messages");
    return { ok: true, message: d.enabled ? "Reminder switched on." : "Reminder switched off." };
  });
}

/** Rebuild today's queue from the rules. Safe to run as often as you like. */
export async function refreshQueueAction(): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();
    const added = await buildQueue(session.gymId);
    revalidatePath("/gym/messages");
    return {
      ok: true,
      message:
        added === 0
          ? "Nothing new to send — everybody due today is already in the list."
          : `${added} message${added === 1 ? "" : "s"} ready to send.`,
    };
  });
}

/**
 * Mark a queued message sent or skipped.
 *
 * The desk clicks the WhatsApp link, WhatsApp opens with the text already in
 * it, and they come back here and say what happened. That round trip is the
 * honest version of "automation" until an API account is connected — the log
 * records what a person did, not what a robot claims to have done.
 */
export async function setMessageStatusAction(
  messageId: string,
  status: "SENT" | "SKIPPED",
): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();

    const existing = await db.messageLog.findFirst({
      where: { id: messageId, gymId: session.gymId },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "That message is no longer in the list." };

    await db.messageLog.update({
      where: { id: existing.id },
      data: { status, sentAt: status === "SENT" ? new Date() : null },
    });

    revalidatePath("/gym/messages");
    return { ok: true, message: status === "SENT" ? "Marked as sent." : "Skipped." };
  });
}
