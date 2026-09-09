import {
  differenceInCalendarDays,
  differenceInCalendarWeeks,
  format,
  formatDistanceToNowStrict,
  isToday,
  isTomorrow,
} from "date-fns";

/**
 * Postgres `date` columns are calendar days with no time zone. Prisma maps
 * them to a Date at UTC midnight, so writing local midnight would store the
 * previous day anywhere east of UTC. These two helpers keep the boundary honest:
 * `toDateOnly` for writes, `fromDateOnly` for reads.
 */
export function toDateOnly(value: Date | string = new Date()): Date {
  const d = typeof value === "string" ? parseDateInput(value) : value;
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/** Turns a UTC-midnight `date` value into the same calendar day locally. */
export function fromDateOnly(value: Date | string): Date {
  const d = new Date(value);
  return new Date(d.getTime() + d.getTimezoneOffset() * 60_000);
}

/** Parses a `<input type="date">` value as a local calendar day. */
export function parseDateInput(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return new Date(value);
  return new Date(y, m - 1, d);
}

/** Formats a Date for a `<input type="date">` value. */
export function toDateInput(value: Date | string): string {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Prisma Decimal columns arrive as objects; normalise to a plain number. */
export type DecimalLike = { toString(): string } | number | string | null | undefined;

export function toNumber(value: DecimalLike): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Platform pricing, which is dollars everywhere.
 *
 * Distinct from `formatCurrency`, which is what a *gym* charges its members —
 * that stays in the gym's own currency. This one is what the gym pays us, and
 * it is the same number in every country.
 */
export function formatUsd(amount: number): string {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount);
}

/** Compact form for KPI tiles: ₹1.2L, ₹45.0K, ₹850 */
export function formatCurrencyCompact(amount: number): string {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)}Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "d MMM yyyy");
}

export function formatDateShort(date: Date | string): string {
  return format(new Date(date), "d MMM");
}

export function formatTime(date: Date | string): string {
  return format(new Date(date), "h:mm a");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "d MMM yyyy, h:mm a");
}

/** "Today", "Tomorrow", or "Mon, 12 Mar" */
export function formatDayLabel(date: Date | string): string {
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE, d MMM");
}

export function relativeTime(date: Date | string): string {
  return formatDistanceToNowStrict(new Date(date), { addSuffix: true });
}

/** "Due 2 days ago" / "Due in 3 days" / "Due today" */
export function dueLabel(date: Date | string): string {
  const days = differenceInCalendarDays(new Date(date), new Date());
  if (days === 0) return "Due today";
  if (days < 0) return `Due ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  return `Due in ${days} day${days === 1 ? "" : "s"}`;
}

/** How far through a start→end window we are right now, clamped to 0-100. */
export function percentElapsed(start: Date | string, end: Date | string): number {
  const from = new Date(start).getTime();
  const to = new Date(end).getTime();
  if (to <= from) return 100;
  const pct = ((Date.now() - from) / (to - from)) * 100;
  return Math.max(0, Math.min(100, pct));
}

/** True when the timestamp falls within the last `days` days. */
export function withinLastDays(date: Date | string | null, days: number): boolean {
  if (!date) return false;
  return Date.now() - new Date(date).getTime() < days * 24 * 60 * 60 * 1000;
}

export function daysUntil(date: Date | string): number {
  return differenceInCalendarDays(new Date(date), new Date());
}

/**
 * Week number of a check-in within its subscription — derived, never stored,
 * so the timeline stays correct if a start date is corrected.
 */
export function weekNumber(checkInDate: Date | string, subscriptionStart: Date | string): number {
  return (
    differenceInCalendarWeeks(new Date(checkInDate), new Date(subscriptionStart), {
      weekStartsOn: 1,
    }) + 1
  );
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** Turn SCREAMING_SNAKE enums into "Screaming Snake" labels. */
export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
