"use client";

import { Select } from "@/components/ui/input";
import { BUSINESS_TYPES, DEFAULT_BUSINESS_TYPE } from "@/lib/business-types";

/**
 * What kind of place somebody runs.
 *
 * Asked once, at sign-up, and never again in the workspace — because it changes
 * nothing about how the product behaves. A yoga studio takes payments and
 * attendance exactly as a gym does. What it changes is what the public map says
 * about them, and being described as "Gym" when you teach Pilates is the kind
 * of small wrongness that makes a directory feel like it was not built for you.
 *
 * A native select, like the currency field: it gives the right picker on a
 * phone, which is where a lot of these sign-ups happen.
 */
export function BusinessTypeField({
  name = "businessType",
  id,
  defaultValue,
  value,
  onChange,
}: {
  name?: string;
  id?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (key: string) => void;
}) {
  const known = (k: string | undefined) =>
    k && BUSINESS_TYPES.some((b) => b.key === k) ? k : DEFAULT_BUSINESS_TYPE;

  return (
    <Select
      id={id}
      name={name}
      {...(value !== undefined
        ? { value: known(value), onChange: (e) => onChange?.(e.target.value) }
        : { defaultValue: known(defaultValue) })}
    >
      {BUSINESS_TYPES.map((b) => (
        <option key={b.key} value={b.key}>
          {b.label} — {b.hint}
        </option>
      ))}
    </Select>
  );
}
