"use server";

import { enforceRateLimit } from "@/lib/rate-limit";

import { db } from "@/lib/db";
import { listGyms } from "@/lib/data/directory";
import type { DirectoryGym } from "@/lib/data/directory";

export type LiveStats = {
  gyms: number;
  countries: number;
  cities: number;
  views: number;
};

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
  const where = {
    listed: true,
    status: { in: ["ACTIVE" as const, "TRIAL" as const] },
    OR: [{ tier: "ELITE" as const }, { accessExpiresAt: { gt: new Date() } }],
  };

  const [gyms, countries, cities, views] = await Promise.all([
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
    db.gym.aggregate({ where, _sum: { viewCount: true } }),
  ]);

  return {
    gyms,
    countries: countries.length,
    cities: cities.length,
    views: views._sum.viewCount ?? 0,
  };
}
