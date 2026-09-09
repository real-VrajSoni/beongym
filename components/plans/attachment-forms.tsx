"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Apple, Dumbbell, Pencil, Plus } from "lucide-react";
import { saveDietPlanAction, saveWorkoutPlanAction } from "@/app/actions/plans";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { FormError, FormField, FormGrid } from "@/components/ui/form-field";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { useAction } from "@/components/ui/use-action";

export function WorkoutPlanButton({
  planId,
  workoutPlan,
}: {
  planId: string;
  workoutPlan?: { id: string; name: string; description: string | null } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { pending, error, fieldErrors, run, reset } = useAction();

  return (
    <>
      <Button
        size="sm"
        variant={workoutPlan ? "ghost" : "secondary"}
        onClick={() => setOpen(true)}
      >
        {workoutPlan ? <Pencil /> : <Plus />}
        {workoutPlan ? "Edit" : "Attach workout plan"}
      </Button>

      <Modal
        open={open}
        onOpenChange={(next) => {
          if (!next) reset();
          setOpen(next);
        }}
      >
        <ModalContent
          title={workoutPlan ? "Edit workout plan" : "Attach a workout plan"}
          description="The training template every client on this programme follows."
        >
          <form
            action={(formData) =>
              run(() => saveWorkoutPlanAction(formData), {
                onSuccess: () => {
                  setOpen(false);
                  router.refresh();
                },
              })
            }
          >
            <ModalBody className="space-y-4">
              <FormError message={error} />
              <input type="hidden" name="planId" value={planId} />
              {workoutPlan ? (
                <input type="hidden" name="workoutPlanId" value={workoutPlan.id} />
              ) : null}

              <FormField label="Name" htmlFor="wp-name" required error={fieldErrors.name}>
                <Input
                  id="wp-name"
                  name="name"
                  defaultValue={workoutPlan?.name}
                  placeholder="Upper/Lower Split — 4 days"
                  required
                />
              </FormField>
              <FormField label="Description" htmlFor="wp-description">
                <Textarea
                  id="wp-description"
                  name="description"
                  rows={4}
                  defaultValue={workoutPlan?.description ?? ""}
                  placeholder="Four training days a week alternating upper and lower body…"
                />
              </FormField>
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                <Dumbbell /> Save workout plan
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
}

export function DietPlanButton({
  planId,
  dietPlan,
}: {
  planId: string;
  dietPlan?: {
    id: string;
    name: string;
    description: string | null;
    caloriesTarget: number | null;
    proteinTarget: number | null;
    carbsTarget: number | null;
    fatsTarget: number | null;
  } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { pending, error, fieldErrors, run, reset } = useAction();

  return (
    <>
      <Button size="sm" variant={dietPlan ? "ghost" : "secondary"} onClick={() => setOpen(true)}>
        {dietPlan ? <Pencil /> : <Plus />}
        {dietPlan ? "Edit" : "Attach nutrition plan"}
      </Button>

      <Modal
        open={open}
        onOpenChange={(next) => {
          if (!next) reset();
          setOpen(next);
        }}
      >
        <ModalContent
          title={dietPlan ? "Edit nutrition plan" : "Attach a nutrition plan"}
          description="Daily macro targets and the guidance clients see on their nutrition page."
        >
          <form
            action={(formData) =>
              run(() => saveDietPlanAction(formData), {
                onSuccess: () => {
                  setOpen(false);
                  router.refresh();
                },
              })
            }
          >
            <ModalBody className="space-y-4">
              <FormError message={error} />
              <input type="hidden" name="planId" value={planId} />
              {dietPlan ? <input type="hidden" name="dietPlanId" value={dietPlan.id} /> : null}

              <FormField label="Name" htmlFor="dp-name" required error={fieldErrors.name}>
                <Input
                  id="dp-name"
                  name="name"
                  defaultValue={dietPlan?.name}
                  placeholder="Moderate deficit — Indian home cooking"
                  required
                />
              </FormField>

              <FormGrid className="sm:grid-cols-4">
                <FormField label="Calories" htmlFor="dp-cal" error={fieldErrors.caloriesTarget}>
                  <Input
                    id="dp-cal"
                    name="caloriesTarget"
                    type="number"
                    inputMode="numeric"
                    defaultValue={dietPlan?.caloriesTarget ?? ""}
                    placeholder="2200"
                  />
                </FormField>
                <FormField label="Protein (g)" htmlFor="dp-p" error={fieldErrors.proteinTarget}>
                  <Input
                    id="dp-p"
                    name="proteinTarget"
                    type="number"
                    inputMode="numeric"
                    defaultValue={dietPlan?.proteinTarget ?? ""}
                    placeholder="160"
                  />
                </FormField>
                <FormField label="Carbs (g)" htmlFor="dp-c" error={fieldErrors.carbsTarget}>
                  <Input
                    id="dp-c"
                    name="carbsTarget"
                    type="number"
                    inputMode="numeric"
                    defaultValue={dietPlan?.carbsTarget ?? ""}
                    placeholder="220"
                  />
                </FormField>
                <FormField label="Fats (g)" htmlFor="dp-f" error={fieldErrors.fatsTarget}>
                  <Input
                    id="dp-f"
                    name="fatsTarget"
                    type="number"
                    inputMode="numeric"
                    defaultValue={dietPlan?.fatsTarget ?? ""}
                    placeholder="70"
                  />
                </FormField>
              </FormGrid>

              <FormField label="Guidance" htmlFor="dp-description">
                <Textarea
                  id="dp-description"
                  name="description"
                  rows={4}
                  defaultValue={dietPlan?.description ?? ""}
                  placeholder="A 500 kcal deficit built around home cooking. Protein is the non-negotiable…"
                />
              </FormField>
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                <Apple /> Save nutrition plan
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
}
