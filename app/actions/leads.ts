"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePaidStaff } from "@/lib/auth";
import { guard, invalid, type ActionResult } from "@/lib/action-result";
import { toDateOnly } from "@/lib/format";

const sourceEnum = z.enum([
  "WALK_IN",
  "CALL",
  "WHATSAPP",
  "INSTAGRAM",
  "REFERRAL",
  "WEBSITE",
  "MAP",
  "OTHER",
]);
const statusEnum = z.enum(["NEW", "CONTACTED", "TRIAL_BOOKED", "JOINED", "LOST"]);

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v));

const leadSchema = z.object({
  leadId: z.string().optional(),
  name: z.string().trim().min(2, "Who is it?").max(80),
  phone: optional(20),
  email: optional(120),
  source: sourceEnum,
  interest: optional(120),
  notes: optional(1000),
  nextFollowUpAt: optional(20),
});

const obj = (fd: FormData) => Object.fromEntries(fd.entries());

/** Take an enquiry down. Name is the only thing anybody has time to type. */
export async function saveLeadAction(formData: FormData): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();
    const parsed = leadSchema.safeParse(obj(formData));
    if (!parsed.success) return invalid(parsed.error);
    const d = parsed.data;

    const data = {
      gymId: session.gymId,
      name: d.name,
      phone: d.phone,
      email: d.email,
      source: d.source,
      interest: d.interest,
      notes: d.notes,
      nextFollowUpAt: d.nextFollowUpAt ? toDateOnly(d.nextFollowUpAt) : null,
    };

    if (d.leadId) {
      const owned = await db.lead.findFirst({
        where: { id: d.leadId, gymId: session.gymId },
        select: { id: true },
      });
      if (!owned) return { ok: false, error: "That enquiry is gone." };
      await db.lead.update({ where: { id: owned.id }, data });
    } else {
      await db.lead.create({ data });
    }

    revalidatePath("/gym/leads");
    return { ok: true, message: d.leadId ? "Enquiry updated." : "Enquiry added." };
  });
}

/**
 * Move a lead along the pipeline.
 *
 * `JOINED` stamps the date, which is what makes the conversion rate a fact
 * rather than a count of rows somebody remembered to move.
 */
export async function setLeadStatusAction(
  leadId: string,
  status: string,
  lostReason?: string,
): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();
    const parsed = statusEnum.safeParse(status);
    if (!parsed.success) return { ok: false, error: "Unknown status." };

    const lead = await db.lead.findFirst({
      where: { id: leadId, gymId: session.gymId },
      select: { id: true, name: true },
    });
    if (!lead) return { ok: false, error: "That enquiry is gone." };

    await db.lead.update({
      where: { id: lead.id },
      data: {
        status: parsed.data,
        joinedAt: parsed.data === "JOINED" ? new Date() : null,
        lostReason: parsed.data === "LOST" ? lostReason?.trim() || null : null,
        // Chasing somebody who has decided is how a follow-up list turns into
        // a nuisance, so the reminder goes with the decision.
        nextFollowUpAt: parsed.data === "JOINED" || parsed.data === "LOST" ? null : undefined,
      },
    });

    revalidatePath("/gym/leads");
    return { ok: true, message: `${lead.name} → ${parsed.data.toLowerCase().replace("_", " ")}.` };
  });
}

/** Log a call, and set when to ring again. */
export async function logLeadActivityAction(
  leadId: string,
  note: string,
  nextFollowUp?: string,
): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();
    if (note.trim().length < 2) return { ok: false, error: "Write what happened." };

    const lead = await db.lead.findFirst({
      where: { id: leadId, gymId: session.gymId },
      select: { id: true, status: true },
    });
    if (!lead) return { ok: false, error: "That enquiry is gone." };

    await db.$transaction([
      db.leadActivity.create({ data: { leadId: lead.id, note: note.trim() } }),
      db.lead.update({
        where: { id: lead.id },
        data: {
          // A logged call is a contacted lead — nobody should have to remember
          // to move the status as well as write the note.
          status: lead.status === "NEW" ? "CONTACTED" : lead.status,
          nextFollowUpAt: nextFollowUp ? toDateOnly(nextFollowUp) : null,
        },
      }),
    ]);

    revalidatePath("/gym/leads");
    return { ok: true, message: "Follow-up logged." };
  });
}

export async function deleteLeadAction(leadId: string): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();
    const lead = await db.lead.findFirst({
      where: { id: leadId, gymId: session.gymId },
      select: { id: true },
    });
    if (!lead) return { ok: false, error: "That enquiry is gone." };

    await db.lead.delete({ where: { id: lead.id } });
    revalidatePath("/gym/leads");
    return { ok: true, message: "Enquiry deleted." };
  });
}
