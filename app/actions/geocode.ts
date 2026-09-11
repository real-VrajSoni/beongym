"use server";

import { locate } from "@/lib/geo/places";
import { consumeRateLimit } from "@/lib/rate-limit";

export type GeocodeHit = { lat: number; lng: number; label: string; source: "local" | "remote" };

/** Typing suggestions use the offline city catalogue, never a public geocoder. */
export async function geocodeCityAction(query: string): Promise<GeocodeHit | null> {
  if (typeof query !== "string" || query.length < 2 || query.length > 120) return null;
  try {
    if (!(await consumeRateLimit("geocode-suggestions", "all", 300, 60000))) return null;
    const place = locate(query.trim());
    return place ? { lat: place.lat, lng: place.lng, label: `${place.city}, ${place.country}`, source: "local" } : null;
  } catch { return null; }
}
