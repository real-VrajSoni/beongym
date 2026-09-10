import { locate } from "./places";

/**
 * What a gym charges in.
 *
 * A gym in Dubai quotes dirhams. It does not quote rupees, and it certainly
 * does not quote rupees formatted in lakhs — which is what every non-Indian gym
 * on the platform saw before this file existed, because the money formatter had
 * `₹` and the Indian grouping written into it.
 *
 * Currency is a property of the gym, not of the plan or the payment: a gym sells
 * in one currency, and the row-level `currency` columns exist to *remember* what
 * a historical price was quoted in, not to let one gym mix three.
 *
 * `locale` is here because the symbol is only half the job. Indian grouping puts
 * the separators at 1,00,000; almost everywhere else they fall at 100,000. Same
 * number, different reading, and getting it wrong looks like a typo to the only
 * person who matters.
 */
export type Money = {
  /** ISO 4217. */
  code: string;
  /** BCP 47 tag, for digit grouping — not for translating the app. */
  locale: string;
};

/** Every country `lib/geo/places.ts` can resolve, and what it trades in. */
const BY_COUNTRY: Record<string, Money> = {
  India: { code: "INR", locale: "en-IN" },
  "United Arab Emirates": { code: "AED", locale: "en-AE" },
  "Saudi Arabia": { code: "SAR", locale: "en-SA" },
  Qatar: { code: "QAR", locale: "en-QA" },
  "United Kingdom": { code: "GBP", locale: "en-GB" },
  Ireland: { code: "EUR", locale: "en-IE" },
  "United States": { code: "USD", locale: "en-US" },
  Canada: { code: "CAD", locale: "en-CA" },
  Australia: { code: "AUD", locale: "en-AU" },
  "New Zealand": { code: "NZD", locale: "en-NZ" },
  Singapore: { code: "SGD", locale: "en-SG" },
  Malaysia: { code: "MYR", locale: "en-MY" },
  Indonesia: { code: "IDR", locale: "id-ID" },
  Thailand: { code: "THB", locale: "th-TH" },
  Philippines: { code: "PHP", locale: "en-PH" },
  Vietnam: { code: "VND", locale: "vi-VN" },
  Japan: { code: "JPY", locale: "ja-JP" },
  "South Korea": { code: "KRW", locale: "ko-KR" },
  China: { code: "CNY", locale: "zh-CN" },
  "Hong Kong": { code: "HKD", locale: "en-HK" },
  Taiwan: { code: "TWD", locale: "zh-TW" },
  "Sri Lanka": { code: "LKR", locale: "en-LK" },
  Nepal: { code: "NPR", locale: "ne-NP" },
  Bangladesh: { code: "BDT", locale: "bn-BD" },
  Pakistan: { code: "PKR", locale: "en-PK" },
  Israel: { code: "ILS", locale: "he-IL" },
  Türkiye: { code: "TRY", locale: "tr-TR" },
  "South Africa": { code: "ZAR", locale: "en-ZA" },
  Nigeria: { code: "NGN", locale: "en-NG" },
  Kenya: { code: "KES", locale: "en-KE" },
  Ghana: { code: "GHS", locale: "en-GH" },
  Ethiopia: { code: "ETB", locale: "am-ET" },
  Egypt: { code: "EGP", locale: "en-EG" },
  Morocco: { code: "MAD", locale: "fr-MA" },
  Tunisia: { code: "TND", locale: "fr-TN" },
  // The euro, in the countries this product actually reaches.
  France: { code: "EUR", locale: "fr-FR" },
  Germany: { code: "EUR", locale: "de-DE" },
  Spain: { code: "EUR", locale: "es-ES" },
  Portugal: { code: "EUR", locale: "pt-PT" },
  Italy: { code: "EUR", locale: "it-IT" },
  Netherlands: { code: "EUR", locale: "nl-NL" },
  Belgium: { code: "EUR", locale: "nl-BE" },
  Austria: { code: "EUR", locale: "de-AT" },
  Greece: { code: "EUR", locale: "el-GR" },
  Finland: { code: "EUR", locale: "fi-FI" },
  Switzerland: { code: "CHF", locale: "de-CH" },
  Sweden: { code: "SEK", locale: "sv-SE" },
  Norway: { code: "NOK", locale: "nb-NO" },
  Denmark: { code: "DKK", locale: "da-DK" },
  Poland: { code: "PLN", locale: "pl-PL" },
  Czechia: { code: "CZK", locale: "cs-CZ" },
  Hungary: { code: "HUF", locale: "hu-HU" },
  Romania: { code: "RON", locale: "ro-RO" },
  Brazil: { code: "BRL", locale: "pt-BR" },
  Mexico: { code: "MXN", locale: "es-MX" },
  Argentina: { code: "ARS", locale: "es-AR" },
  Chile: { code: "CLP", locale: "es-CL" },
  Colombia: { code: "COP", locale: "es-CO" },
  Peru: { code: "PEN", locale: "es-PE" },
};

