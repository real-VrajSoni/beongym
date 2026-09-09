
/**
 * A static rendering of the gym owner dashboard, built from the same tokens as
 * the real one so it stays honest in both themes. Not a screenshot: it scales,
 * themes and localises, and never goes stale against the product.
 */
const KPIS = [
  { label: "Active members", value: "142", note: "on a live membership" },
  { label: "Revenue this month", value: "₹2.4L", note: "▲ 18% vs last" },
  { label: "Inside now", value: "23", note: "live occupancy" },
  { label: "Pending check-ins", value: "6", note: "awaiting review" },
];

const SCHEDULE = [
  { time: "10:00 AM", type: "Progress Review", who: "Rahul Sharma", mark: "RS" },
  { time: "2:00 PM", type: "Consultation", who: "Rohan Desai", mark: "RD" },
  { time: "5:30 PM", type: "Follow-up", who: "Meera Reddy", mark: "MR" },
];

const ATTENTION = [
  { who: "Priya Shah", mark: "PS", note: "Check-in awaiting review", tone: "info" },
  { who: "Kabir Joshi", mark: "KJ", note: "Due 13 days ago", tone: "warn" },
];

export function DashboardPreview() {
  return (
    <div className="relative">
      {/* Gym owner dashboard */}
      <div className="overflow-hidden rounded-2xl border border-[var(--mk-border-strong)] bg-[var(--mk-preview)] shadow-2xl">
        {/* Window chrome */}
        <div className="flex items-center gap-2.5 border-b border-[var(--mk-border)] px-4 py-3">
          <span className="flex size-6 items-center justify-center rounded-md bg-[var(--brand)] text-[10px] font-bold text-[var(--brand-foreground)]">
            IT
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium">Iron Temple Fitness</p>
            <p className="font-mono text-[9.5px] text-[var(--mk-fg-subtle)]">IRON-4821</p>
          </div>
          <span className="ml-auto rounded-full bg-[var(--mk-panel-strong)] px-2 py-0.5 text-[10px] text-[var(--mk-fg-subtle)]">
            Owner
          </span>
        </div>

        <div className="p-4">
          <p className="text-[14px] font-semibold">Good evening, Rohit</p>
          <p className="text-[11.5px] text-[var(--mk-fg-subtle)]">
            Here&rsquo;s what&rsquo;s happening at your gym today.
          </p>

          <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {KPIS.map((k) => (
              <div
                key={k.label}
                className="rounded-xl border border-[var(--mk-border)] bg-[var(--mk-panel)] p-2.5"
              >
                <p className="truncate text-[9.5px] text-[var(--mk-fg-subtle)]">{k.label}</p>
                <p className="tabular mt-1 text-[16px] font-semibold">{k.value}</p>
                <p className="truncate text-[9.5px] text-[var(--mk-fg-subtle)]">{k.note}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-5">
            {/* Today's schedule */}
            <div className="rounded-xl border border-[var(--mk-border)] bg-[var(--mk-panel)] p-3 sm:col-span-3">
              <p className="text-[11.5px] font-medium">Today&rsquo;s schedule</p>
              <ul className="mt-2.5 space-y-2">
                {SCHEDULE.map((s) => (
                  <li key={s.time} className="flex items-center gap-2.5">
                    <span className="tabular w-14 shrink-0 text-[10px] text-[var(--mk-fg-subtle)]">
                      {s.time}
                    </span>
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--mk-panel-strong)] text-[9px] font-semibold text-[var(--mk-fg-muted)]">
                      {s.mark}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-medium">{s.type}</span>
                      <span className="block truncate text-[9.5px] text-[var(--mk-fg-subtle)]">
                        {s.who}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-md border border-[var(--mk-border-strong)] px-1.5 py-0.5 text-[9.5px] text-[var(--mk-fg-muted)]">
                      Confirmed
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Needs attention */}
            <div className="rounded-xl border border-[var(--mk-border)] bg-[var(--mk-panel)] p-3 sm:col-span-2">
              <p className="text-[11.5px] font-medium">Needs attention</p>
              <ul className="mt-2.5 space-y-2.5">
                {ATTENTION.map((a) => (
                  <li key={a.who} className="flex items-start gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--mk-panel-strong)] text-[9px] font-semibold text-[var(--mk-fg-muted)]">
                      {a.mark}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-medium">{a.who}</span>
                      <span
                        className={
                          a.tone === "warn"
                            ? "block truncate text-[9.5px] text-[var(--warning)]"
                            : "block truncate text-[9.5px] text-[var(--info)]"
                        }
                      >
                        {a.note}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--mk-panel-strong)]">
                <div className="h-full w-[72%] rounded-full bg-[var(--brand)]" />
              </div>
              <p className="mt-1.5 text-[9.5px] text-[var(--mk-fg-subtle)]">
                72% of check-ins reviewed
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
