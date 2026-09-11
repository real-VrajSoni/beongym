import "server-only";
import { consumeRateLimit } from "../rate-limit";
import { serverEnv } from "../env";
import { locate, type Place } from "./places";

/**
 * Resolve explicit form submissions locally first, then through an operator-
 * configured Nominatim-compatible endpoint. Never used for remote autocomplete.
 * Failure leaves manual pin placement available without blocking signup.
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
  if (trimmed.length < 2 || trimmed.length > 120) return null;

  const known: Place | null = locate(trimmed);
  if (known) return { lat: known.lat, lng: known.lng, country: known.country, offline: true };

  try {
    const endpoint = serverEnv().geocodingSearchUrl;
    if (!endpoint || !(await consumeRateLimit("geocoding-provider", "all", 1, 1100))) return null;
    const url = new URL(endpoint);
    url.searchParams.set("q", trimmed);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "1");

    const res = await fetch(url, {
      // Nominatim's usage policy asks for an identifying User-Agent.
      headers: { "User-Agent": `BeOnGym/1.0 (${serverEnv().appUrl}/contact)`, "Accept-Language": "en" },
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
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

    return { lat, lng, country: hit.address?.country ?? null, offline: false };
  } catch {
    return null;
  }
}
