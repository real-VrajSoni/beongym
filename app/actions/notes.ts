"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePaidStaff } from "@/lib/auth";
import { guard, invalid, type ActionResult } from "@/lib/action-result";
import { noteSchema } from "@/lib/validation";
import { assertGymMember, assertGymNote } from "@/lib/data/tenant";

/**
 * Staff notes about a member. Private from members — they are written and read
 * only through the gym routes, and `getClientDetail` carries the warning — but
 * not private between colleagues: the detail page shows the whole gym's notes on
 * a member, so the gym is the boundary for removing one too. Scoping the delete
 * to its author, as it used to be, left the delete button on a colleague's note
 * failing with "not found" instead of doing the visible thing.
 */
export async function addNoteAction(formData: FormData): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();
    const parsed = noteSchema.safeParse({
      clientId: formData.get("clientId"),
      note: formData.get("note"),
    });
    if (!parsed.success) return invalid(parsed.error);
    const d = parsed.data;

    if (!(await assertGymMember(session.gymId, d.clientId))) {
      return { ok: false, error: "You don't have access to that client." };
    }

    await db.trainerNote.create({
      data: {
        trainerId: session.profileId,
        clientId: d.clientId,
        note: d.note,
      },
    });

    revalidatePath(`/gym/clients/${d.clientId}`);
    return { ok: true, message: "Note added." };
  });
}

export async function deleteNoteAction(noteId: string): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();
    if (!(await assertGymNote(session.gymId, noteId))) {
      return { ok: false, error: "Note not found." };
    }
    const note = await db.trainerNote.findUniqueOrThrow({
      where: { id: noteId },
      select: { id: true, clientId: true },
    });

    await db.trainerNote.delete({ where: { id: note.id } });
    revalidatePath(`/gym/clients/${note.clientId}`);
    return { ok: true, message: "Note deleted." };
  });
}
