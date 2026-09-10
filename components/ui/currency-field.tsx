"use client";

import { Select } from "@/components/ui/input";
import { CURRENCY_CODES, currencyOptions, DEFAULT_CURRENCY } from "@/lib/geo/currency";

/**
 * What the gym charges its members in.
 *
 * Asked outright rather than inferred, because inferring it is what went wrong:
 * a gym that typed something the gazetteer did not recognise silently got the
 * fallback, and the first anyone knew of it was a membership priced in rupees
 * in Oslo. A dropdown the owner can see and change turns a silent wrong answer
 * into a visible one they can correct in a second.
 *
 * Seeded from the city as they type it — the suggestion is nearly always right,
 * and being right by default is worth more than being neutral. But it is only
 * ever a suggestion: a gym near a border, or anywhere the local money is
 * unstable, may well price in something else, and that is theirs to decide.
 *
 * A native select on purpose: it gives the correct wheel picker on a phone,
 * which is where a fair number of these sign-ups happen.
 */
export function CurrencyField({
  name = "currency",
  id,
  value,
  onChange,
  defaultValue,
  disabled,
}: {
  name?: string;
  id?: string;
  /** Controlled: pass with `onChange` when a city field should re-seed it. */
  value?: string;
  onChange?: (code: string) => void;
  defaultValue?: string;
  disabled?: boolean;
}) {
  const options = currencyOptions();
  const safe = (code: string | undefined) =>
    code && CURRENCY_CODES.includes(code) ? code : DEFAULT_CURRENCY;

  return (
    <Select
      id={id}
      name={name}
      disabled={disabled}
      {...(value !== undefined
        ? { value: safe(value), onChange: (e) => onChange?.(e.target.value) }
        : { defaultValue: safe(defaultValue) })}
    >
      {options.map((o) => (
        <option key={o.code} value={o.code}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
