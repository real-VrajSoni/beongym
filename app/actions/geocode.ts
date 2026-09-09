"use server";

import { locate, type Place } from "@/lib/geo/places";

export type GeocodeHit = { lat: number; lng: number; label: string; source: "local" | "remote" };

/**
 * City → coordinates.
 *
 * The offline table answers instantly and covers the cities most gyms are in.
 * Anything it has never heard of falls through to Nominatim (OpenStreetMap's
 * public geocoder — no key, no account) so a gym in a town of 4,000 people can
 * still put itself on the map.
 *
 * Only the city string the person typed is sent, it runs on the server, and
 * every failure — offline, rate-limited, slow, unknown place — returns null and
 * leaves them dropping the pin by hand. Nothing in the listing flow blocks on
 * this succeeding.
 */
export async function geocodeCityAction(query: string): Promise<GeocodeHit | null> {
  const city = query.trim();
  if (city.length < 2) return null;

  const local: Place | null = locate(city);
  if (local) {
    return {
      lat: local.lat,
      lng: local.lng,
      label: `${local.city}, ${local.country}`,
      source: "local",
    };
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", city);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");

    const res = await fetch(url, {
      // Nominatim's usage policy asks for an identifying User-Agent.
      headers: { "User-Agent": "BeOnGym/1.0 (gym directory)", "Accept-Language": "en" },
      signal: AbortSignal.timeout(5000),
      // The world's cities do not move; a day of caching is generous.
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return null;

    const rows = (await res.json()) as {
      lat: string;
      lon: string;
      name?: string;
      display_name?: string;
    }[];
    const hit = rows[0];
    if (!hit) return null;

    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    // display_name is a full postal chain; the first and last parts are the
    // useful ones ("Reykjavík, Iceland").
    const parts = (hit.display_name ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const label = parts.length > 1 ? `${parts[0]}, ${parts[parts.length - 1]}` : (hit.name ?? city);

    return { lat, lng, label, source: "remote" };
  } catch {
    return null;
  }
}
