"use client";

import { useState } from "react";
import { updateGymProfileAction } from "@/app/actions/gym";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { FormError, FormField, FormGrid } from "@/components/ui/form-field";
import { Section } from "@/components/ui/section";
import { useAction } from "@/components/ui/use-action";
import { ImageUpload } from "./image-upload";
import { MapPicker } from "@/components/directory/map-picker";
import { CITY_OPTIONS } from "@/lib/geo/places";
import { CurrencyField } from "@/components/ui/currency-field";
import { cn } from "@/lib/utils";

export type GymProfileValues = {
  imageUrl: string;
  latitude: number | null;
  longitude: number | null;
  name: string;
  tagline: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  logoText: string;
  accentColor: string;
  /** What this gym charges its members in. Every price in the app follows it. */
  currency: string;
};

const SWATCHES = [
  "#7c6cff",
  "#2dd4bf",
  "#5aa2f5",
  "#f0709f",
  "#e8a33d",
  "#3ecf7e",
  "#f0696f",
  "#8f9fba",
];

export function GymProfileForm({
  values,
  gymCode,
  canEdit,
}: {
  values: GymProfileValues;
  gymCode: string;
  canEdit: boolean;
}) {
  const { pending, error, fieldErrors, run } = useAction();
  const [accent, setAccent] = useState(values.accentColor);
  const [logoText, setLogoText] = useState(values.logoText);
  const [name, setName] = useState(values.name);
  const [city, setCity] = useState(values.city);

  return (
    <Section
      title="Gym profile"
      description={
        canEdit
          ? "Your name, branding and contact details. Members see these."
          : "Only the gym owner can change these details."
      }
    >
      <form action={(fd) => run(() => updateGymProfileAction(fd))}>
        <fieldset disabled={!canEdit} className="space-y-5 px-5 py-5 disabled:opacity-70">
          <FormError message={error} />

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <p className="mb-3 text-[13px] font-medium">Profile image</p>
            <ImageUpload
              name="imageUrl"
              defaultValue={values.imageUrl}
              accentColor={accent}
              fallback={logoText || name.slice(0, 2).toUpperCase() || "GY"}
            />
            <p className="mt-3 border-t border-[var(--border)] pt-3 text-[12px] text-muted-foreground">
              Shown on your public listing at{" "}
              <span className="font-mono text-foreground">/gyms/{gymCode}</span> and in the
              directory. Without one, members see your initials on your accent colour.
            </p>
          </div>

          <FormGrid>
            <FormField label="Gym name" htmlFor="name" required error={fieldErrors.name}>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </FormField>
            <FormField
              label="Logo initials"
              htmlFor="logoText"
              hint="One or two letters."
              error={fieldErrors.logoText}
            >
              <Input
                id="logoText"
                name="logoText"
                maxLength={2}
                value={logoText}
                onChange={(e) => setLogoText(e.target.value.toUpperCase())}
                placeholder="IT"
                className="uppercase"
              />
            </FormField>
          </FormGrid>

          <FormField label="Tagline" htmlFor="tagline" error={fieldErrors.tagline}>
            <Input
              id="tagline"
              name="tagline"
              defaultValue={values.tagline}
              placeholder="Strength is earned, never given."
            />
          </FormField>

          <div>
            <p className="mb-2 text-[13px] font-medium">Accent colour</p>
            <div className="flex flex-wrap items-center gap-2">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAccent(c)}
                  aria-label={`Use ${c}`}
                  aria-pressed={accent === c}
                  className={cn(
                    "size-8 rounded-lg border-2 transition-transform",
                    accent === c
                      ? "scale-110 border-foreground"
                      : "border-transparent hover:scale-105",
                  )}
                  style={{ background: c }}
                />
              ))}
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="h-8 w-12 cursor-pointer rounded-lg border border-[var(--border-strong)] bg-transparent"
                aria-label="Custom accent colour"
              />
            </div>
            <input type="hidden" name="accentColor" value={accent} />
            {fieldErrors.accentColor ? (
              <p className="mt-1.5 text-[12.5px] text-[var(--danger)]">{fieldErrors.accentColor}</p>
            ) : null}
          </div>

          <FormGrid>
            <FormField label="City" htmlFor="city" error={fieldErrors.city}>
              <Input
                id="city"
                name="city"
                list="known-cities"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <datalist id="known-cities">
                {CITY_OPTIONS.map((c) => (
                  <option key={c} value={c.split(",")[0]} label={c} />
                ))}
              </datalist>
            </FormField>
            <FormField
              label="What you charge members in"
              htmlFor="gym-currency"
              error={fieldErrors.currency}
              hint="Every price in your workspace. Changing it relabels them, it does not convert them."
            >
              <CurrencyField
                id="gym-currency"
                defaultValue={values.currency}
                disabled={!canEdit}
              />
            </FormField>
            <FormField label="Phone" htmlFor="gym-phone" error={fieldErrors.phone}>
              <Input id="gym-phone" name="phone" defaultValue={values.phone} />
            </FormField>
            <FormField label="Front-desk email" htmlFor="gym-email" error={fieldErrors.email}>
              <Input id="gym-email" name="email" type="email" defaultValue={values.email} />
            </FormField>
          </FormGrid>

          <FormField label="Address" htmlFor="address" error={fieldErrors.address}>
            <Textarea id="address" name="address" rows={2} defaultValue={values.address} />
          </FormField>

          <div>
            <p className="mb-2 text-[13px] font-medium">Your pin on the map</p>
            <MapPicker
              city={city}
              value={{ lat: values.latitude, lng: values.longitude }}
              height={200}
            />
          </div>
        </fieldset>

        {canEdit ? (
          <div className="flex justify-end border-t border-[var(--border)] px-5 py-3.5">
            <Button type="submit" loading={pending}>
              Save gym
            </Button>
          </div>
        ) : null}
      </form>
    </Section>
  );
}
