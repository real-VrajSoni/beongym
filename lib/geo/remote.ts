import "server-only";
import { locate, type Place } from "./places";

/**
 * The offline table, then OpenStreetMap.
 *
 * `lib/geo/places.ts` holds 144 cities — the common cases, answered instantly
 * with no network on the write path. It does not hold Bergen, and a gym in
 * Bergen that resolves to nothing loses its country (so its currency defaults
 * to rupees) and its coordinates (so it never appears on the globe). One
 * unrecognised town cost a paying gym both.
 *
 * So anything the table has never heard of falls through to Nominatim — no key,
 * no account — and every failure returns null and leaves the owner dropping
 * their pin by hand. Nothing in a signup blocks on this succeeding.
 */
export type Located = {
  lat: number;
  lng: number;
  country: string | null;
  /** True when the table answered — a real city, not a country-level guess. */
  offline: boolean;
};

export async function locateAnywhere(city: string | null | undefined): Promise<Located | null> {
  const trimmed = (city ?? "").trim();
  if (trimmed.length < 2) return null;

  const known: Place | null = locate(trimmed);
  if (known) return { lat: known.lat, lng: known.lng, country: known.country, offline: true };

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", trimmed);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
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
      address?: { country?: string };
    }[];
    const hit = rows[0];
    if (!hit) return null;

    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng, country: hit.address?.country ?? null, offline: false };
  } catch {
    return null;
  }
}
