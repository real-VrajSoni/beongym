"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { createClientAction, updateClientAction } from "@/app/actions/clients";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { PhoneField } from "@/components/ui/phone-field";
import { FormError, FormField, FormGrid } from "@/components/ui/form-field";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { useAction } from "@/components/ui/use-action";
import { formatCurrency } from "@/lib/format";
import { symbolFor } from "@/lib/geo/currency";
import { GENDER_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/labels";

export type PlanOption = {
  id: string;
  name: string;
  /** The list price. What the member is charged is a separate, editable field. */
  price: number;
  durationDays: number;
  /** The gym's currency — a gym sells in one, so every option carries the same. */
  currency: string;
};

export type ClientFormValues = {
  clientId: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
};

export function ClientFormDialog({
  open,
  onOpenChange,
  plans,
  client,
  prefill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: PlanOption[];
  /** Provided when editing; omitted when onboarding a new client. */
  client?: ClientFormValues;
  /**
   * Details carried over from somewhere else — an enquiry being turned into a
   * member. Not the same as `client`: this is still a new member, so the form
   * keeps every field a new member needs.
   */
  prefill?: { name?: string; email?: string; phone?: string };
}) {
  const router = useRouter();
  const { pending, error, fieldErrors, run, reset } = useAction();
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [recordPayment, setRecordPayment] = useState(true);
  const isEdit = Boolean(client);
  const selectedPlan = plans.find((p) => p.id === planId);
  const currency = selectedPlan?.currency ?? plans[0]?.currency ?? "INR";

  // What they are actually being charged. Seeded from the plan and then left
  // alone — a joining offer or a friend's rate is typed over the top, and the
  // membership remembers the number rather than the plan it came from.
  const [price, setPrice] = useState(String(plans[0]?.price ?? 0));
  const [pricedPlan, setPricedPlan] = useState(planId);
  if (planId !== pricedPlan) {
    // Adjusted during render rather than in an effect, so the box never paints
    // the previous plan's price for a frame.
    setPricedPlan(planId);
    setPrice(String(selectedPlan?.price ?? 0));
  }
  const priceNumber = Number(price);
  const priceValid = Number.isFinite(priceNumber) && priceNumber >= 0;

  function handleSubmit(formData: FormData) {
    run(() => (isEdit ? updateClientAction(formData) : createClientAction(formData)), {
      onSuccess: (result) => {
        onOpenChange(false);
        if (!isEdit && result.id) router.push(`/gym/clients/${result.id}`);
        else router.refresh();
      },
    });
  }

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
        title={isEdit ? "Edit member" : "Add a member"}
        description={
          isEdit
            ? "Update this member's details."
            : "Create their login and put them on a programme in one step."
        }
      >
        <form action={handleSubmit}>
          <ModalBody className="space-y-5">
            <FormError message={error} />
            {isEdit ? <input type="hidden" name="clientId" value={client!.clientId} /> : null}
            {!isEdit ? (
              <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 py-2.5 text-[12.5px] text-muted-foreground">
                A member code is generated automatically. Give the member that code, your gym code
                and this password — that is how they sign in.
              </p>
            ) : null}

            <FormGrid>
              <FormField label="Full name" htmlFor="name" required error={fieldErrors.name}>
                <Input
                  id="name"
                  name="name"
                  defaultValue={client?.name ?? prefill?.name}
                  placeholder="Rahul Sharma"
                  required
                />
              </FormField>
              <FormField label="Email" htmlFor="email" required error={fieldErrors.email}>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={client?.email ?? prefill?.email}
                  placeholder="rahul@example.com"
                  required
                />
              </FormField>
              <FormField label="Phone" htmlFor="phone" error={fieldErrors.phone}>
                <PhoneField
                  id="phone"
                  name="phone"
                  defaultValue={client?.phone ?? prefill?.phone ?? ""}
                />
              </FormField>
              {!isEdit ? (
                <FormField
                  label="Temporary password"
                  htmlFor="password"
                  required
                  hint="Share it with the client — they can change it later."
                  error={fieldErrors.password}
                >
                  <Input
                    id="password"
                    name="password"
                    type="text"
                    defaultValue="welcome123"
                    minLength={8}
                    required
                  />
                </FormField>
              ) : null}
              <FormField
                label="Date of birth"
                htmlFor="dateOfBirth"
                error={fieldErrors.dateOfBirth}
              >
                <DateField
                  id="dateOfBirth"
                  name="dateOfBirth"
                  defaultValue={client?.dateOfBirth ?? ""}
                  purpose="birthday"
                />
              </FormField>
              <FormField label="Gender" htmlFor="gender" error={fieldErrors.gender}>
                <Select id="gender" name="gender" defaultValue={client?.gender ?? ""}>
                  <option value="">Not specified</option>
                  {Object.entries(GENDER_LABELS).map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </Select>
              </FormField>
            </FormGrid>

            {!isEdit ? (
              <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <p className="text-[13px] font-medium">Starting programme</p>
                <FormGrid>
                  <FormField label="Programme" htmlFor="planId" required error={fieldErrors.planId}>
                    <Select
                      id="planId"
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
                  <FormField
                    label={`Price (${symbolFor(currency)})`}
                    htmlFor="price"
                    required
                    error={fieldErrors.price}
                    hint={
                      priceValid && selectedPlan && priceNumber !== selectedPlan.price
                        ? `List price is ${formatCurrency(selectedPlan.price, currency)}`
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
                      onChange={(e) => setPrice(e.target.value)}
                      required
                    />
                  </FormField>
                  <FormField
                    label="Start date"
                    htmlFor="startDate"
                    required
                    error={fieldErrors.startDate}
                    hint={selectedPlan ? `Runs for ${selectedPlan.durationDays} days` : undefined}
                  >
                    <DateField
                      id="startDate"
                      name="startDate"
                      defaultValue={format(new Date(), "yyyy-MM-dd")}
                      required
                    />
                  </FormField>
                  <FormField label="Status" htmlFor="status">
                    <Select id="status" name="status" defaultValue="ACTIVE">
                      <option value="ACTIVE">Active</option>
                      <option value="TRIAL">Trial</option>
                    </Select>
                  </FormField>
                  <FormField label="Payment method" htmlFor="paymentMethod">
                    <Select
                      id="paymentMethod"
                      name="paymentMethod"
                      defaultValue="UPI"
                      disabled={!recordPayment}
                    >
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([value, text]) => (
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
                    name="recordPayment"
                    checked={recordPayment}
                    onChange={(e) => setRecordPayment(e.target.checked)}
                    className="size-4 rounded border-[var(--border-strong)] accent-[var(--brand)]"
                  />
                  <span>
                    Record {priceValid ? formatCurrency(priceNumber, currency) : "the fee"} as paid
                    today
                  </span>
                </label>
                <label className="flex items-center gap-2.5 text-[13px]">
                  <input
                    type="checkbox"
                    name="autoRenew"
                    className="size-4 rounded border-[var(--border-strong)] accent-[var(--brand)]"
                  />
                  <span>Auto-renew at the end of the term</span>
                </label>
              </div>
            ) : null}
          </ModalBody>

          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {isEdit ? "Save changes" : "Add member"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
