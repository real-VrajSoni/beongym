/**
 * Dialling codes, for the phone field.
 *
 * A short table in the repo rather than a package: the list changes about once
 * a decade, and a 300 kB dependency to render a dropdown is a bad trade. Every
 * country with a gym on the map is here, plus everywhere a gym is likely to
 * open next.
 *
 * `search` carries the alternative names people actually type — somebody looking
 * for the UAE does not type "United Arab Emirates", and somebody in Mumbai
 * types "india" long before they scroll to it.
 */
export type DialCode = {
  /** ISO 3166-1 alpha-2, used for the flag. */
  iso: string;
  name: string;
  dial: string;
  search?: string;
};

export const DIAL_CODES: DialCode[] = [
  { iso: "IN", name: "India", dial: "+91", search: "bharat" },
  { iso: "AE", name: "United Arab Emirates", dial: "+971", search: "uae dubai abu dhabi emirates" },
  { iso: "GB", name: "United Kingdom", dial: "+44", search: "uk britain england scotland wales" },
  { iso: "US", name: "United States", dial: "+1", search: "usa america" },
  { iso: "CA", name: "Canada", dial: "+1" },
  { iso: "AU", name: "Australia", dial: "+61" },
  { iso: "NZ", name: "New Zealand", dial: "+64" },
  { iso: "SG", name: "Singapore", dial: "+65" },
  { iso: "MY", name: "Malaysia", dial: "+60" },
  { iso: "ID", name: "Indonesia", dial: "+62" },
  { iso: "TH", name: "Thailand", dial: "+66" },
  { iso: "PH", name: "Philippines", dial: "+63" },
  { iso: "VN", name: "Vietnam", dial: "+84" },
  { iso: "JP", name: "Japan", dial: "+81" },
  { iso: "KR", name: "South Korea", dial: "+82", search: "korea" },
  { iso: "CN", name: "China", dial: "+86" },
  { iso: "HK", name: "Hong Kong", dial: "+852" },
  { iso: "LK", name: "Sri Lanka", dial: "+94" },
  { iso: "NP", name: "Nepal", dial: "+977" },
  { iso: "BD", name: "Bangladesh", dial: "+880" },
  { iso: "PK", name: "Pakistan", dial: "+92" },
  { iso: "SA", name: "Saudi Arabia", dial: "+966", search: "ksa" },
  { iso: "QA", name: "Qatar", dial: "+974" },
  { iso: "KW", name: "Kuwait", dial: "+965" },
  { iso: "BH", name: "Bahrain", dial: "+973" },
  { iso: "OM", name: "Oman", dial: "+968" },
  { iso: "ZA", name: "South Africa", dial: "+27" },
  { iso: "NG", name: "Nigeria", dial: "+234" },
  { iso: "KE", name: "Kenya", dial: "+254" },
  { iso: "EG", name: "Egypt", dial: "+20" },
  { iso: "MA", name: "Morocco", dial: "+212" },
  { iso: "TR", name: "Türkiye", dial: "+90", search: "turkey" },
  { iso: "IE", name: "Ireland", dial: "+353" },
  { iso: "FR", name: "France", dial: "+33" },
  { iso: "DE", name: "Germany", dial: "+49", search: "deutschland" },
  { iso: "ES", name: "Spain", dial: "+34", search: "espana" },
  { iso: "PT", name: "Portugal", dial: "+351" },
  { iso: "IT", name: "Italy", dial: "+39", search: "italia" },
  { iso: "NL", name: "Netherlands", dial: "+31", search: "holland" },
  { iso: "BE", name: "Belgium", dial: "+32" },
  { iso: "CH", name: "Switzerland", dial: "+41" },
  { iso: "AT", name: "Austria", dial: "+43" },
  { iso: "SE", name: "Sweden", dial: "+46" },
  { iso: "NO", name: "Norway", dial: "+47" },
  { iso: "DK", name: "Denmark", dial: "+45" },
  { iso: "FI", name: "Finland", dial: "+358" },
  { iso: "PL", name: "Poland", dial: "+48" },
  { iso: "CZ", name: "Czechia", dial: "+420", search: "czech republic" },
  { iso: "GR", name: "Greece", dial: "+30" },
  { iso: "RO", name: "Romania", dial: "+40" },
  { iso: "BR", name: "Brazil", dial: "+55", search: "brasil" },
  { iso: "MX", name: "Mexico", dial: "+52" },
  { iso: "AR", name: "Argentina", dial: "+54" },
  { iso: "CL", name: "Chile", dial: "+56" },
  { iso: "CO", name: "Colombia", dial: "+57" },
  { iso: "PE", name: "Peru", dial: "+51" },
];

/** India first: it is where most of these gyms are, and defaults should be kind. */
export const DEFAULT_DIAL = "+91";

/** The flag emoji for an ISO code, built from regional indicator letters. */
export function flagFor(iso: string): string {
  return String.fromCodePoint(
    ...iso.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

/** Case-insensitive match over name, dialling code and the alternatives. */
export function searchDialCodes(query: string): DialCode[] {
  const q = query.trim().toLowerCase();
  if (!q) return DIAL_CODES;
  return DIAL_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.dial.includes(q.replace(/^00/, "+")) ||
      c.iso.toLowerCase() === q ||
      (c.search ?? "").includes(q),
  );
}

/**
 * Splits a stored number back into a country and the rest.
 *
 * Longest dialling code first, so +1 never wins over a +1-prefixed longer code
 * and India's +91 is not confused with +9.
 */
export function splitPhone(value: string | null | undefined): { dial: string; number: string } {
  const trimmed = (value ?? "").trim();
  if (!trimmed.startsWith("+")) return { dial: DEFAULT_DIAL, number: trimmed };

  const match = [...DIAL_CODES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => trimmed.startsWith(c.dial));

  return match
    ? { dial: match.dial, number: trimmed.slice(match.dial.length).trim() }
    : { dial: DEFAULT_DIAL, number: trimmed };
}