/**
 * The dollar, as the fallback when nothing else is known.
 *
 * It used to be the rupee, on the reasoning that most of these gyms are Indian.
 * That reasoning was wrong in the way defaults are usually wrong: it was not a
 * default so much as an assumption, and the moment a gym in Norway typed a word
 * the gazetteer did not recognise, it priced its memberships in rupees and gave
 * no sign anything had gone amiss. A neutral fallback is wrong more often but
 * wrong *visibly* — nobody in Oslo mistakes dollars for their own money.
 *
 * It is only ever a fallback. The gym is asked outright at sign-up, seeded with
 * whatever its city suggests, and can change it in settings afterwards.
 */
export const DEFAULT_CURRENCY = "USD";

/** The currency a gym in this country would quote. */
export function currencyForCountry(country: string | null | undefined): string {
  if (!country) return DEFAULT_CURRENCY;
  return BY_COUNTRY[country.trim()]?.code ?? DEFAULT_CURRENCY;
}

/**
 * What to preselect for a gym, given whatever it has told us so far.
 *
 * A suggestion, not a decision — the sign-up form seeds the dropdown with this
 * and the owner overrides it if their gym prices in something else, which is
 * ordinary near a border or anywhere the local money is unstable.
 */
export function suggestCurrency(city?: string | null, country?: string | null): string {
  if (country) return currencyForCountry(country);
  if (city) return currencyForCity(city);
  return DEFAULT_CURRENCY;
}

/**
 * The currency a gym in this *city* would quote.
 *
 * The listing form asks for a city, not a country — the country is resolved
 * from it — so this is the one the sign-up path actually needs.
 */
export function currencyForCity(city: string | null | undefined): string {
  return currencyForCountry(locate(city ?? undefined)?.country);
}

/**
 * How to group the digits for a currency.
 *
 * Falls back to `en-US` rather than the browser's locale: a number formatted
 * differently on the owner's laptop and the front desk's tablet is a support
 * ticket nobody can reproduce.
 */
export function localeForCurrency(code: string): string {
  for (const money of Object.values(BY_COUNTRY)) {
    if (money.code === code) return money.locale;
  }
  return "en-US";
}

/** Every currency this product knows how to quote in. */
export const CURRENCY_CODES: string[] = [
  ...new Set(Object.values(BY_COUNTRY).map((m) => m.code)),
].sort();

/** True when a posted currency is one we recognise. The browser is not trusted. */
export function isKnownCurrency(code: string): boolean {
  return CURRENCY_CODES.includes(code);
}

/**
 * The list for a dropdown: "USD — $ · US Dollar".
 *
 * The code, the symbol and the name, because none of the three is enough alone.
 * Half a dozen currencies render as a bare "$", several countries call theirs a
 * dollar, and nobody scrolling a list recognises "SEK" on sight.
 *
 * The dollar leads, then the currencies of the countries with the most gyms,
 * then the rest alphabetically — a settings list nobody has to search is worth
 * more than a strictly ordered one.
 */
export function currencyOptions(): { code: string; label: string }[] {
  const names = (() => {
    try {
      return new Intl.DisplayNames(["en"], { type: "currency" });
    } catch {
      return null;
    }
  })();

  const label = (code: string) => {
    const symbol = symbolFor(code);
    const name = names?.of(code);
    const head = symbol && symbol !== code ? `${code} — ${symbol}` : code;
    return name && name !== code ? `${head} · ${name}` : head;
  };

  const first = ["USD", "EUR", "GBP", "INR", "AED", "AUD", "CAD"];
  const rest = CURRENCY_CODES.filter((c) => !first.includes(c)).sort((a, b) => a.localeCompare(b));
  return [...first.filter((c) => CURRENCY_CODES.includes(c)), ...rest].map((code) => ({
    code,
    label: label(code),
  }));
}

/** Just the symbol, for a form prefix where the full amount would be noise. */
export function symbolFor(code: string): string {
  const parts = new Intl.NumberFormat(localeForCurrency(code), {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? code;
}
