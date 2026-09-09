export type PlatformTierKey = "PRO" | "ELITE";

/** How long a purchase buys, which is also the billing cycle it is recorded as. */
export type PlanKey = "MONTHLY" | "SEMIANNUAL" | "ANNUAL" | "LIFETIME";

export type PlatformPlan = {
  key: PlanKey;
  /** What the gym becomes. Everything but lifetime is Pro. */
  tier: PlatformTierKey;
  /**
   * Whether this plan is sold today.
   *
   * Retired plans stay in the catalogue rather than being deleted: gyms bought
   * them, `PlatformOrder` rows reference them, and a billing page that cannot
   * name what somebody paid for is worse than a plan nobody can buy. Only
   * `PURCHASABLE_PLANS` is ever offered.
   */
  available: boolean;
  name: string;
  /** What it costs, in US dollars. */
  price: number;
  /** The figure it is struck through against — the price without the offer. */
  listPrice: number;
  /** The early-bird cut, as advertised. Stated rather than derived so the
      badge reads as a round offer and not as arithmetic. */
  discount: number;
  /** Days of access bought. Null is forever. */
  days: number | null;
  /** The unit under the price. */
  per: string;
  /** The saving, said the way a gym owner would say it. */
  saving: string;
  blurb: string;
  popular?: boolean;
  bestValue?: boolean;
};

/** One month, in days. Everything else is a multiple of it. */
const MONTH = 30;

/**
 * Two plans are sold: a month, or a year.
 *
 * There is no free tier — every gym on the map has paid to be there, which is
 * what keeps the map worth searching.
 *
 * There is no longer a lifetime plan either, and that is a deliberate business
 * decision rather than a tidy-up. A subscription business funded by one-off
 * payments has to keep selling new customers to pay for serving the old ones,
 * and every lifetime buyer is a permanent cost against a single fee. The two
 * plans that remain buy exactly the same product; the only difference is how
 * long it lasts.
 *
 * `SEMIANNUAL` and `LIFETIME` are retired, not removed. Gyms hold them, orders
 * reference them, and `planByKey` still resolves them so those records render
 * correctly for as long as they exist.
 */
export const PLATFORM_PLANS: PlatformPlan[] = [
  {
    key: "MONTHLY",
    tier: "PRO",
    available: true,
    name: "Pro",
    price: 20,
    listPrice: 25,
    discount: 20,
    days: MONTH,
    per: "for 30 days",
    saving: "Month to month",
    blurb: "Everything on the platform, a month at a time.",
  },
  {
    key: "SEMIANNUAL",
    tier: "PRO",
    // Retired: two lengths is a choice, four is a decision nobody wants to make.
    available: false,
    name: "UltraPro",
    price: 89,
    listPrice: 120,
    discount: 25,
    days: MONTH * 6,
    per: "for 6 months",
    saving: "5 months paid · 1 month free",
    blurb: "Pay for five months, train through six. The sixth is on us.",
  },
  {
    key: "ANNUAL",
    tier: "PRO",
    available: true,
    name: "Annual",
    price: 149,
    listPrice: 200,
    discount: 25,
    days: MONTH * 12,
    per: "for 12 months",
    saving: "10 months paid · 2 months free",
    blurb: "Pay for ten months, get the year. Two months free.",
    popular: true,
    bestValue: true,
  },
  {
    key: "LIFETIME",
    tier: "ELITE",
    // Retired. Kept so the gyms that bought one still read correctly.
    available: false,
    name: "Elite",
    price: 249,
    listPrice: 500,
    discount: 50,
    days: null,
    per: "once, for good",
    saving: "Pay once, never again",
    blurb: "Bought outright. No renewal, ever, and every future update free.",
  },
];

/**
 * The plans on sale, in the order they are shown.
 *
 * Every purchasing surface renders this and nothing else — the pricing table,
 * onboarding, the listing form, the renewal wall and the in-app picker. Adding
 * or retiring a plan is one flag here, and every one of them follows.
 */
export const PURCHASABLE_PLANS: PlatformPlan[] = PLATFORM_PLANS.filter((p) => p.available);

/**
 * The keys a purchase may name, as a tuple for `z.enum`.
 *
 * Server actions take a plan key from the browser, so hiding a retired plan in
 * the UI proves nothing on its own — this is what actually stops somebody
 * buying a lifetime licence with a crafted request.
 */
export const PURCHASABLE_PLAN_KEYS = PURCHASABLE_PLANS.map((p) => p.key) as [PlanKey, ...PlanKey[]];

/** Every key that has ever been sold — for reading historical orders back. */
export const ALL_PLAN_KEYS = PLATFORM_PLANS.map((p) => p.key) as [PlanKey, ...PlanKey[]];

