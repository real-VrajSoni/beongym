import Link from "next/link";
import { Users } from "lucide-react";

export type TodayClass = {
  id: string;
  name: string;
  startTime: string;
  durationMinutes: number;
  capacity: number;
  booked: number;
  coachName: string | null;
};

/** Today's timetable, with how full each class is. */
export function TodayClasses({ classes }: { classes: TodayClass[] }) {
  return (
    <ul className="divide-y divide-[var(--border)]">
      {classes.map((c) => {
        const full = c.booked >= c.capacity;
        return (
          <li key={c.id} className="flex items-center gap-4 px-5 py-3.5">
            <div className="w-16 shrink-0">
              <p className="tabular text-[13px] font-semibold">{c.startTime}</p>
              <p className="tabular text-[11.5px] text-muted-foreground">{c.durationMinutes} min</p>
            </div>
            <div className="h-9 w-px bg-[var(--border)]" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium">{c.name}</p>
              {c.coachName ? (
                <p className="truncate text-[12.5px] text-muted-foreground">
                  with {c.coachName.split(" ")[0]}
                </p>
              ) : null}
            </div>
            <Link
              href="/gym/classes"
              className="tabular inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-medium"
              style={{ color: full ? "var(--warning)" : "var(--muted-foreground)" }}
            >
              <Users className="size-3.5" />
              {c.booked}/{c.capacity}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
