import { redirect } from "next/navigation";
import { hasAccess } from "@/lib/platform-plans";
import { PauseCircle } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Paused" };

/**
 * Where a member lands when their gym's own membership of BeOnGym has lapsed.
 *
 * Their gym owes us, not them — so the page says what happened in one line,
 * doesn't ask them for money, and doesn't imply their gym has done anything
 * wrong. Their data is untouched and comes back the moment the gym renews.
 */
export default async function MemberPausedPage() {
  const session = await requireMember();
  if (hasAccess(session.gymTier ?? "PRO", session.gymAccessExpiresAt)) redirect("/me");
  const gym = await db.gym.findUniqueOrThrow({
    where: { id: session.gymId },
    select: { name: true, phone: true },
  });

  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--warning-soft)] text-[var(--warning)]">
        <PauseCircle className="size-6" />
      </span>
      <h1 className="mt-5 text-[22px] leading-tight font-semibold tracking-[-0.02em]">
        This app is paused
      </h1>
      <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
        {gym.name}&rsquo;s BeOnGym subscription has run out, so the member app is switched off for
        now. Nothing of yours has been deleted — your membership, payments and progress are all
        still there, and everything comes back the moment your gym renews.
      </p>
      <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
        Your membership at the gym itself is unaffected. Train as usual.
        {gym.phone ? (
          <>
            {" "}
            If you need anything, call them on{" "}
            <a
              href={`tel:${gym.phone.replace(/\s/g, "")}`}
              className="font-medium text-[var(--brand)] hover:underline"
            >
              {gym.phone}
            </a>
            .
          </>
        ) : null}
      </p>
      <form action={logoutAction} className="mt-7">
        <Button type="submit" variant="secondary">
          Sign out
        </Button>
      </form>
    </div>
  );
}
