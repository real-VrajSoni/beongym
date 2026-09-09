import "server-only";
import { db } from "@/lib/db";

/**
 * The condition for being on the map: access that is live right now.
 *
 * Elite is paid for once and never expires; every other plan buys a window,
 * and when the window closes the gym comes off the globe until it is renewed.
 * Nothing on this map is there for free — that is the point of it.
 */
function liveAccess() {
  return [{ tier: "ELITE" as const }, { accessExpiresAt: { gt: new Date() } }];
}

/** Listed, trading and paid up — the only gyms the public directory shows. */
function onTheMap(city?: string) {
  return {
    listed: true,
    status: { in: ["ACTIVE" as const, "TRIAL" as const] },
    OR: liveAccess(),
    ...(city ? { city: { equals: city, mode: "insensitive" as const } } : {}),
  };
}

/**
 * The public gym directory — every gym that has paid to be on the map.
 *
 * Deliberately unauthenticated: the point of the listing is to send walk-ins
 * to gyms, and a sign-in wall between a searcher and a phone number works
 * against that. Only fields the owner chose to publish are selected here;
 * members, revenue and everything operational stay out of this query.
 */
export async function listGyms(city?: string) {
  const gyms = await db.gym.findMany({
    where: onTheMap(city),
    orderBy: [{ tier: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      tagline: true,
      city: true,
      accentColor: true,
      logoText: true,
      imageUrl: true,
      amenities: true,
      tier: true,
      country: true,
      latitude: true,
      longitude: true,
      viewCount: true,
      claimed: true,
      storeSetupAt: true,
      links: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, kind: true, label: true, url: true },
      },
      _count: { select: { members: true } },
    },
  });

  return gyms.map((g) => ({
    code: g.code,
    name: g.name,
    tagline: g.tagline,
    city: g.city,
    accentColor: g.accentColor,
    logoText: g.logoText,
    imageUrl: g.imageUrl,
    amenities: g.amenities,
    country: g.country,
    /** Null for gyms that never set a location — listed, but not on the map. */
    lat: g.latitude,
    lng: g.longitude,
    /** Profile views. Social proof for searchers, not analytics. */
    views: g.viewCount,
    claimed: g.claimed,
    /** Shown as a signal of scale, not an exact figure. */
    memberCount: g._count.members,
    /** Every gym here has paid; Elite ones paid once, for good. */
    managed: true,
    links: g.links,
  }));
}

export type DirectoryGym = Awaited<ReturnType<typeof listGyms>>[number];

export async function getPublicGym(code: string) {
  const gym = await db.gym.findFirst({
    // Paid gyms, plus listings nobody owns yet — an unclaimed profile is
    // exactly the page somebody lands on before paying to claim it.
    where: {
      code: code.toUpperCase(),
      listed: true,
      status: { in: ["ACTIVE", "TRIAL"] },
      OR: [...liveAccess(), { claimed: false }],
    },
    select: {
      id: true,
      code: true,
      name: true,
      tagline: true,
      description: true,
      city: true,
      address: true,
      phone: true,
      email: true,
      accentColor: true,
      logoText: true,
      imageUrl: true,
      amenities: true,
      openingHours: true,
      tier: true,
      country: true,
      latitude: true,
      longitude: true,
      viewCount: true,
      claimed: true,
      storeSetupAt: true,
      links: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, kind: true, label: true, url: true, clickCount: true },
      },
      createdAt: true,
      _count: { select: { members: true, staff: true } },
      // Only what the gym sells, and only while it is on sale. `showPrice`
      // decides whether the figure travels with it — see the store page.
      plans: {
        where: { isActive: true },
        orderBy: { price: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          showPrice: true,
          durationDays: true,
          billingInterval: true,
          planType: true,
        },
      },
    },
  });
  return gym;
}

/**
 * One view per profile open. Fire-and-forget: a failed counter must never take
 * the page down, and an exact count is not worth a transaction here.
 */
export async function recordGymView(gymId: string) {
  await db.gym
    .update({ where: { id: gymId }, data: { viewCount: { increment: 1 } } })
    .catch(() => null);
}

/**
 * Listings nobody owns yet — the inventory behind "claim this gym". Seeded
 * from public information so a searcher finds something on day one.
 */
export async function listUnclaimedGyms() {
  const gyms = await db.gym.findMany({
    where: { listed: true, claimed: false, status: { in: ["ACTIVE", "TRIAL"] } },
    orderBy: { viewCount: "desc" },
    select: {
      code: true,
      name: true,
      tagline: true,
      city: true,
      accentColor: true,
      logoText: true,
      imageUrl: true,
      viewCount: true,
      amenities: true,
    },
  });
  return gyms.map((g) => ({ ...g, views: g.viewCount }));
}

/** Cities with at least one paid-up gym, for the directory filter. */
export async function listCities() {
  const rows = await db.gym.findMany({
    where: { ...onTheMap(), city: { not: null } },
    select: { city: true },
    distinct: ["city"],
    orderBy: { city: "asc" },
  });
  return rows.map((r) => r.city!).filter(Boolean);
}
