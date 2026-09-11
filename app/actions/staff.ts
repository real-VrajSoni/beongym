"use server";

import { validNewPassword } from "@/lib/security";
import { enforceRateLimit } from "@/lib/rate-limit";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashPassword, requirePaidOwner } from "@/lib/auth";
import { guard, invalid, type ActionResult } from "@/lib/action-result";
import { createStaffSchema, updateStaffSchema } from "@/lib/validation";

const obj = (fd: FormData) => Object.fromEntries(fd.entries());

/** Owners must never be able to leave a gym with nobody who can administer it. */
async function activeOwnerCount(gymId: string, excludeUserId?: string) {
  return db.user.count({
    where: {
      gymId,
      role: "GYM_OWNER",
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}

/**
 * Creates a staff account inside the owner's gym.
 *
 * There is no email delivery in this release, so the owner sets a temporary
 * password and hands over the credentials themselves — the UI says as much
 * rather than implying an invite was sent.
 */
export async function createStaffAction(formData: FormData): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidOwner();
    const parsed = createStaffSchema.safeParse(obj(formData));
    if (!parsed.success) return invalid(parsed.error);
    const d = parsed.data;

    const clash = await db.user.findUnique({ where: { email: d.email }, select: { id: true } });
    if (clash) {
      return {
        ok: false,
        error: "",
        fieldErrors: { email: "That email already has a BeOnGym account." },
      };
    }

    const created = await db.user.create({
      data: {
        gymId: session.gymId,
        name: d.name,
        email: d.email,
        phone: d.phone ?? null,
        passwordHash: await hashPassword(d.password),
        role: d.role,
        trainerProfile: {
          create: {
            gymId: session.gymId,
            title: d.title ?? (d.role === "GYM_OWNER" ? "Owner" : "Staff"),
            specialization: d.specialization ?? null,
          },
        },
      },
      select: { name: true },
    });

    revalidatePath("/gym/staff");
    revalidatePath("/gym/settings");
    return { ok: true, message: `${created.name} can now sign in with their email.` };
  });
}

export async function updateStaffAction(formData: FormData): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidOwner();
    const parsed = updateStaffSchema.safeParse(obj(formData));
    if (!parsed.success) return invalid(parsed.error);
    const d = parsed.data;

    const staff = await db.user.findFirst({
      where: { id: d.staffId, gymId: session.gymId, role: { in: ["GYM_OWNER", "GYM_STAFF"] } },
      select: { id: true, role: true, isActive: true },
    });
    if (!staff) return { ok: false, error: "That person isn't on your team." };

    const emailOwner = await db.user.findUnique({
      where: { email: d.email },
      select: { id: true },
    });
    if (emailOwner && emailOwner.id !== staff.id) {
      return {
        ok: false,
        error: "",
        fieldErrors: { email: "That email already has a BeOnGym account." },
      };
    }

    // Demoting the last active owner would strand the gym.
    if (staff.role === "GYM_OWNER" && d.role !== "GYM_OWNER" && staff.isActive) {
      if ((await activeOwnerCount(session.gymId, staff.id)) === 0) {
        return {
          ok: false,
          error: "This is your gym's only active owner. Promote someone else first.",
        };
      }
    }

    await db.$transaction([
      db.user.update({
        where: { id: staff.id },
        data: { name: d.name, email: d.email, phone: d.phone ?? null, role: d.role },
      }),
      db.trainerProfile.update({
        where: { userId: staff.id },
        data: { title: d.title ?? null, specialization: d.specialization ?? null },
      }),
    ]);

    revalidatePath("/gym/staff");
    return { ok: true, message: "Team member updated." };
  });
}

/**
 * Switches a staff login on or off. Deliberately not a delete: their plans,
 * sessions and notes stay attached to the gym's history.
 */
export async function setStaffActiveAction(
  staffId: string,
  isActive: boolean,
): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidOwner();

    if (staffId === session.userId) {
      return { ok: false, error: "You can't deactivate your own account." };
    }

    const staff = await db.user.findFirst({
      where: { id: staffId, gymId: session.gymId, role: { in: ["GYM_OWNER", "GYM_STAFF"] } },
      select: { id: true, name: true, role: true },
    });
    if (!staff) return { ok: false, error: "That person isn't on your team." };

    if (!isActive && staff.role === "GYM_OWNER") {
      if ((await activeOwnerCount(session.gymId, staff.id)) === 0) {
        return {
          ok: false,
          error: "This is your gym's only other owner. Promote someone else first.",
        };
      }
    }

    await db.user.update({ where: { id: staff.id }, data: { isActive, sessionVersion: { increment: 1 } } });

    revalidatePath("/gym/staff");
    return {
      ok: true,
      message: isActive
        ? `${staff.name} can sign in again.`
        : `${staff.name}'s access is switched off.`,
    };
  });
}

/** Owner-set temporary password, for when a staff member is locked out. */
export async function resetStaffPasswordAction(
  staffId: string,
  password: string,
): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidOwner();
    await enforceRateLimit("password-reset", session.userId, 10, 3600000);

    if (!validNewPassword(password)) {
      return { ok: false, error: "Use at least 8 characters and at most 72 UTF-8 bytes." };
    }

    const staff = await db.user.findFirst({
      where: { id: staffId, gymId: session.gymId, role: { in: ["GYM_OWNER", "GYM_STAFF"] } },
      select: { id: true, name: true },
    });
    if (!staff) return { ok: false, error: "That person isn't on your team." };

    await db.user.update({
      where: { id: staff.id },
      data: { passwordHash: await hashPassword(password), sessionVersion: { increment: 1 } },
    });

    revalidatePath("/gym/staff");
    return { ok: true, message: `New password set for ${staff.name}.` };
  });
}
