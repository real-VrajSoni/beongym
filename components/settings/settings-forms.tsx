"use client";

import { changePasswordAction, updateTrainerProfileAction } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { FormError, FormField, FormGrid } from "@/components/ui/form-field";
import { Section } from "@/components/ui/section";
import { useAction } from "@/components/ui/use-action";

export type TrainerProfileValues = {
  name: string;
  email: string;
  phone: string;
  bio: string;
  specialization: string;
  experienceYears: string;
};

export function TrainerProfileForm({ values }: { values: TrainerProfileValues }) {
  const { pending, error, fieldErrors, run } = useAction();

  return (
    <Section title="Your profile" description="This is what clients see when they open the portal.">
      <form action={(formData) => run(() => updateTrainerProfileAction(formData))}>
        <div className="space-y-4 px-5 py-5">
          <FormError message={error} />
          <FormGrid>
            <FormField label="Name" htmlFor="name" required error={fieldErrors.name}>
              <Input id="name" name="name" defaultValue={values.name} required />
            </FormField>
            <FormField label="Email" htmlFor="email" required error={fieldErrors.email}>
              <Input id="email" name="email" type="email" defaultValue={values.email} required />
            </FormField>
            <FormField label="Phone" htmlFor="phone" error={fieldErrors.phone}>
              <Input id="phone" name="phone" defaultValue={values.phone} />
            </FormField>
            <FormField
              label="Years coaching"
              htmlFor="experienceYears"
              error={fieldErrors.experienceYears}
            >
              <Input
                id="experienceYears"
                name="experienceYears"
                type="number"
                min={0}
                inputMode="numeric"
                defaultValue={values.experienceYears}
              />
            </FormField>
          </FormGrid>

          <FormField label="Specialisation" htmlFor="specialization" error={fieldErrors.specialization}>
            <Input
              id="specialization"
              name="specialization"
              defaultValue={values.specialization}
              placeholder="Fat loss, strength & body recomposition"
            />
          </FormField>

          <FormField label="Bio" htmlFor="bio" error={fieldErrors.bio}>
            <Textarea id="bio" name="bio" rows={4} defaultValue={values.bio} />
          </FormField>
        </div>

        <div className="flex justify-end border-t border-[var(--border)] px-5 py-3.5">
          <Button type="submit" loading={pending}>
            Save changes
          </Button>
        </div>
      </form>
    </Section>
  );
}

export function PasswordForm() {
  const { pending, error, fieldErrors, run } = useAction();

  return (
    <Section title="Password" description="Use at least 8 characters.">
      <form
        action={(formData) =>
          run(() => changePasswordAction(formData), {
            onSuccess: () => {
              const form = document.getElementById("password-form") as HTMLFormElement | null;
              form?.reset();
            },
          })
        }
        id="password-form"
      >
        <div className="space-y-4 px-5 py-5">
          <FormError message={error} />
          <FormField
            label="Current password"
            htmlFor="currentPassword"
            required
            error={fieldErrors.currentPassword}
          >
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </FormField>
          <FormGrid>
            <FormField
              label="New password"
              htmlFor="newPassword"
              required
              error={fieldErrors.newPassword}
            >
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </FormField>
            <FormField
              label="Confirm new password"
              htmlFor="confirmPassword"
              required
              error={fieldErrors.confirmPassword}
            >
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </FormField>
          </FormGrid>
        </div>

        <div className="flex justify-end border-t border-[var(--border)] px-5 py-3.5">
          <Button type="submit" variant="secondary" loading={pending}>
            Change password
          </Button>
        </div>
      </form>
    </Section>
  );
}
