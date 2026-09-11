"use client";

import { manageBillingAction } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/ui/use-action";

export function BillingPortal() {
  const { pending, error, run } = useAction();
  return <div>
    <Button loading={pending} onClick={() => run(manageBillingAction, {
      onSuccess: (result) => { if (result.checkoutUrl) window.location.assign(result.checkoutUrl); },
    })}>Manage subscription and payment method</Button>
    {error ? <p role="alert" className="mt-2 text-sm text-destructive">{error}</p> : null}
    <p className="mt-2 text-sm text-muted-foreground">View billing details and cancellation options in the secure Dodo Payments portal.</p>
  </div>;
}
