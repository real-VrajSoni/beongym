import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getValidSession, requirePaidMember } from "@/lib/auth";
import { CheckInConfirm } from "@/components/attendance/checkin-confirm";

export const metadata = { title: "Check in" };

/**
 * Where a scanned QR lands.
 *
 * Deliberately a page with a button rather than a check-in on load: a GET that
 * writes gets fired twice by a prefetching browser and once more by a link
 * preview, and a member does not want to be checked in and straight back out
 * because their phone was being helpful.
 */
export default async function CheckInPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const [{ code }, { k }, current] = await Promise.all([params, searchParams, getValidSession()]);
  const gymCode = code.toUpperCase();
  if (!current || current.role !== "MEMBER") {
    redirect(`/login?next=${encodeURIComponent(`/checkin/${gymCode}?k=${k ?? ""}`)}`);
  }
  const session = await requirePaidMember();

  const gym = await db.gym.findFirst({
    where: { code: gymCode, id: session.gymId },
    select: { id: true, name: true, accentColor: true, logoText: true },
  });
  if (!gym) notFound();

  const inside = await db.attendance.findFirst({
    where: { memberId: session.profileId, gymId: session.gymId, checkOutAt: null },
    select: { id: true, checkInAt: true },
  });

  return (
    <CheckInConfirm
      gymCode={gymCode}
      gymName={gym.name}
      accentColor={gym.accentColor}
      mark={gym.logoText ?? gym.name.slice(0, 2).toUpperCase()}
      code={k ?? ""}
      alreadyInside={inside !== null}
      since={inside?.checkInAt.toISOString() ?? null}
      memberName={session.name}
    />
  );
}
