/**
 * A small offline gazetteer.
 *
 * A gym that lists itself needs a pin on the globe immediately, and the only
 * thing a gym owner reliably types is a city. A hosted geocoder would mean a
 * key, a network hop on the write path and a third-party dependency in the
 * checkout — so the common cases live here instead, and anyone whose town is
 * missing drops their pin on the map by hand.
 */
export type Place = {
  city: string;
  country: string;
  /** ISO 3166-1 numeric, matching the ids in world-atlas. */
  cc: string;
  lat: number;
  lng: number;
};

export const PLACES: Place[] = [
  // ── India ────────────────────────────────────────────────
  { city: "Mumbai", country: "India", cc: "356", lat: 19.076, lng: 72.8777 },
  { city: "Delhi", country: "India", cc: "356", lat: 28.6139, lng: 77.209 },
  { city: "New Delhi", country: "India", cc: "356", lat: 28.6139, lng: 77.209 },
  { city: "Gurugram", country: "India", cc: "356", lat: 28.4595, lng: 77.0266 },
  { city: "Noida", country: "India", cc: "356", lat: 28.5355, lng: 77.391 },
  { city: "Bengaluru", country: "India", cc: "356", lat: 12.9716, lng: 77.5946 },
  { city: "Bangalore", country: "India", cc: "356", lat: 12.9716, lng: 77.5946 },
  { city: "Hyderabad", country: "India", cc: "356", lat: 17.385, lng: 78.4867 },
  { city: "Chennai", country: "India", cc: "356", lat: 13.0827, lng: 80.2707 },
  { city: "Kolkata", country: "India", cc: "356", lat: 22.5726, lng: 88.3639 },
  { city: "Pune", country: "India", cc: "356", lat: 18.5204, lng: 73.8567 },
  { city: "Ahmedabad", country: "India", cc: "356", lat: 23.0225, lng: 72.5714 },
  { city: "Surat", country: "India", cc: "356", lat: 21.1702, lng: 72.8311 },
  { city: "Jaipur", country: "India", cc: "356", lat: 26.9124, lng: 75.7873 },
  { city: "Lucknow", country: "India", cc: "356", lat: 26.8467, lng: 80.9462 },
  { city: "Kanpur", country: "India", cc: "356", lat: 26.4499, lng: 80.3319 },
  { city: "Nagpur", country: "India", cc: "356", lat: 21.1458, lng: 79.0882 },
  { city: "Indore", country: "India", cc: "356", lat: 22.7196, lng: 75.8577 },
  { city: "Bhopal", country: "India", cc: "356", lat: 23.2599, lng: 77.4126 },
  { city: "Visakhapatnam", country: "India", cc: "356", lat: 17.6868, lng: 83.2185 },
  { city: "Patna", country: "India", cc: "356", lat: 25.5941, lng: 85.1376 },
  { city: "Vadodara", country: "India", cc: "356", lat: 22.3072, lng: 73.1812 },
  { city: "Ludhiana", country: "India", cc: "356", lat: 30.901, lng: 75.8573 },
  { city: "Agra", country: "India", cc: "356", lat: 27.1767, lng: 78.0081 },
  { city: "Nashik", country: "India", cc: "356", lat: 19.9975, lng: 73.7898 },
  { city: "Coimbatore", country: "India", cc: "356", lat: 11.0168, lng: 76.9558 },
  { city: "Kochi", country: "India", cc: "356", lat: 9.9312, lng: 76.2673 },
  { city: "Thiruvananthapuram", country: "India", cc: "356", lat: 8.5241, lng: 76.9366 },
  { city: "Chandigarh", country: "India", cc: "356", lat: 30.7333, lng: 76.7794 },
  { city: "Goa", country: "India", cc: "356", lat: 15.2993, lng: 74.124 },
  { city: "Guwahati", country: "India", cc: "356", lat: 26.1445, lng: 91.7362 },
  { city: "Bhubaneswar", country: "India", cc: "356", lat: 20.2961, lng: 85.8245 },
  { city: "Dehradun", country: "India", cc: "356", lat: 30.3165, lng: 78.0322 },
  { city: "Raipur", country: "India", cc: "356", lat: 21.2514, lng: 81.6296 },
  { city: "Mysuru", country: "India", cc: "356", lat: 12.2958, lng: 76.6394 },

  // ── Rest of Asia ─────────────────────────────────────────
  { city: "Dubai", country: "United Arab Emirates", cc: "784", lat: 25.2048, lng: 55.2708 },
  { city: "Abu Dhabi", country: "United Arab Emirates", cc: "784", lat: 24.4539, lng: 54.3773 },
  { city: "Doha", country: "Qatar", cc: "634", lat: 25.2854, lng: 51.531 },
  { city: "Riyadh", country: "Saudi Arabia", cc: "682", lat: 24.7136, lng: 46.6753 },
  { city: "Jeddah", country: "Saudi Arabia", cc: "682", lat: 21.4858, lng: 39.1925 },
  { city: "Singapore", country: "Singapore", cc: "702", lat: 1.3521, lng: 103.8198 },
  { city: "Kuala Lumpur", country: "Malaysia", cc: "458", lat: 3.139, lng: 101.6869 },
  { city: "Bangkok", country: "Thailand", cc: "764", lat: 13.7563, lng: 100.5018 },
  { city: "Jakarta", country: "Indonesia", cc: "360", lat: -6.2088, lng: 106.8456 },
  { city: "Manila", country: "Philippines", cc: "608", lat: 14.5995, lng: 120.9842 },
  { city: "Ho Chi Minh City", country: "Vietnam", cc: "704", lat: 10.8231, lng: 106.6297 },
  { city: "Hanoi", country: "Vietnam", cc: "704", lat: 21.0278, lng: 105.8342 },
  { city: "Hong Kong", country: "Hong Kong", cc: "344", lat: 22.3193, lng: 114.1694 },
  { city: "Shanghai", country: "China", cc: "156", lat: 31.2304, lng: 121.4737 },
  { city: "Beijing", country: "China", cc: "156", lat: 39.9042, lng: 116.4074 },
  { city: "Shenzhen", country: "China", cc: "156", lat: 22.5431, lng: 114.0579 },
  { city: "Tokyo", country: "Japan", cc: "392", lat: 35.6762, lng: 139.6503 },
  { city: "Osaka", country: "Japan", cc: "392", lat: 34.6937, lng: 135.5023 },
  { city: "Seoul", country: "South Korea", cc: "410", lat: 37.5665, lng: 126.978 },
  { city: "Taipei", country: "Taiwan", cc: "158", lat: 25.033, lng: 121.5654 },
  { city: "Colombo", country: "Sri Lanka", cc: "144", lat: 6.9271, lng: 79.8612 },
  { city: "Kathmandu", country: "Nepal", cc: "524", lat: 27.7172, lng: 85.324 },
  { city: "Dhaka", country: "Bangladesh", cc: "050", lat: 23.8103, lng: 90.4125 },
  { city: "Karachi", country: "Pakistan", cc: "586", lat: 24.8607, lng: 67.0011 },
  { city: "Lahore", country: "Pakistan", cc: "586", lat: 31.5204, lng: 74.3587 },
  { city: "Islamabad", country: "Pakistan", cc: "586", lat: 33.6844, lng: 73.0479 },
  { city: "Tel Aviv", country: "Israel", cc: "376", lat: 32.0853, lng: 34.7818 },
  { city: "Istanbul", country: "Türkiye", cc: "792", lat: 41.0082, lng: 28.9784 },

  // ── Europe ───────────────────────────────────────────────
  { city: "London", country: "United Kingdom", cc: "826", lat: 51.5072, lng: -0.1276 },
  { city: "Manchester", country: "United Kingdom", cc: "826", lat: 53.4808, lng: -2.2426 },
  { city: "Birmingham", country: "United Kingdom", cc: "826", lat: 52.4862, lng: -1.8904 },
  { city: "Glasgow", country: "United Kingdom", cc: "826", lat: 55.8642, lng: -4.2518 },
  { city: "Dublin", country: "Ireland", cc: "372", lat: 53.3498, lng: -6.2603 },
  { city: "Paris", country: "France", cc: "250", lat: 48.8566, lng: 2.3522 },
  { city: "Lyon", country: "France", cc: "250", lat: 45.764, lng: 4.8357 },
  { city: "Marseille", country: "France", cc: "250", lat: 43.2965, lng: 5.3698 },
  { city: "Berlin", country: "Germany", cc: "276", lat: 52.52, lng: 13.405 },
  { city: "Munich", country: "Germany", cc: "276", lat: 48.1351, lng: 11.582 },
  { city: "Hamburg", country: "Germany", cc: "276", lat: 53.5511, lng: 9.9937 },
  { city: "Frankfurt", country: "Germany", cc: "276", lat: 50.1109, lng: 8.6821 },
  { city: "Amsterdam", country: "Netherlands", cc: "528", lat: 52.3676, lng: 4.9041 },
  { city: "Rotterdam", country: "Netherlands", cc: "528", lat: 51.9244, lng: 4.4777 },
  { city: "Brussels", country: "Belgium", cc: "056", lat: 50.8476, lng: 4.3572 },
  { city: "Madrid", country: "Spain", cc: "724", lat: 40.4168, lng: -3.7038 },
  { city: "Barcelona", country: "Spain", cc: "724", lat: 41.3874, lng: 2.1686 },
  { city: "Valencia", country: "Spain", cc: "724", lat: 39.4699, lng: -0.3763 },
  { city: "Lisbon", country: "Portugal", cc: "620", lat: 38.7223, lng: -9.1393 },
  { city: "Porto", country: "Portugal", cc: "620", lat: 41.1579, lng: -8.6291 },
  { city: "Rome", country: "Italy", cc: "380", lat: 41.9028, lng: 12.4964 },
  { city: "Milan", country: "Italy", cc: "380", lat: 45.4642, lng: 9.19 },
  { city: "Zurich", country: "Switzerland", cc: "756", lat: 47.3769, lng: 8.5417 },
  { city: "Geneva", country: "Switzerland", cc: "756", lat: 46.2044, lng: 6.1432 },
  { city: "Vienna", country: "Austria", cc: "040", lat: 48.2082, lng: 16.3738 },
  { city: "Prague", country: "Czechia", cc: "203", lat: 50.0755, lng: 14.4378 },
  { city: "Warsaw", country: "Poland", cc: "616", lat: 52.2297, lng: 21.0122 },
  { city: "Kraków", country: "Poland", cc: "616", lat: 50.0647, lng: 19.945 },
  { city: "Budapest", country: "Hungary", cc: "348", lat: 47.4979, lng: 19.0402 },
  { city: "Bucharest", country: "Romania", cc: "642", lat: 44.4268, lng: 26.1025 },
  { city: "Athens", country: "Greece", cc: "300", lat: 37.9838, lng: 23.7275 },
  { city: "Stockholm", country: "Sweden", cc: "752", lat: 59.3293, lng: 18.0686 },
  { city: "Oslo", country: "Norway", cc: "578", lat: 59.9139, lng: 10.7522 },
  { city: "Copenhagen", country: "Denmark", cc: "208", lat: 55.6761, lng: 12.5683 },
  { city: "Helsinki", country: "Finland", cc: "246", lat: 60.1699, lng: 24.9384 },

  // ── Africa ───────────────────────────────────────────────
  { city: "Cairo", country: "Egypt", cc: "818", lat: 30.0444, lng: 31.2357 },
  { city: "Lagos", country: "Nigeria", cc: "566", lat: 6.5244, lng: 3.3792 },
  { city: "Abuja", country: "Nigeria", cc: "566", lat: 9.0765, lng: 7.3986 },
  { city: "Nairobi", country: "Kenya", cc: "404", lat: -1.2921, lng: 36.8219 },
  { city: "Accra", country: "Ghana", cc: "288", lat: 5.6037, lng: -0.187 },
  { city: "Johannesburg", country: "South Africa", cc: "710", lat: -26.2041, lng: 28.0473 },
  { city: "Cape Town", country: "South Africa", cc: "710", lat: -33.9249, lng: 18.4241 },
  { city: "Durban", country: "South Africa", cc: "710", lat: -29.8587, lng: 31.0218 },
  { city: "Casablanca", country: "Morocco", cc: "504", lat: 33.5731, lng: -7.5898 },
  { city: "Tunis", country: "Tunisia", cc: "788", lat: 36.8065, lng: 10.1815 },
  { city: "Addis Ababa", country: "Ethiopia", cc: "231", lat: 9.03, lng: 38.74 },

  // ── Americas ─────────────────────────────────────────────
  { city: "New York", country: "United States", cc: "840", lat: 40.7128, lng: -74.006 },
  { city: "Los Angeles", country: "United States", cc: "840", lat: 34.0522, lng: -118.2437 },
  { city: "Chicago", country: "United States", cc: "840", lat: 41.8781, lng: -87.6298 },
  { city: "Houston", country: "United States", cc: "840", lat: 29.7604, lng: -95.3698 },
  { city: "Miami", country: "United States", cc: "840", lat: 25.7617, lng: -80.1918 },
  { city: "Austin", country: "United States", cc: "840", lat: 30.2672, lng: -97.7431 },
  { city: "Dallas", country: "United States", cc: "840", lat: 32.7767, lng: -96.797 },
  { city: "Denver", country: "United States", cc: "840", lat: 39.7392, lng: -104.9903 },
  { city: "Seattle", country: "United States", cc: "840", lat: 47.6062, lng: -122.3321 },
  { city: "San Francisco", country: "United States", cc: "840", lat: 37.7749, lng: -122.4194 },
  { city: "San Diego", country: "United States", cc: "840", lat: 32.7157, lng: -117.1611 },
  { city: "Phoenix", country: "United States", cc: "840", lat: 33.4484, lng: -112.074 },
  { city: "Atlanta", country: "United States", cc: "840", lat: 33.749, lng: -84.388 },
  { city: "Boston", country: "United States", cc: "840", lat: 42.3601, lng: -71.0589 },
  { city: "Las Vegas", country: "United States", cc: "840", lat: 36.1699, lng: -115.1398 },
  { city: "Toronto", country: "Canada", cc: "124", lat: 43.6532, lng: -79.3832 },
  { city: "Vancouver", country: "Canada", cc: "124", lat: 49.2827, lng: -123.1207 },
  { city: "Montreal", country: "Canada", cc: "124", lat: 45.5019, lng: -73.5674 },
  { city: "Calgary", country: "Canada", cc: "124", lat: 51.0447, lng: -114.0719 },
  { city: "Mexico City", country: "Mexico", cc: "484", lat: 19.4326, lng: -99.1332 },
  { city: "Guadalajara", country: "Mexico", cc: "484", lat: 20.6597, lng: -103.3496 },
  { city: "São Paulo", country: "Brazil", cc: "076", lat: -23.5558, lng: -46.6396 },
  { city: "Rio de Janeiro", country: "Brazil", cc: "076", lat: -22.9068, lng: -43.1729 },
  { city: "Buenos Aires", country: "Argentina", cc: "032", lat: -34.6037, lng: -58.3816 },
  { city: "Santiago", country: "Chile", cc: "152", lat: -33.4489, lng: -70.6693 },
  { city: "Bogotá", country: "Colombia", cc: "170", lat: 4.711, lng: -74.0721 },
  { city: "Lima", country: "Peru", cc: "604", lat: -12.0464, lng: -77.0428 },

  // ── Oceania ──────────────────────────────────────────────
  { city: "Sydney", country: "Australia", cc: "036", lat: -33.8688, lng: 151.2093 },
  { city: "Melbourne", country: "Australia", cc: "036", lat: -37.8136, lng: 144.9631 },
  { city: "Brisbane", country: "Australia", cc: "036", lat: -27.4698, lng: 153.0251 },
  { city: "Perth", country: "Australia", cc: "036", lat: -31.9505, lng: 115.8605 },
  { city: "Auckland", country: "New Zealand", cc: "554", lat: -36.8485, lng: 174.7633 },
  { city: "Wellington", country: "New Zealand", cc: "554", lat: -41.2866, lng: 174.7756 },
];

