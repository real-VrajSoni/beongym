/**
 * What kind of place this is.
 *
 * The product was built for gyms and the language still says "gym" everywhere,
 * but nothing in it is gym-shaped: a yoga studio has members, memberships,
 * payments, attendance and renewals in exactly the same way, and so does a
 * dance school, a boxing club and a climbing wall. Asking once at sign-up is
 * what lets the public map say "Yoga studio · Lisbon" instead of filing every
 * business on Earth under one word that fits about half of them.
 *
 * It changes nothing about how the workspace behaves. This is how a place
 * describes itself to somebody searching, not a feature flag.
 *
 * `GYM` leads because it is the common case and a default should be the common
 * case; `OTHER` closes because a list of categories that cannot be escaped is
 * a list that lies about somebody.
 */
export type BusinessTypeKey =
  | "GYM"
  | "FITNESS_STUDIO"
  | "YOGA_STUDIO"
  | "PILATES_STUDIO"
  | "DANCE_STUDIO"
  | "CROSSFIT_BOX"
  | "MARTIAL_ARTS"
  | "BOXING_GYM"
  | "CLIMBING_GYM"
  | "SWIMMING"
  | "SPORTS_CLUB"
  | "PERSONAL_TRAINING"
  | "WELLNESS"
  | "OTHER";

export type BusinessType = {
  key: BusinessTypeKey;
  /** How it is written on a listing and in the picker. */
  label: string;
  /** One line, for the picker. What somebody recognises themselves in. */
  hint: string;
  /** Shown on the public map pin. Short enough to sit under a gym's name. */
  short: string;
};

export const BUSINESS_TYPES: BusinessType[] = [
  { key: "GYM", label: "Gym", hint: "Weights, machines and an open floor", short: "Gym" },
  {
    key: "FITNESS_STUDIO",
    label: "Fitness studio",
    hint: "Small-group classes and circuits",
    short: "Fitness studio",
  },
  { key: "YOGA_STUDIO", label: "Yoga studio", hint: "Mat classes and workshops", short: "Yoga" },
  {
    key: "PILATES_STUDIO",
    label: "Pilates studio",
    hint: "Reformer or mat, usually by appointment",
    short: "Pilates",
  },
  {
    key: "DANCE_STUDIO",
    label: "Dance studio",
    hint: "Classes by style and level, often in terms",
    short: "Dance",
  },
  {
    key: "CROSSFIT_BOX",
    label: "CrossFit box",
    hint: "Coached classes against a daily workout",
    short: "CrossFit",
  },
  {
    key: "MARTIAL_ARTS",
    label: "Martial arts",
    hint: "Karate, judo, BJJ, taekwondo — belts and gradings",
    short: "Martial arts",
  },
  {
    key: "BOXING_GYM",
    label: "Boxing or MMA",
    hint: "Bags, ring time and sparring",
    short: "Boxing / MMA",
  },
  {
    key: "CLIMBING_GYM",
    label: "Climbing gym",
    hint: "Bouldering or ropes, day passes and members",
    short: "Climbing",
  },
  {
    key: "SWIMMING",
    label: "Swim school or pool",
    hint: "Lanes, lessons and squads",
    short: "Swimming",
  },
  {
    key: "SPORTS_CLUB",
    label: "Sports club",
    hint: "Courts, pitches, teams and seasons",
    short: "Sports club",
  },
  {
    key: "PERSONAL_TRAINING",
    label: "Personal training",
    hint: "One to one, in a studio or theirs",
    short: "Personal training",
  },
  {
    key: "WELLNESS",
    label: "Wellness or recovery",
    hint: "Physio, sauna, ice, massage, rehab",
    short: "Wellness",
  },
  { key: "OTHER", label: "Something else", hint: "Tell us in your tagline", short: "Studio" },
];

export const DEFAULT_BUSINESS_TYPE: BusinessTypeKey = "GYM";

export const BUSINESS_TYPE_KEYS = BUSINESS_TYPES.map((b) => b.key) as [
  BusinessTypeKey,
  ...BusinessTypeKey[],
];

export function businessType(key: string | null | undefined): BusinessType {
  return BUSINESS_TYPES.find((b) => b.key === key) ?? BUSINESS_TYPES[0]!;
}

export function isBusinessType(key: string): key is BusinessTypeKey {
  return BUSINESS_TYPES.some((b) => b.key === key);
}
