"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { savePlanAction } from "@/app/actions/plans";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { FormError, FormField, FormGrid } from "@/components/ui/form-field";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { useAction } from "@/components/ui/use-action";
import { BILLING_LABELS, PLAN_TYPE_LABELS } from "@/lib/labels";
import { formatCurrency } from "@/lib/format";
import { symbolFor } from "@/lib/geo/currency";

export type PlanFormValues = {
  planId: string;
  name: string;
  description: string;
  planType: string;
  price: number;
  durationDays: number;
  billingInterval: string;
  isActive: boolean;
  showPrice: boolean;
};

const DURATION_PRESETS = [
  { label: "1 week", days: 7 },
  { label: "4 weeks", days: 28 },
  { label: "8 weeks", days: 56 },
  { label: "12 weeks", days: 84 },
  { label: "6 months", days: 180 },
];

export function PlanFormDialog({
  open,
  onOpenChange,
  plan,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: PlanFormValues;
  /** The gym's currency, for the label and the preview. */
  currency: string;
}) {
  const router = useRouter();
  const { pending, error, fieldErrors, run, reset } = useAction();
  const [duration, setDuration] = useState(String(plan?.durationDays ?? 84));
  const [price, setPrice] = useState(String(plan?.price ?? 15000));
  /**
   * A price the owner has just typed is a price they mean to charge, so the
   * store publishes it. Programmes we created for them start hidden until they
   * come in and set one themselves — which is this.
   */
  const [showPrice, setShowPrice] = useState(plan?.showPrice ?? true);
  const isEdit = Boolean(plan);

  function submit(formData: FormData) {
    run(() => savePlanAction(formData), {
      onSuccess: (result) => {
        onOpenChange(false);
        if (!isEdit && result.id) router.push(`/gym/plans/${result.id}`);
        else router.refresh();
      },
    });
  }

  const priceNumber = Number(price);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <ModalContent
        size="lg"
        title={isEdit ? "Edit programme" : "Create a programme"}
        description="A plan is what a member buys. Price, length and billing live here."
      >
        <form action={submit}>
          <ModalBody className="space-y-4">
            <FormError message={error} />
            {isEdit ? <input type="hidden" name="planId" value={plan!.planId} /> : null}

            <FormField label="Name" htmlFor="name" required error={fieldErrors.name}>
              <Input
                id="name"
                name="name"
                defaultValue={plan?.name}
                placeholder="12 Week Transformation"
                required
              />
            </FormField>

            <FormField label="Description" htmlFor="description" error={fieldErrors.description}>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={plan?.description}
                placeholder="Personalised workouts, nutrition guidance and coaching on the floor."
              />
            </FormField>

            <FormGrid>
              <FormField label="Type" htmlFor="planType" required>
                <Select
                  id="planType"
                  name="planType"
                  defaultValue={plan?.planType ?? "TRANSFORMATION"}
                >
                  {Object.entries(PLAN_TYPE_LABELS).map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Billing" htmlFor="billingInterval" required>
                <Select
                  id="billingInterval"
                  name="billingInterval"
                  defaultValue={plan?.billingInterval ?? "ONE_TIME"}
                >
                  {Object.entries(BILLING_LABELS).map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField
                label={`Price (${symbolFor(currency)})`}
                htmlFor="price"
                required
                error={fieldErrors.price}
                hint={
                  Number.isFinite(priceNumber) && priceNumber > 0
                    ? formatCurrency(priceNumber, currency)
                    : undefined
                }
              >
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min={0}
                  step={100}
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setShowPrice(true);
                  }}
                  required
                />
              </FormField>

              <FormField
                label="Duration (days)"
                htmlFor="durationDays"
                required
                error={fieldErrors.durationDays}
              >
                <Input
                  id="durationDays"
                  name="durationDays"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                />
              </FormField>
            </FormGrid>

            <div className="flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((p) => (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => setDuration(String(p.days))}
                  className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:border-[var(--brand)] hover:text-foreground"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 text-[13px]">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={plan?.isActive ?? true}
                  className="size-4 rounded border-[var(--border-strong)] accent-[var(--brand)]"
                />
                <span>Available for new subscriptions</span>
              </label>

              <label className="flex items-start gap-2.5 text-[13px]">
                <input
                  type="checkbox"
                  name="showPrice"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-[var(--border-strong)] accent-[var(--brand)]"
                />
                <span>
                  Show this price on your public store
                  <span className="mt-0.5 block text-[12px] text-muted-foreground">
                    {showPrice
                      ? "Visitors see the price alongside a button to contact you."
                      : "Visitors see the programme and a button to ask you for the price."}
                  </span>
                </span>
              </label>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {isEdit ? "Save programme" : "Create programme"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

export function CreatePlanButton({
  children,
  currency,
}: {
  children?: React.ReactNode;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>{children ?? "Create programme"}</Button>
      <PlanFormDialog open={open} onOpenChange={setOpen} currency={currency} />
    </>
  );
}
