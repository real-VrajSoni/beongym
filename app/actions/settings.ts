"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, getSession, hashPassword, requireStaff } from "@/lib/auth";
import { guard, invalid, type ActionResult } from "@/lib/action-result";
import { passwordSchema, trainerProfileSchema } from "@/lib/validation";

const obj = (fd: FormData) => Object.fromEntries(fd.entries());

export async function updateTrainerProfileAction(formData: FormData): Promise<ActionResult> {
  return guard(async () => {
    const session = await requireStaff();
    const parsed = trainerProfileSchema.safeParse(obj(formData));
    if (!parsed.success) return invalid(parsed.error);
    const d = parsed.data;

    const emailOwner = await db.user.findUnique({
      where: { email: d.email },
      select: { id: true },
    });
    if (emailOwner && emailOwner.id !== session.userId) {
      return { ok: false, error: "", fieldErrors: { email: "Someone already uses that email." } };
    }

    await db.$transaction([
      db.user.update({
        where: { id: session.userId },
        data: { name: d.name, email: d.email, phone: d.phone ?? null },
      }),
      db.trainerProfile.update({
        where: { id: session.profileId },
        data: {
          bio: d.bio ?? null,
          specialization: d.specialization ?? null,
          experienceYears: d.experienceYears,
        },
      }),
    ]);

    // Name and email live in the session cookie — refresh it.
    await createSession({ ...session, name: d.name, email: d.email });

    revalidatePath("/gym/settings");
    revalidatePath("/gym/dashboard");
    return { ok: true, message: "Profile updated." };
  });
}

export async function changePasswordAction(formData: FormData): Promise<ActionResult> {
  return guard(async () => {
    const session = await getSession();
    if (!session) return { ok: false, error: "Not signed in." };

    const parsed = passwordSchema.safeParse(obj(formData));
    if (!parsed.success) return invalid(parsed.error);

    const user = await db.user.findUniqueOrThrow({
      where: { id: session.userId },
      select: { passwordHash: true },
    });

    if (!(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
      return {
        ok: false,
        error: "",
        fieldErrors: { currentPassword: "That's not your current password." },
      };
    }

    await db.user.update({
      where: { id: session.userId },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    });

    return { ok: true, message: "Password changed." };
  });
}
