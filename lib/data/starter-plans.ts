import "server-only";

/**
 * The programmes every new Pro gym starts with.
 *
 * A starting point, not a fixture: the owner renames, reprices, adds and
 * removes them. Prices stay hidden on the public store until the owner
 * publishes each one — see `Plan.showPrice`.
 */
export const STARTER_PLANS = [
  { name: "Monthly Membership", description: "Full gym access, open floor hours and group classes.", planType: "GROUP_COACHING" as const, durationDays: 30, price: 1500, billingInterval: "MONTHLY" as const },
  { name: "Quarterly Membership", description: "Three months of full access at a better rate.", planType: "GROUP_COACHING" as const, durationDays: 90, price: 4000, billingInterval: "QUARTERLY" as const },
  { name: "12 Week Transformation", description: "Personalised training, nutrition targets and a fortnightly progress call.", planType: "TRANSFORMATION" as const, durationDays: 84, price: 15000, billingInterval: "ONE_TIME" as const },
  { name: "Personal Training — 1:1", description: "Coached sessions on the floor and a written programme.", planType: "ONE_TO_ONE_COACHING" as const, durationDays: 30, price: 10000, billingInterval: "MONTHLY" as const },
  { name: "Nutrition Coaching", description: "Macro targets, a practical meal framework and weekly accountability.", planType: "NUTRITION_COACHING" as const, durationDays: 30, price: 5000, billingInterval: "MONTHLY" as const },
  { name: "Strategy Consultation", description: "A single 45-minute call with a written plan of action.", planType: "CONSULTATION" as const, durationDays: 7, price: 1500, billingInterval: "ONE_TIME" as const },
];
