import {
  BarChart3,
  CalendarRange,
  ClipboardCheck,
  Filter,
  Globe2,
  MessageCircle,
  QrCode,
  Receipt,
  Salad,
  Smartphone,
  UserCog,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Everything the platform does, on one wall.
 *
 * Each card says plainly whether it is running today or still being built.
 * Selling a gym owner a feature that does not exist yet buys one month of
 * revenue and loses the account — so "In build" is printed on the card rather
 * than hidden in a footnote, and every plan includes the lot as it lands.
 */

type Feature = {
  icon: LucideIcon;
  title: string;
  body: string;
  tint: string;
  /** False while the feature is still being built. */
  live?: boolean;
  /** Draws the eye to the one nobody else on the market has. */
  highlight?: boolean;
};

const FEATURES: Feature[] = [
  {
    icon: Globe2,
    title: "The world map",
    body: "Your gym's pin and store page on a globe members actually search — with your logo, links and a count of everyone who clicked through.",
    tint: "#7c6cff",
    live: true,
    highlight: true,
  },
  {
    icon: Users,
    title: "Member management",
    body: "Full profiles, auto-issued member codes, payment history and live subscriptions at a glance.",
    tint: "#5aa2f5",
    live: true,
  },
  {
    icon: Receipt,
    title: "Billing & payments",
    body: "Every payment against the right membership, with dues, renewals and collections tracked to the day. Card and UPI checkout arrives with Dodo.",
    tint: "#a78bfa",
    live: true,
  },
  {
    icon: ClipboardCheck,
    title: "Attendance",
    body: "Live occupancy, peak hours, and a year of every member's visits as a wall of squares — the fastest way to see who is drifting.",
    tint: "#3ecf7e",
    live: true,
  },
  {
    icon: UserCog,
    title: "Staff management",
    body: "Owner and front-desk roles with their own access levels, so revenue and billing stay yours alone.",
    tint: "#f0709f",
    live: true,
  },
  {
    icon: BarChart3,
    title: "Reports & analytics",
    body: "Revenue, retention, dues outstanding, who has stopped turning up and which programme earns most.",
    tint: "#2dd4bf",
    live: true,
  },
  {
    icon: Salad,
    title: "Diet & training plans",
    body: "Training splits and macro targets attached to a programme once, and every member on it has their day laid out.",
    tint: "#3ecf7e",
    live: true,
  },
  {
    icon: MessageCircle,
    title: "WhatsApp reminders",
    body: "Expiry, dues and birthdays worked out for you and written for you — one tap sends them from your own number. Fully automatic sending lands with the Business API.",
    tint: "#25d366",
    live: true,
  },
  {
    icon: Smartphone,
    title: "Member app & portal",
    body: "Your gym's own app for your members: their plan, dues, progress and programme, in your colours — and no queue of requests for your desk to answer.",
    tint: "#f0696f",
    live: true,
  },
  {
    icon: QrCode,
    title: "QR check-in",
    body: "One printed code by the door, yours for good. Members scan on the way in and again on the way out — no turnstile, no card reader.",
    tint: "#a78bfa",
    live: true,
  },
  {
    icon: CalendarRange,
    title: "Class scheduling",
    body: "A weekly timetable with room capacity. Members book their own spot from the app and the waitlist moves itself when somebody cancels.",
    tint: "#5aa2f5",
    live: true,
  },
  {
    icon: Filter,
    title: "Enquiries & follow-ups",
    body: "Every walk-in and Instagram message, with a date to ring them back — and the conversion rate that tells you whether the ringing works.",
    tint: "#e8a33d",
    live: true,
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="scroll-mt-20 border-t border-[var(--mk-border)]">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-[11.5px] font-semibold tracking-[0.18em] text-[var(--mk-fg-subtle)] uppercase">
            Everything, in one plan
          </p>
          <h2 className="mt-3 text-[32px] leading-tight font-semibold tracking-[-0.02em]">
            One platform, front desk to phone.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--mk-fg-muted)]">
            Most gyms run on a paper register, a WhatsApp group and a spreadsheet only one person
            understands. This replaces all three, and every plan includes all twelve — no tier above
            yours holding something back.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body, tint, live: isLive, highlight }) => (
            <div
              key={title}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-[var(--mk-panel)] p-5 transition-all duration-300 hover:-translate-y-1",
                highlight
                  ? "border-[var(--brand)]/45 bg-[var(--brand)]/[0.06]"
                  : "border-[var(--mk-border-strong)] hover:border-[var(--mk-fg-subtle)]/40",
              )}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-40"
                style={{ background: tint }}
              />

              <div className="relative flex items-start justify-between gap-2">
                <span
                  className="flex size-10 items-center justify-center rounded-xl border"
                  style={{
                    borderColor: `${tint}40`,
                    background: `${tint}1f`,
                    color: tint,
                  }}
                >
                  <Icon className="size-[18px]" />
                </span>
                {isLive ? null : (
                  <span className="rounded-full border border-[var(--mk-border-strong)] bg-[var(--mk-panel-strong)] px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-[var(--mk-fg-subtle)] uppercase">
                    In build
                  </span>
                )}
              </div>

              <h3 className="relative mt-4 text-[14.5px] font-semibold">{title}</h3>
              <p className="relative mt-1.5 text-[12.5px] leading-relaxed text-[var(--mk-fg-muted)]">
                {body}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-[12.5px] text-[var(--mk-fg-subtle)]">
          Nothing on this wall is an upsell. Every plan — 30 days or lifetime — includes all of it.
        </p>
      </div>
    </section>
  );
}
