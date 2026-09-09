import Link from "next/link";
import { ClipboardCheck, CreditCard, Repeat } from "lucide-react";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS = {
  "check-in": { icon: ClipboardCheck, className: "bg-[var(--info-soft)] text-[var(--info)]" },
  subscription: { icon: Repeat, className: "bg-[var(--brand-soft)] text-[var(--brand-soft-foreground)]" },
  payment: { icon: CreditCard, className: "bg-[var(--success-soft)] text-[var(--success)]" },
} as const;

export type ActivityItem = {
  id: string;
  kind: string;
  who: string;
  text: string;
  at: Date;
  href: string;
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <ul className="space-y-0.5 p-2">
      {items.map((item) => {
        const meta = ICONS[item.kind as keyof typeof ICONS] ?? ICONS["check-in"];
        const Icon = meta.icon;
        return (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--surface-hover)]"
            >
              <span
                className={cn(
                  "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                  meta.className,
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-snug">
                  <span className="font-medium">{item.who}</span>{" "}
                  <span className="text-muted-foreground">{item.text}</span>
                </p>
                <p className="mt-0.5 text-[11.5px] text-[var(--subtle-foreground)]">
                  {relativeTime(item.at)}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
