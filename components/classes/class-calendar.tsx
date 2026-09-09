"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CalendarRange, Plus, RotateCcw, Users } from "lucide-react";
import { cancelOccurrenceAction, restoreOccurrenceAction } from "@/app/actions/classes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAction } from "@/components/ui/use-action";
import { cn } from "@/lib/utils";

export type CalendarClassRow = {
  id: string;
  name: string;
  startTime: string;
  durationMinutes: number;
  capacity: number;
  booked: number;
  coachName: string | null;
  oneOff: boolean;
  cancelled: boolean;
  cancelReason: string | null;
};

export type CalendarDayRow = { date: string; classes: CalendarClassRow[] };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * The fortnight, as two rows of seven.
 *
 * Two weeks is the horizon an owner actually plans on — far enough to schedule
 * a guest coach or block out a holiday, near enough that everything on it is
 * still true. Members book inside the same window, so what an owner sees here
 * is exactly what a member sees in the app.
 */
export function ClassCalendar({
  days,
  onAddOneOff,
}: {
  days: CalendarDayRow[];
  /** Opens the class form with this date pre-filled. */
  onAddOneOff: (isoDate: string) => void;
}) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [busy, setBusy] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((day) => {
        const date = new Date(day.date);
        const isToday = day.date.slice(0, 10) === today;
        const weekday = WEEKDAYS[(date.getUTCDay() + 6) % 7];

        return (
          <div
            key={day.date}
            className={cn(
              "flex min-h-36 flex-col rounded-xl border p-2.5",
              isToday
                ? "border-[var(--brand)]/50 bg-[var(--brand-soft)]/40"
                : "border-[var(--border)] bg-[var(--surface)]",
            )}
          >
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[11.5px] font-medium tracking-wide text-[var(--subtle-foreground)] uppercase">
                {weekday}
              </span>
              <span
                className={cn(
                  "tabular text-[13px] font-semibold",
                  isToday ? "text-[var(--brand)]" : "text-foreground",
                )}
              >
                {date.getUTCDate()}
              </span>
            </div>

            <div className="flex-1 space-y-1.5">
              {day.classes.length === 0 ? (
                <p className="pt-2 text-center text-[11.5px] text-[var(--subtle-foreground)]">—</p>
              ) : (
                day.classes.map((c) => {
                  const busyKey = `${c.id}:${day.date}`;
                  const full = c.booked >= c.capacity;
                  return (
                    <div
                      key={busyKey}
                      className={cn(
                        "rounded-lg border px-2 py-1.5",
                        c.cancelled
                          ? "border-dashed border-[var(--border)] opacity-60"
                          : "border-[var(--border)] bg-[var(--surface-muted)]",
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-1.5">
                        <span className="tabular text-[11px] font-semibold text-[var(--brand)]">
                          {c.startTime}
                        </span>
                        {c.oneOff ? (
                          <span className="text-[9.5px] font-semibold tracking-wide text-[var(--warning)] uppercase">
                            One-off
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={cn(
                          "truncate text-[12px] font-medium",
                          c.cancelled && "line-through",
                        )}
                      >
                        {c.name}
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <span className="tabular inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
                          <Users className="size-3" />
                          {c.booked}/{c.capacity}
                          {full && !c.cancelled ? " full" : ""}
                        </span>
                        <button
                          type="button"
                          disabled={pending && busy === busyKey}
                          onClick={() => {
                            setBusy(busyKey);
                            run(
                              () =>
                                c.cancelled
                                  ? restoreOccurrenceAction(c.id, day.date)
                                  : cancelOccurrenceAction(c.id, day.date),
                              { onSuccess: () => router.refresh() },
                            );
                          }}
                          aria-label={c.cancelled ? "Put this class back on" : "Cancel this class"}
                          className="rounded p-0.5 text-[var(--subtle-foreground)] hover:text-foreground"
                        >
                          {c.cancelled ? (
                            <RotateCcw className="size-3" />
                          ) : (
                            <Ban className="size-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 w-full text-[11.5px]"
              onClick={() => onAddOneOff(day.date.slice(0, 10))}
            >
              <Plus className="size-3" /> Add
            </Button>
          </div>
        );
      })}
    </div>
  );
}

/** Shown above the calendar so the fortnight's shape is legible at a glance. */
export function CalendarSummary({ days }: { days: CalendarDayRow[] }) {
  const running = days.reduce((n, d) => n + d.classes.filter((c) => !c.cancelled).length, 0);
  const cancelled = days.reduce((n, d) => n + d.classes.filter((c) => c.cancelled).length, 0);
  const seats = days.reduce(
    (n, d) => n + d.classes.filter((c) => !c.cancelled).reduce((m, c) => m + c.capacity, 0),
    0,
  );
  const booked = days.reduce(
    (n, d) => n + d.classes.filter((c) => !c.cancelled).reduce((m, c) => m + c.booked, 0),
    0,
  );

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
      <Badge tone="outline">
        <CalendarRange className="mr-1 size-3" />
        {running} classes over the next fortnight
      </Badge>
      {cancelled > 0 ? <Badge tone="warning">{cancelled} cancelled</Badge> : null}
      {seats > 0 ? (
        <span className="tabular">
          {booked}/{seats} seats taken ({Math.round((booked / seats) * 100)}%)
        </span>
      ) : null}
    </div>
  );
}
