import { CalendarCheck, CreditCard, PhoneCall, RefreshCw, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * What the product is actually for.
 *
 * Five rows, not a wall of features. Each one names the paper it replaces
 * first, because that is the thing a gym owner recognises — nobody wakes up
 * wanting "member management", they wake up unable to find the register.
 *
 * Rows rather than cards: five items divide badly into a grid, and a row can
 * carry "instead of X → you get Y" in one readable line, which a card cannot.
 */

type Pillar = {
  icon: LucideIcon;
  /** The thing on the counter today. */
  instead: string;
  name: string;
  body: string;
  tint: string;
};

const PILLARS: Pillar[] = [
  {
    icon: Users,
    instead: "the register and a drawer of forms",
    name: "Members",
    body: "Every member in one list, with their own code, their plan, their history and their number. Searchable at the desk while they are standing there.",
    tint: "#7c6cff",
  },
  {
    icon: CreditCard,
    instead: "the payment notebook",
    name: "Payments",
    body: "What was paid, when, by which method, against which membership — and what is still owed. Collections for the month, without adding anything up.",
    tint: "#3ecf7e",
  },
  {
    icon: CalendarCheck,
    instead: "the attendance sheet",
    name: "Attendance",
    body: "A code by the door members scan on the way in and out. Live occupancy, your real peak hours, and a year of every member's visits at a glance.",
    tint: "#2dd4bf",
  },
  {
    icon: RefreshCw,
    instead: "remembering",
    name: "Renewals",
    body: "Who runs out this week, who has already lapsed, and who has stopped turning up long before they cancel. The renewal conversation, before it becomes a refund.",
    tint: "#e8a33d",
  },
  {
    icon: PhoneCall,
    instead: "scattered WhatsApp follow-ups",
    name: "Enquiries",
    body: "Every walk-in and message in one list with a date to ring them back, and the number that says how many of them joined.",
    tint: "#f0709f",
  },
];

export function Pillars() {
  return (
    <section id="what" className="scroll-mt-20 border-t border-[var(--mk-border)]">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-[11.5px] font-semibold tracking-[0.18em] text-[var(--mk-fg-subtle)] uppercase">
            What it replaces
          </p>
          <h2 className="mt-3 text-[32px] leading-tight font-semibold tracking-[-0.02em]">
            Five things off the counter.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--mk-fg-muted)]">
            Most gyms already have a system. It is a register, a spreadsheet, a payment notebook, an
            attendance sheet and a WhatsApp group — and only one person understands all five. This
            is those five, joined up.
          </p>
        </div>

        <ul className="mt-10 divide-y divide-[var(--mk-border)] overflow-hidden rounded-3xl border border-[var(--mk-border-strong)] bg-[var(--mk-panel)]">
          {PILLARS.map(({ icon: Icon, instead, name, body, tint }) => (
            <li key={name} className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:gap-6">
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl border"
                style={{ borderColor: `${tint}40`, background: `${tint}1a`, color: tint }}
              >
                <Icon className="size-5" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] tracking-[0.14em] text-[var(--mk-fg-subtle)] uppercase">
                  Instead of {instead}
                </p>
                <h3 className="mt-1.5 text-[18px] font-semibold tracking-[-0.01em]">{name}</h3>
                <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-[var(--mk-fg-muted)]">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
