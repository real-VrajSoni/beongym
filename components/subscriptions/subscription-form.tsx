"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { saveSubscriptionAction } from "@/app/actions/subscriptions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { FormError, FormField, FormGrid } from "@/components/ui/form-field";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { useAction } from "@/components/ui/use-action";
import { formatCurrency } from "@/lib/format";
import { symbolFor, DEFAULT_CURRENCY } from "@/lib/geo/currency";
import { SUBSCRIPTION_STATUS_LABELS } from "@/lib/labels";

export type SubscriptionFormOptions = {
  clients: { id: string; name: string }[];
  plans: { id: string; name: string; price: number; durationDays: number; currency: string }[];
};

export function NewSubscriptionButton({ clients, plans }: SubscriptionFormOptions) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const { pending, error, fieldErrors, run, reset } = useAction();
  const plan = plans.find((p) => p.id === planId);
  const currency = plan?.currency ?? plans[0]?.currency ?? DEFAULT_CURRENCY;

  // Seeded from the plan, then the desk's to change — see client-form.tsx.
  const [price, setPrice] = useState(String(plans[0]?.price ?? 0));
  const [pricedPlan, setPricedPlan] = useState(planId);
  if (planId !== pricedPlan) {
    setPricedPlan(planId);
    setPrice(String(plan?.price ?? 0));
  }
  const priceNumber = Number(price);
  const priceValid = Number.isFinite(priceNumber) && priceNumber >= 0;

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={plans.length === 0 || clients.length === 0}>
        <Plus />
        <span className="hidden sm:inline">New subscription</span>
        <span className="sm:hidden">New</span>
      </Button>

      <Modal
        open={open}
        onOpenChange={(next) => {
          if (!next) reset();
          setOpen(next);
        }}
      >
        <ModalContent title="New subscription" description="Put an existing client on a programme.">
          <form
            action={(formData) =>
              run(() => saveSubscriptionAction(formData), {
                onSuccess: () => {
                  setOpen(false);
                  router.refresh();
                },
              })
            }
          >
            <ModalBody className="space-y-4">
              <FormError message={error} />

              <FormField label="Client" htmlFor="sub-client" required error={fieldErrors.clientId}>
                <Select id="sub-client" name="clientId" defaultValue="" required>
                  <option value="" disabled>
                    Choose a client
                  </option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Programme" htmlFor="sub-plan" required error={fieldErrors.planId}>
                <Select
                  id="sub-plan"
                  name="planId"
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  required
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormGrid>
                <FormField
                  label={`Price (${symbolFor(currency)})`}
                  htmlFor="sub-price"
                  required
                  error={fieldErrors.price}
                  hint={
                    priceValid && plan && priceNumber !== plan.price
                      ? `List price is ${formatCurrency(plan.price, currency)}`
                      : undefined
                  }
                >
                  <Input
                    id="sub-price"
                    name="price"
                    type="number"
                    min={0}
                    step={100}
                    inputMode="numeric"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </FormField>
                <FormField
                  label="Start date"
                  htmlFor="sub-start"
                  required
                  error={fieldErrors.startDate}
                  hint={plan ? `Ends after ${plan.durationDays} days` : undefined}
                >
                  <DateField
                    id="sub-start"
                    name="startDate"
                    defaultValue={format(new Date(), "yyyy-MM-dd")}
                    required
                  />
                </FormField>
                <FormField label="Status" htmlFor="sub-status" required>
                  <Select id="sub-status" name="status" defaultValue="ACTIVE">
                    {Object.entries(SUBSCRIPTION_STATUS_LABELS).map(([value, text]) => (
                      <option key={value} value={value}>
                        {text}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </FormGrid>

              <label className="flex items-center gap-2.5 text-[13px]">
                <input
                  type="checkbox"
                  name="autoRenew"
                  className="size-4 rounded border-[var(--border-strong)] accent-[var(--brand)]"
                />
                <span>Auto-renew at the end of the term</span>
              </label>
            </ModalBody>

            <ModalFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                Create subscription
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
}
