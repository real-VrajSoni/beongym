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
 * India, because that is where most of these gyms are and a default should be
 * the common case rather than the neutral one.
 */
export const DEFAULT_CURRENCY = "INR";

/** The currency a gym in this country would quote. */
export function currencyForCountry(country: string | null | undefined): string {
  if (!country) return DEFAULT_CURRENCY;
  return BY_COUNTRY[country.trim()]?.code ?? DEFAULT_CURRENCY;
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

/** Every currency in use, for a settings dropdown. Sorted, de-duplicated. */
export function currencyOptions(): { code: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const [country, money] of Object.entries(BY_COUNTRY)) {
    if (!seen.has(money.code)) seen.set(money.code, country);
  }
  return [...seen.entries()]
    .map(([code]) => ({
      code,
      label: `${code} — ${symbolFor(code)}`,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
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
