import "server-only";

/**
 * The six programmes every new gym starts with.
 *
 * A gym owner signing up should find something to sell already there — the
 * shapes a gym actually sells are the same everywhere, and typing six of them
 * in before you can add your first member is work nobody asked for.
 *
 * They arrive **unpriced**, and that is the point. What a monthly membership
 * costs is the one thing that genuinely differs between a gym in Jaipur and one
 * in Sydney, and a number we invented would be wrong in both — wrong twice over
 * once it is denominated in the wrong currency. So the name, the length and the
 * billing shape are given, the price is a blank the owner fills in, and nothing
 * reaches the public store until they do: `showPrice` stays false, and the
 * workspace shows "Set a price" rather than a confident zero.
 */
export const STARTER_PLANS = [
  {
    name: "Monthly Membership",
    description: "Full gym access, open floor hours and group classes.",
    planType: "GROUP_COACHING" as const,
    durationDays: 30,
    price: 0,
    billingInterval: "MONTHLY" as const,
  },
  {
    name: "Quarterly Membership",
    description: "Three months of full access at a better rate.",
    planType: "GROUP_COACHING" as const,
    durationDays: 90,
    price: 0,
    billingInterval: "QUARTERLY" as const,
  },
  {
    name: "12 Week Transformation",
    description: "Personalised training, nutrition targets and a fortnightly progress call.",
    planType: "TRANSFORMATION" as const,
    durationDays: 84,
    price: 0,
    billingInterval: "ONE_TIME" as const,
  },
  {
    name: "Personal Training — 1:1",
    description: "Coached sessions on the floor and a written programme.",
    planType: "ONE_TO_ONE_COACHING" as const,
    durationDays: 30,
    price: 0,
    billingInterval: "MONTHLY" as const,
  },
  {
    name: "Nutrition Coaching",
    description: "Macro targets, a practical meal framework and weekly accountability.",
    planType: "NUTRITION_COACHING" as const,
    durationDays: 30,
    price: 0,
    billingInterval: "MONTHLY" as const,
  },
  {
    name: "Strategy Consultation",
    description: "A single 45-minute call with a written plan of action.",
    planType: "CONSULTATION" as const,
    durationDays: 7,
    price: 0,
    billingInterval: "ONE_TIME" as const,
  },
];
