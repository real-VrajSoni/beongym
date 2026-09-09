"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePaidMember, requirePaidOwner, requirePaidStaff } from "@/lib/auth";
import { guard, type ActionResult } from "@/lib/action-result";
import { checkInCodeMatches, newCheckInCode } from "@/lib/checkin-token";

/** Front-desk check-in. Refuses a second open visit for the same member. */
export async function checkInMemberAction(memberId: string): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();

    const member = await db.clientProfile.findFirst({
      where: { id: memberId, gymId: session.gymId },
      include: { user: { select: { name: true } } },
    });
    if (!member) return { ok: false, error: "That member isn't on your roster." };

    const open = await db.attendance.findFirst({
      where: { memberId, checkOutAt: null },
      select: { id: true },
    });
    if (open) return { ok: false, error: `${member.user.name} is already checked in.` };

    await db.attendance.create({
      data: { gymId: session.gymId, memberId, source: "FRONT_DESK" },
    });

    revalidatePath("/gym/attendance");
    revalidatePath("/gym/dashboard");
    return { ok: true, message: `${member.user.name} checked in.` };
  });
}

export async function checkOutMemberAction(attendanceId: string): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidStaff();

    const visit = await db.attendance.findFirst({
      where: { id: attendanceId, gymId: session.gymId, checkOutAt: null },
      include: { member: { include: { user: { select: { name: true } } } } },
    });
    if (!visit) return { ok: false, error: "That visit is already closed." };

    await db.attendance.update({
      where: { id: visit.id },
      data: { checkOutAt: new Date() },
    });

    revalidatePath("/gym/attendance");
    revalidatePath("/gym/dashboard");
    return { ok: true, message: `${visit.member.user.name} checked out.` };
  });
}

/**
 * Issue the gym a new check-in code.
 *
 * The one thing a permanent code needs: a way to kill it. If a poster walks or
 * somebody shares the link, this makes every copy of it dead and prints a new
 * one. Owner-only, because it invalidates a poster on somebody else's wall.
 */
export async function resetCheckInCodeAction(): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidOwner();

    await db.gym.update({
      where: { id: session.gymId },
      data: { checkInCode: newCheckInCode() },
    });

    revalidatePath("/gym/attendance");
    revalidatePath("/gym/attendance/qr");
    return { ok: true, message: "New code issued. Print the poster again — the old one is dead." };
  });
}

/**
 * A member checking themselves in by scanning that code.
 *
 * Two things have to be true: the scanner is a member of *this* gym, and the
 * token is one this gym's screen is showing right now. Neither the gym code in
 * the URL nor the token alone is enough — the first is public, and the second
 * is useless a couple of minutes later.
 *
 * Scanning again closes the visit. One code on the wall does both directions,
 * because a second poster saying "check out here" is a poster nobody reads.
 */
export async function qrCheckInAction(gymCode: string, code: string): Promise<ActionResult> {
  return guard(async () => {
    const session = await requirePaidMember();

    const gym = await db.gym.findFirst({
      where: { id: session.gymId, code: gymCode.toUpperCase() },
      select: { id: true, name: true, checkInCode: true },
    });
    if (!gym) return { ok: false, error: "That code belongs to a different gym." };

    if (!checkInCodeMatches(gym.checkInCode, code)) {
      return {
        ok: false,
        error: "That poster is out of date — your gym has issued a new code. Ask at the desk.",
      };
    }

    const open = await db.attendance.findFirst({
      where: { memberId: session.profileId, checkOutAt: null },
      select: { id: true },
    });

    if (open) {
      await db.attendance.update({ where: { id: open.id }, data: { checkOutAt: new Date() } });
      revalidatePath("/gym/attendance");
      revalidatePath("/me");
      return { ok: true, message: `Checked out of ${gym.name}. See you next time.` };
    }

    await db.attendance.create({
      data: { gymId: gym.id, memberId: session.profileId, source: "MEMBER_APP" },
    });
    revalidatePath("/gym/attendance");
    revalidatePath("/me");
    return { ok: true, message: `You're in. Have a good session.` };
  });
}
