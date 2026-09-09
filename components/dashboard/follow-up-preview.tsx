import Link from "next/link";
import { Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateShort } from "@/lib/format";

export type FollowUpRow = {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  interest: string | null;
  dueOn: string;
  daysOverdue: number;
};

/** The calls owed today, overdue first. */
export function FollowUpPreview({ rows }: { rows: FollowUpRow[] }) {
  return (
    <ul className="divide-y divide-[var(--border)]">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
          <div className="min-w-0">
            <Link href="/gym/leads" className="text-[13.5px] font-medium hover:underline">
              {r.name}
            </Link>
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
              {r.interest ?? "No note"} · due {formatDateShort(r.dueOn)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {r.daysOverdue > 0 ? (
              <Badge tone="warning">{r.daysOverdue}d late</Badge>
            ) : (
              <Badge tone="outline">Today</Badge>
            )}
            {r.phone ? (
              <a
                href={`tel:${r.phone.replace(/\s/g, "")}`}
                aria-label={`Call ${r.name}`}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-[var(--surface-muted)] hover:text-foreground"
              >
                <Phone className="size-3.5" />
              </a>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
