import { cn } from "@/lib/utils";

/**
 * A year of attendance, one square a day.
 *
 * The contribution-graph shape earns its keep here: a gym owner glances at it
 * and sees the shape of somebody's habit — the three-weeks-on, two-weeks-off
 * pattern that no monthly total shows. A filled square is a day they scanned
 * in; an empty one is a day they did not.
 *
 * Rendered on the server: it is a grid of divs and nothing about it needs to
 * think after it is painted.
 */

const DAY_MS = 86_400_000;
const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Local yyyy-mm-dd, so a visit at 11pm counts as that day and not the next. */
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function AttendanceGrid({
  visits,
  weeks = 53,
  className,
}: {
  /** Every check-in in the window. Multiple visits in a day count as one day. */
  visits: { at: Date | string }[];
  weeks?: number;
  className?: string;
}) {
  const counts = new Map<string, number>();
  for (const v of visits) {
    const key = dayKey(new Date(v.at));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // The grid ends on the Sunday of this week so the last column is always the
  // current one, and starts `weeks` Mondays earlier.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const offsetToSunday = (7 - ((today.getDay() + 6) % 7) - 1 + 7) % 7;
  const end = new Date(today.getTime() + offsetToSunday * DAY_MS);
  const start = new Date(end.getTime() - (weeks * 7 - 1) * DAY_MS);

  const columns: { date: Date; key: string; count: number; future: boolean }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const column: { date: Date; key: string; count: number; future: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getTime() + (w * 7 + d) * DAY_MS);
      const key = dayKey(date);
      column.push({ date, key, count: counts.get(key) ?? 0, future: date > today });
    }
    columns.push(column);
  }

  // A month label sits above the first column that begins that month.
  const monthLabels = columns.map((column, i) => {
    const first = column[0];
    const previous = columns[i - 1]?.[0];
    if (i === 0 || (previous && first.date.getMonth() !== previous.date.getMonth())) {
      return MONTHS[first.date.getMonth()];
    }
    return "";
  });

  const daysPresent = [...counts.keys()].length;
  const streak = currentStreak(counts, today);

  return (
    <div className={cn("min-w-0", className)}>
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex gap-1.5">
          <div className="flex flex-col gap-[3px] pt-[18px] pr-1">
            {WEEKDAY_LABELS.map((label, i) => (
              <span
                key={i}
                className="h-[11px] text-[9.5px] leading-[11px] text-[var(--subtle-foreground)]"
              >
                {label}
              </span>
            ))}
          </div>

          <div>
            <div className="flex gap-[3px]">
              {monthLabels.map((label, i) => (
                <span
                  key={i}
                  className="w-[11px] text-[9.5px] leading-[16px] whitespace-nowrap text-[var(--subtle-foreground)]"
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="flex gap-[3px]">
              {columns.map((column, i) => (
                <div key={i} className="flex flex-col gap-[3px]">
                  {column.map((cell) => (
                    <span
                      key={cell.key}
                      title={
                        cell.future
                          ? ""
                          : `${cell.count > 0 ? "Trained" : "No visit"} · ${cell.date.toDateString()}`
                      }
                      className={cn(
                        "size-[11px] rounded-[2px]",
                        cell.future
                          ? "bg-transparent"
                          : cell.count === 0
                            ? "bg-[var(--surface-muted)] ring-1 ring-[var(--border)] ring-inset"
                            : cell.count === 1
                              ? "bg-[var(--success)]/45"
                              : cell.count === 2
                                ? "bg-[var(--success)]/70"
                                : "bg-[var(--success)]",
                      )}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 text-[11.5px] text-muted-foreground">
        <span>
          <span className="tabular font-medium text-foreground">{daysPresent}</span> days trained in
          the last year
          {streak > 1 ? (
            <>
              {" · "}
              <span className="tabular font-medium text-foreground">{streak}</span> day streak
            </>
          ) : null}
        </span>
        <span className="flex items-center gap-1.5">
          Less
          <span className="size-[11px] rounded-[2px] bg-[var(--surface-muted)] ring-1 ring-[var(--border)] ring-inset" />
          <span className="size-[11px] rounded-[2px] bg-[var(--success)]/45" />
          <span className="size-[11px] rounded-[2px] bg-[var(--success)]/70" />
          <span className="size-[11px] rounded-[2px] bg-[var(--success)]" />
          More
        </span>
      </div>
    </div>
  );
}

/** Consecutive days up to today (or yesterday, if they have not been in yet). */
function currentStreak(counts: Map<string, number>, today: Date): number {
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const day = new Date(today.getTime() - i * DAY_MS);
    const has = (counts.get(dayKey(day)) ?? 0) > 0;
    if (has) streak += 1;
    else if (i > 0 || streak > 0) break;
  }
  return streak;
}
