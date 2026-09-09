"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, DoorOpen, LogOut } from "lucide-react";
import { qrCheckInAction } from "@/app/actions/attendance";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/ui/use-action";
import { formatTime } from "@/lib/format";

/**
 * One button, one job.
 *
 * A member has just pointed their camera at the code on the wall, so this
 * screen has to be readable at arm's length and finishable in one tap. The same
 * code checks them out later — the button says which one it is doing.
 */
export function CheckInConfirm({
  gymCode,
  gymName,
  accentColor,
  mark,
  code,
  alreadyInside,
  since,
  memberName,
}: {
  gymCode: string;
  gymName: string;
  accentColor: string | null;
  mark: string;
  code: string;
  alreadyInside: boolean;
  since: string | null;
  memberName: string;
}) {
  const { pending, error, run } = useAction();
  const [done, setDone] = useState<string | null>(null);
  const accent = accentColor ?? "var(--brand)";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] px-6 py-10">
      <span
        className="flex size-14 items-center justify-center rounded-2xl text-[18px] font-bold text-white"
        style={{ background: accent }}
      >
        {mark}
      </span>
      <p className="mt-4 text-[13px] text-muted-foreground">{gymName}</p>

      {done ? (
        <>
          <span className="mt-6 flex size-12 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
            <Check className="size-6" />
          </span>
          <h1 className="mt-4 text-center text-[24px] leading-tight font-semibold tracking-[-0.02em]">
            {done}
          </h1>
          <Button asChild className="mt-7">
            <Link href="/me">
              Back to my gym <ArrowRight />
            </Link>
          </Button>
        </>
      ) : (
        <>
          <h1 className="mt-5 text-center text-[26px] leading-tight font-semibold tracking-[-0.02em]">
            {alreadyInside ? "Checking out?" : `Hello, ${memberName.split(" ")[0]}.`}
          </h1>
          <p className="mt-2 max-w-xs text-center text-[13.5px] leading-relaxed text-muted-foreground">
            {alreadyInside
              ? `You've been in since ${since ? formatTime(since) : "earlier"}. Tap below to close the visit.`
              : "Tap once and you're on the floor. Scan the same code on your way out."}
          </p>

          {error ? (
            <p className="mt-4 max-w-xs rounded-lg border border-[var(--warning)]/25 bg-[var(--warning-soft)] px-3.5 py-2.5 text-center text-[12.5px] leading-relaxed text-[var(--warning)]">
              {error}
            </p>
          ) : null}

          <Button
            size="lg"
            className="mt-7 h-12 w-full max-w-xs"
            loading={pending}
            onClick={() =>
              run(() => qrCheckInAction(gymCode, code), {
                onSuccess: (result) => setDone(result.message ?? "Done."),
              })
            }
          >
            {alreadyInside ? (
              <>
                <LogOut /> Check out
              </>
            ) : (
              <>
                <DoorOpen /> Check in
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