/** Fold case, accents and punctuation so "Bengaluru " matches "bengaluru". */
function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const INDEX = new Map<string, Place>();
for (const place of PLACES) {
  // First entry wins, so "Delhi" beats the "New Delhi" alias for the bare name.
  if (!INDEX.has(fold(place.city))) INDEX.set(fold(place.city), place);
}

/**
 * The same table, keyed by country.
 *
 * People type a country into a box labelled "city" — "norway", "uae", "india"
 * — and the honest response to that is a pin in the right country, not a null.
 * A null was expensive here: it lost the country, which lost the currency, and
 * it lost the coordinates, which kept the gym off the globe entirely. One
 * unrecognised word cost a paying gym both.
 *
 * First entry per country wins, and the table lists each country's largest or
 * best-known city first, so a country-level answer lands somewhere defensible.
 * The owner refines it with the pin picker in settings.
 */
const COUNTRY_INDEX = new Map<string, Place>();
for (const place of PLACES) {
  if (!COUNTRY_INDEX.has(fold(place.country))) COUNTRY_INDEX.set(fold(place.country), place);
}

/** What people type when they mean a country but not its name. */
const COUNTRY_ALIASES: Record<string, string> = {
  uae: "United Arab Emirates",
  emirates: "United Arab Emirates",
  usa: "United States",
  us: "United States",
  america: "United States",
  uk: "United Kingdom",
  britain: "United Kingdom",
  england: "United Kingdom",
  scotland: "United Kingdom",
  wales: "United Kingdom",
  bharat: "India",
  ksa: "Saudi Arabia",
  holland: "Netherlands",
  deutschland: "Germany",
  turkey: "Türkiye",
  korea: "South Korea",
};

