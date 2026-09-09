import { Sparkles } from "lucide-react";
import { requireProspect } from "@/lib/auth";
import { PURCHASABLE_PLANS, isPurchasable, planByKey } from "@/lib/platform-plans";
import { CheckoutForm } from "@/components/start/checkout-form";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  await requireProspect();
  const { plan: planParam } = await searchParams;
  // Retired plans can still arrive in a URL; fall back to the entry plan rather
  // than opening a checkout for something that is no longer sold.
  const wanted = (planParam ?? "").toUpperCase();
  const plan = planByKey(isPurchasable(wanted) ? wanted : PURCHASABLE_PLANS[0].key);

  return (
    <>
      <header className="mb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase">
          <Sparkles className="size-3" /> Step 2 of 2
        </span>
        <h1 className="mt-4 text-[26px] leading-tight font-semibold sm:text-[30px]">
          Set up your gym
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Confirm your plan and name your gym. Everything is ready the moment you finish.
        </p>
      </header>

      <CheckoutForm plan={plan} />
    </>
  );
}
