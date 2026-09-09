"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Select } from "./input";
import { cn } from "@/lib/utils";

/**
 * A date field you can actually type into.
 *
 * The native `<input type="date">` is the wrong control twice over here. Inside
 * a dialog its picker is a browser-drawn layer the dialog's focus trap fights
 * with, and for a date of birth it is hopeless anyway: reaching 1994 from
 * today's month is thirty clicks on a chevron.
 *
 * So: type `12/05/1994` and it is understood, or open a calendar that has month
 * and year as dropdowns. The value posted to the server is a hidden field in
 * ISO form, so nothing downstream had to change.
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** ISO `yyyy-mm-dd` → what a person reads. Anything else comes back empty. */
function isoToDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/**
 * `dd/mm/yyyy` → ISO, and only when the date is real.
 *
 * The round-trip check is what rejects 31/02: `new Date` rolls that forward to
 * March rather than complaining, so a date that comes back as a different day
 * was never a date.
 */
function displayToIso(text: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

/** Slashes as you type, so nobody has to remember the separator. */
function autoFormat(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join("/");
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Monday-first offset for the 1st of a month. */
function leadingBlanks(year: number, month: number): number {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return (first + 6) % 7;
}

export function DateField({
  name,
  id,
  defaultValue = "",
  value: controlled,
  onChange,
  required = false,
  disabled = false,
  /**
   * Which way the year list runs. Birthdays go backwards from this year and
   * open around adulthood; everything else stays near today.
   */
  purpose = "recent",
  className,
}: {
  name?: string;
  id?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (iso: string) => void;
  required?: boolean;
  disabled?: boolean;
  purpose?: "birthday" | "recent";
  className?: string;
}) {
  const isControlled = controlled !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const iso = isControlled ? controlled : internal;

  const [text, setText] = useState(() => isoToDisplay(defaultValue || controlled || ""));
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const thisYear = new Date().getFullYear();

  // The month the calendar is looking at. Follows the value when there is one,
  // otherwise opens somewhere useful rather than at January 1930.
  const parsed = iso ? new Date(`${iso}T00:00:00Z`) : null;
  const [viewYear, setViewYear] = useState(
    parsed ? parsed.getUTCFullYear() : purpose === "birthday" ? thisYear - 25 : thisYear,
  );
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.getUTCMonth() : new Date().getMonth());

  const years = useMemo(() => {
    const list =
      purpose === "birthday"
        ? // 1930 → today, newest first: a 34-year-old finds their year in one flick.
          Array.from({ length: thisYear - 1930 + 1 }, (_, i) => thisYear - i)
        : Array.from({ length: 8 }, (_, i) => thisYear - 2 + i);
    // Whatever year is on screen has to be in the list, or the dropdown shows a
    // year it cannot represent — which is what happens the moment somebody
    // types 1994 into a field that only offers the next few years.
    return list.includes(viewYear)
      ? list
      : [...list, viewYear].sort((a, b) => (purpose === "birthday" ? b - a : a - b));
  }, [purpose, thisYear, viewYear]);

  // Keep the text box and the calendar in step when the value is driven from
  // outside (a form reset, or an edit dialog opening on a different record).
  const [lastIso, setLastIso] = useState(iso);
  if (iso !== lastIso) {
    setLastIso(iso);
    setText(isoToDisplay(iso));
    if (iso) {
      const d = new Date(`${iso}T00:00:00Z`);
      setViewYear(d.getUTCFullYear());
      setViewMonth(d.getUTCMonth());
    }
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  function commit(next: string) {
    if (!isControlled) setInternal(next);
    setLastIso(next);
    // Move the calendar to whatever was just entered, so opening it after
    // typing a birthday lands on that month rather than on today.
    if (next) {
      const d = new Date(`${next}T00:00:00Z`);
      setViewYear(d.getUTCFullYear());
      setViewMonth(d.getUTCMonth());
    }
    onChange?.(next);
  }

  function handleText(raw: string) {
    const formatted = autoFormat(raw);
    setText(formatted);
    const asIso = displayToIso(formatted);
    if (asIso) commit(asIso);
    else if (formatted === "") commit("");
  }

  function pick(day: number) {
    const next = new Date(Date.UTC(viewYear, viewMonth, day)).toISOString().slice(0, 10);
    setText(isoToDisplay(next));
    commit(next);
    setOpen(false);
  }

  function shiftMonth(by: number) {
    const d = new Date(Date.UTC(viewYear, viewMonth + by, 1));
    setViewYear(d.getUTCFullYear());
    setViewMonth(d.getUTCMonth());
  }

  const selected = iso ? new Date(`${iso}T00:00:00Z`) : null;
  const today = new Date();
  const isToday = (day: number) =>
    viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate();
  const isSelected = (day: number) =>
    selected !== null &&
    selected.getUTCFullYear() === viewYear &&
    selected.getUTCMonth() === viewMonth &&
    selected.getUTCDate() === day;

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      {name ? <input type="hidden" name={name} value={iso} /> : null}

      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/yyyy"
          value={text}
          disabled={disabled}
          required={required}
          onChange={(e) => handleText(e.target.value)}
          onBlur={() => {
            // A half-typed date is not a date: put back whatever was valid.
            if (displayToIso(text) === null) setText(isoToDisplay(iso));
          }}
          className="h-9.5 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 pr-16 text-sm text-foreground shadow-[var(--shadow-card)] transition-colors placeholder:text-[var(--subtle-foreground)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-ring)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-0.5">
          {iso && !disabled ? (
            <button
              type="button"
              onClick={() => {
                setText("");
                commit("");
              }}
              aria-label="Clear date"
              className="rounded-md p-1 text-[var(--subtle-foreground)] hover:bg-[var(--surface-muted)] hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close calendar" : "Open calendar"}
            aria-expanded={open}
            className="rounded-md p-1 text-[var(--subtle-foreground)] hover:bg-[var(--surface-muted)] hover:text-foreground"
          >
            <CalendarDays className="size-4" />
          </button>
        </div>
      </div>

      {/* Rendered inline rather than in a portal: inside a dialog, a portalled
          layer has to negotiate with the focus trap, and this has no such
          argument to lose. */}
      {open ? (
        <div className="absolute z-50 mt-1.5 w-[292px] rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-3 shadow-[var(--shadow-popover,0_16px_40px_-12px_rgba(0,0,0,0.35))]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-[var(--surface-muted)] hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>

            <Select
              aria-label="Month"
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className="h-8 flex-1 text-[13px]"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </Select>

            <Select
              aria-label="Year"
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              className="h-8 w-[86px] text-[13px]"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>

            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-[var(--surface-muted)] hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((d, i) => (
              <span
                key={i}
                className="py-1 text-[11px] font-medium text-[var(--subtle-foreground)]"
              >
                {d}
              </span>
            ))}
            {Array.from({ length: leadingBlanks(viewYear, viewMonth) }).map((_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: daysInMonth(viewYear, viewMonth) }).map((_, i) => {
              const day = i + 1;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => pick(day)}
                  className={cn(
                    "tabular rounded-md py-1.5 text-[13px] transition-colors",
                    isSelected(day)
                      ? "bg-[var(--brand)] font-semibold text-[var(--brand-foreground)]"
                      : isToday(day)
                        ? "bg-[var(--brand-soft)] font-medium text-[var(--brand-soft-foreground)]"
                        : "hover:bg-[var(--surface-muted)]",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-[var(--border)] pt-2">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setViewYear(now.getFullYear());
                setViewMonth(now.getMonth());
                if (purpose !== "birthday") pick(now.getDate());
              }}
              className="rounded-md px-2 py-1 text-[12px] font-medium text-[var(--brand)] hover:bg-[var(--surface-muted)]"
            >
              {purpose === "birthday" ? "Jump to this year" : "Today"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-1 text-[12px] text-muted-foreground hover:bg-[var(--surface-muted)] hover:text-foreground"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
