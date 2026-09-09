"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Pencil } from "lucide-react";
import { deletePlanAction } from "@/app/actions/plans";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAction } from "@/components/ui/use-action";
import { PlanFormDialog, type PlanFormValues } from "./plan-form";

export function PlanActions({
  plan,
  subscriberCount,
  currency,
}: {
  plan: PlanFormValues;
  subscriberCount: number;
  currency: string;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { pending, run } = useAction();

  return (
    <>
      <Button variant="secondary" onClick={() => setEditOpen(true)}>
        <Pencil /> Edit
      </Button>
      <Button variant="ghost" onClick={() => setConfirmOpen(true)}>
        <Archive /> {subscriberCount > 0 ? "Archive" : "Delete"}
      </Button>

      <PlanFormDialog currency={currency} open={editOpen} onOpenChange={setEditOpen} plan={plan} />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={subscriberCount > 0 ? "Archive this programme?" : "Delete this programme?"}
        description={
          subscriberCount > 0
            ? `${subscriberCount} subscription${subscriberCount === 1 ? " references" : "s reference"} this programme, so it will be archived rather than deleted — history and payments stay intact. It just stops appearing for new subscriptions.`
            : "Nothing is subscribed to this programme, so it will be removed permanently."
        }
        confirmLabel={subscriberCount > 0 ? "Archive programme" : "Delete programme"}
        destructive={subscriberCount === 0}
        loading={pending}
        onConfirm={() =>
          run(() => deletePlanAction(plan.planId), {
            onSuccess: () => {
              setConfirmOpen(false);
              if (subscriberCount > 0) router.refresh();
              else router.push("/gym/plans");
            },
          })
        }
      />
    </>
  );
}
