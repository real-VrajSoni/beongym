export const BRAND = {
  name: "BeOnGym",
  /** Used where a single word reads better, e.g. "the BeOnGym app". */
  short: "BeOnGym",
  tagline: "The operating system for your gym.",
  domain: "beongym.com",
  supportEmail: "support@beongym.com",
} as const;

/**
 * Who is actually selling this.
 *
 * A payment provider verifying a business checks that the name on the site,
 * the name on the identity documents and the name on the Product Verification
 * Form are the same name. So there is one copy of it, here, and the legal
 * pages read from it rather than each repeating a string that can drift.
 *
 * `entity` is deliberately a person rather than a company: BeOnGym trades as a
 * sole proprietorship, which is what Dodo Payments calls an unregistered
 * business and supports. Saying so plainly is better than implying a company
 * that does not exist — that mismatch is exactly what verification catches.
 */
export const SELLER = {
  /** The name on the ID documents. */
  entity: "Vraj Soni",
  /** How the seller is described in prose. */
  describedAs: "an individual trading as BeOnGym",
  country: "India",
  /** Which country's law governs the contract, and whose courts hear disputes. */
  jurisdiction: "India",
  email: "support@beongym.com",
  /**
   * When the current wording took effect. Bump it whenever a policy changes in
   * substance — a policy with no date is one nobody can tell has changed.
   */
  effective: "10 September 2026",
} as const;

/**
 * Third parties that necessarily see data, and what each one gets.
 *
 * Named individually because "we may share data with service providers" tells
 * a reader nothing they can act on, and because a gym owner handing us their
 * members' details is entitled to know whose servers those details land on.
 */
export const SUBPROCESSORS = [
  {
    name: "Vercel",
    purpose: "Hosting and delivery of the application",
    where: "United States and global edge network",
  },
  {
    name: "Neon",
    purpose: "The PostgreSQL database that stores everything in the product",
    where: "United States",
  },
  {
    name: "Dodo Payments",
    purpose:
      "Taking subscription payments as merchant of record. They receive the buyer's payment and billing details directly — those never reach our servers.",
    where: "Global",
  },
  {
    name: "OpenStreetMap (Nominatim)",
    purpose:
      "Turning a typed city into map coordinates when our offline table does not know it. Only the city text is sent — never a name, a number or an account.",
    where: "European Union",
  },
] as const;