/** True when this plan may still be bought. */
export function isPurchasable(key: string): boolean {
  return PLATFORM_PLANS.some((p) => p.key === key && p.available);
}

/** What every paid plan includes — the same list, whichever length you buy. */
export const INCLUDED = [
  "Your gym's pin and store on the world map",
  "Your own links on the pin, with click counts",
  "Unlimited members and staff",
  "Front-desk attendance and live occupancy",
  "Membership plans, subscriptions and payments",
  "Attendance history for every member, a year at a glance",
  "Coaching programmes, workouts and nutrition plans",
  "Class timetable with member self-booking",
  "Multi-staff roles with owner controls",
  "WhatsApp reminders for expiry, dues and birthdays",
];

/**
 * What lifetime buyers got on top.
 *
 * Nobody can buy this any more; the gyms that did still see it on their billing
 * page, because what they were promised did not stop being true.
 */
export const ELITE_EXTRAS = [
  "No renewal date and no invoice to forget",
  "All future updates included, free, for life",
  "Locked in at today's price whatever we charge later",
  "Priority email support",
];

export const OFFER_STRAP = "Early bird · limited time";

export function planByKey(key: string): PlatformPlan {
  return PLATFORM_PLANS.find((p) => p.key === key) ?? PLATFORM_PLANS[0];
}

/** The cheapest way in, for "from $X" copy. Always a plan on sale. */
export const ENTRY_PRICE = PURCHASABLE_PLANS[0].price;

/** The plan a gym is presumed to be on, for display when only the tier is known. */
export function planForTier(tier: string): PlatformPlan {
  return tier === "ELITE" ? planByKey("LIFETIME") : planByKey("MONTHLY");
}

/** Percentage saved against the list price, rounded for a badge. */
export function discountFor(key: string): number {
  return planByKey(key).discount;
}

/** Effective cost per month, for comparing plans side by side. */
export function perMonth(key: string): number {
  const plan = planByKey(key);
  if (!plan.days) return 0;
  return plan.price / (plan.days / MONTH);
}

/** What a purchase of this plan is worth, in dollars. */
export function orderValue(key: string): number {
  return planByKey(key).price;
}

/** The tier a plan grants. */
export function tierFor(key: string): PlatformTierKey {
  return planByKey(key).tier;
}

export type AccessState = "lifetime" | "active" | "expired" | "none";

/**
 * Whether a gym can use what it bought.
 *
 * Four states rather than a boolean, because the product says something
 * different in each: Elite never expires, a live window is fine, a lapsed one
 * needs renewing, and a gym that never had a window at all is an unclaimed
 * listing rather than a lapsed customer.
 */
export function accessState(
  tier: string,
  accessExpiresAt: Date | string | null | undefined,
  now: Date = new Date(),
): AccessState {
  if (tier === "ELITE") return "lifetime";
  if (!accessExpiresAt) return "none";
  return new Date(accessExpiresAt) > now ? "active" : "expired";
}

/** True when the gym may use the workspace at all. */
export function hasAccess(
  tier: string,
  accessExpiresAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  const state = accessState(tier, accessExpiresAt, now);
  return state === "lifetime" || state === "active";
}

/**
 * The new expiry after a payment.
 *
 * Extends from the current expiry when there is one, so renewing early adds to
 * the days already paid for instead of throwing them away. Renewing after a
 * lapse starts from today, because there is nothing left to extend.
 */
export function extendAccess(
  currentExpiry: Date | string | null | undefined,
  planKey: string = "MONTHLY",
  now: Date = new Date(),
): Date | null {
  const plan = planByKey(planKey);
  if (plan.days === null) return null;
  const from =
    currentExpiry && new Date(currentExpiry) > now ? new Date(currentExpiry) : new Date(now);
  const next = new Date(from);
  next.setDate(next.getDate() + plan.days);
  return next;
}

/** Days left on a window, floored at zero. */
export function daysLeft(
  accessExpiresAt: Date | string | null | undefined,
  now: Date = new Date(),
): number {
  if (!accessExpiresAt) return 0;
  const ms = new Date(accessExpiresAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/**
 * What the platform books each month from a gym.
 *
 * A year bought up front is not twelve dollars of recurring revenue every
 * month, so the longer plans are amortised over the months they cover. Elite
 * contributes nothing recurring — that is the point of buying it — and shows up
 * in booked revenue instead.
 */
export function monthlyValue(
  tier: string,
  accessExpiresAt?: Date | string | null,
  planKey?: string | null,
): number {
  if (tier === "ELITE") return 0;
  if (!hasAccess(tier, accessExpiresAt)) return 0;
  return Math.round(perMonth(planKey ?? "MONTHLY") * 100) / 100;
}

/** Kept for the claim and listing flows, which quote the entry price. */
export const CLAIM_PRICE_USD = ENTRY_PRICE;
