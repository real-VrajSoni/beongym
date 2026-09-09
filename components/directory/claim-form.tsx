"use client";

import { claimGymAction } from "@/app/actions/claim";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError, FormField } from "@/components/ui/form-field";
import { useAction } from "@/components/ui/use-action";
import { CLAIM_PRICE_USD } from "@/lib/platform-plans";

export function ClaimForm({ code, gymName }: { code: string; gymName: string }) {
  const { pending, error, fieldErrors, run } = useAction();

  return (
    <form action={(fd) => run(() => claimGymAction(fd))} className="space-y-4">
      <input type="hidden" name="code" value={code} />
      <FormError message={error} />

      <FormField
        label="Your role at the gym"
        htmlFor="role"
        required
        error={fieldErrors.role}
        hint="Owner, manager, head coach — whatever fits."
      >
        <Input id="role" name="role" placeholder="Owner" className="h-11" required />
      </FormField>

      <FormField
        label="Phone number"
        htmlFor="phone"
        required
        error={fieldErrors.phone}
        hint="We call this number to confirm you run the gym."
      >
        <Input id="phone" name="phone" placeholder="+91 98200 10001" className="h-11" required />
      </FormField>

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Claim {gymName} — ${CLAIM_PRICE_USD}
      </Button>
      <p className="text-center text-[12px] text-muted-foreground">
        ${CLAIM_PRICE_USD} a month, the same price in every country. This opens your gym store
        on Pro. No gateway is connected in this release, so nothing is charged today.
      </p>
    </form>
  );
}