/**
 * A country, from what somebody typed. Returns that country's principal city.
 *
 * Separate from `locate` so a caller can tell the two apart: this is a
 * country-level guess, not a street the gym is on.
 */
export function locateCountry(input: string | null | undefined): Place | null {
  if (!input) return null;
  const key = fold(input);
  if (!key) return null;

  const aliased = COUNTRY_ALIASES[key];
  if (aliased) return COUNTRY_INDEX.get(fold(aliased)) ?? null;

  const exact = COUNTRY_INDEX.get(key);
  if (exact) return exact;

  // "gym in norway" and "Norway " both mean Norway.
  for (const [name, place] of COUNTRY_INDEX) {
    if (key.includes(name)) return place;
  }
  return null;
}

/**
 * Resolve a typed city to a pin. Falls back to a containment match so
 * "Andheri West, Mumbai" still finds Mumbai, and then to the country, so
 * somebody who types "norway" into the city box lands in Norway rather than
 * nowhere at all.
 */
export function locate(city: string | null | undefined): Place | null {
  if (!city) return null;
  const key = fold(city);
  if (!key) return null;

  const exact = INDEX.get(key);
  if (exact) return exact;

  for (const [name, place] of INDEX) {
    if (key.includes(name)) return place;
  }
  return locateCountry(city);
}

/**
 * The gazetteer's spelling of a city, but only when the person typed that same
 * city in a different case or with different accents ("bhopal" → "Bhopal").
 *
 * Anything richer than a bare city name — "Andheri West, Mumbai" — is left
 * exactly as typed, because that detail is theirs and worth keeping.
 */
export function canonicalCity(input: string | null | undefined): string | null {
  if (!input) return null;
  const place = locate(input);
  if (!place) return null;
  return fold(input) === fold(place.city) ? place.city : null;
}

/** Cities offered in the listing form's autocomplete. */
export const CITY_OPTIONS = PLACES.map((p) => `${p.city}, ${p.country}`);
