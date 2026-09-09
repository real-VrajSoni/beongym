"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Check, Clock, Users } from "lucide-react";
import { bookClassAction, cancelBookingAction } from "@/app/actions/classes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useAction } from "@/components/ui/use-action";
import { formatDayLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export type MemberSlotRow = {
  classId: string;
  name: string;
  description: string | null;
  coachName: string | null;
  date: string;
  startTime: string;
  durationMinutes: number;
  capacity: number;
  booked: number;
  spotsLeft: number;
  myBooking: { id: string; status: string } | null;
};

/**
 * A member booking their own spot.
 *
 * The only place in the member app where a member changes anything, and it is
 * deliberate: capacity answers the request, not a person. Nobody at the gym has
 * to approve, decline or reply to any of this.
 */
export function MemberClasses({ slots }: { slots: MemberSlotRow[] }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [busy, setBusy] = useState<string | null>(null);

  if (slots.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
        <EmptyState
          icon={CalendarRange}
          title="No classes on the timetable"
          description="Your gym hasn't put any group classes up yet. When they do, you'll be able to book your spot here."
        />
      </div>
    );
  }

  const byDay = new Map<string, MemberSlotRow[]>();
  for (const s of slots) {
    const key = s.date.slice(0, 10);
    byDay.set(key, [...(byDay.get(key) ?? []), s]);
  }

  return (
    <div className="space-y-6">
      {[...byDay.entries()].map(([day, rows]) => (
        <section key={day}>
          <h2 className="mb-2.5 text-[12.5px] font-medium tracking-wide text-[var(--subtle-foreground)] uppercase">
            {formatDayLabel(rows[0].date)}
          </h2>
          <div className="space-y-2.5">
            {rows.map((s) => {
              const key = `${s.classId}:${s.date}`;
              const mine = s.myBooking;
              const waitlisted = mine?.status === "WAITLIST";
              const full = s.spotsLeft === 0 && !mine;

              return (
                <div
                  key={key}
                  className={cn(
                    "rounded-xl border bg-[var(--surface)] p-4",
                    mine ? "border-[var(--brand)]/40" : "border-[var(--border)]",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[14px] font-medium">{s.name}</p>
                        {mine ? (
                          <Badge tone={waitlisted ? "warning" : "brand"} dot>
                            {waitlisted ? "Waitlist" : "Booked"}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="size-3.5" />
                          {s.startTime} · {s.durationMinutes} min
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="size-3.5" />
                          {s.spotsLeft > 0 ? `${s.spotsLeft} spots left` : "Full"}
                        </span>
                        {s.coachName ? <span>with {s.coachName.split(" ")[0]}</span> : null}
                      </p>
                      {s.description ? (
                        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                          {s.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="shrink-0">
                      {mine ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={pending && busy === key}
                          onClick={() => {
                            setBusy(key);
                            run(() => cancelBookingAction(mine.id), {
                              onSuccess: () => router.refresh(),
                            });
                          }}
                        >
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant={full ? "secondary" : "primary"}
                          loading={pending && busy === key}
                          onClick={() => {
                            setBusy(key);
                            run(() => bookClassAction(s.classId, s.date), {
                              onSuccess: () => router.refresh(),
                            });
                          }}
                        >
                          {full ? "Join waitlist" : <><Check /> Book</>}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
