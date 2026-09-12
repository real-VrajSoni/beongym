"use server";

import { enforceRateLimit } from "@/lib/rate-limit";

import { db } from "@/lib/db";
import { listGyms, publicGymWhere } from "@/lib/data/directory";
import type { DirectoryGym } from "@/lib/data/directory";

export type LiveStats = {
  gyms: number;
  countries: number;
  cities: number;
  businessTypes: number;
};

/** Public profile traffic stays in private owner analytics. No metric returned. */
export async function recordProfileViewAction(code: string): Promise<void> {
  if (typeof code !== "string" || code.length > 40) return;
  try {
    await enforceRateLimit("public-profile-view", "all", 600, 60000);
    await enforceRateLimit("public-profile-code", code.toUpperCase(), 60, 60000);
    await db.gym.updateMany({ where: { ...publicGymWhere(), code: code.toUpperCase() }, data: { viewCount: { increment: 1 } } });
  } catch { /* Analytics must not block opening a public profile. */ }
}

/**
 * Every listed gym, for the map.
 *
 * The globe polls this so a gym that signs up while somebody is spinning the
 * world appears on it — the map is the product's shop window, and a shop
 * window that needs a refresh to show new stock is a stale one.
 */
export async function getMapGymsAction(): Promise<DirectoryGym[]> {
  await enforceRateLimit("public-map", "all", 600, 60000);
  return listGyms();
}

/**
 * What the platform looks like right now.
 *
 * Public and unauthenticated — these are the same four numbers already printed
 * on the directory, and a searcher deciding whether the map is worth their time
 * should see them move. Cheap enough to poll: four aggregates over one indexed
 * table.
 */
export async function getLiveStatsAction(): Promise<LiveStats> {
  await enforceRateLimit("public-stats", "all", 1000, 60000);
  // The same population the map draws: listed, trading, and paid up.
  const where = publicGymWhere();

  const [gyms, countries, cities, businessTypes] = await Promise.all([
    db.gym.count({ where }),
    db.gym.findMany({
      where: { ...where, country: { not: null } },
      select: { country: true },
      distinct: ["country"],
    }),
    db.gym.findMany({
      where: { ...where, city: { not: null } },
      select: { city: true },
      distinct: ["city"],
    }),
    db.gym.findMany({ where, select: { businessType: true }, distinct: ["businessType"] }),
  ]);

  return {
    gyms,
    countries: countries.length,
    cities: cities.length,
    businessTypes: businessTypes.length,
  };
}
