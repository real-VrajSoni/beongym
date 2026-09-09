import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getValidSession } from "@/lib/auth";
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
  const [{ code }, { k }, session] = await Promise.all([params, searchParams, getValidSession()]);
  const gymCode = code.toUpperCase();

  const gym = await db.gym.findUnique({
    where: { code: gymCode },
    select: { id: true, name: true, accentColor: true, logoText: true },
  });
  if (!gym) notFound();

  // Not signed in, or signed in as staff on the desk tablet: send them to the
  // member sign-in and come straight back here afterwards.
  if (!session || session.role !== "MEMBER") {
    redirect(`/login?next=${encodeURIComponent(`/checkin/${gymCode}?k=${k ?? ""}`)}`);
  }

  // Scanned somebody else's poster: say so plainly rather than showing a
  // button that is going to be refused.
  if (gym.id !== session.gymId) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">
          That code belongs to {gym.name}
        </h1>
        <p className="mt-2 max-w-xs text-[13.5px] leading-relaxed text-muted-foreground">
          You are signed in as a member of {session.gymName ?? "another gym"}, so this check-in
          isn&rsquo;t yours to use.
        </p>
        <Link
          href="/me"
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-[13.5px] font-medium text-[var(--brand-foreground)]"
        >
          Back to my gym
        </Link>
      </div>
    );
  }

  const inside = await db.attendance.findFirst({
    where: { memberId: session.profileId!, checkOutAt: null },
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
