"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, RotateCcw } from "lucide-react";
import { resetCheckInCodeAction } from "@/app/actions/attendance";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAction } from "@/components/ui/use-action";

export function PrintButton() {
  return (
    <Button variant="secondary" onClick={() => window.print()}>
      <Printer /> Print
    </Button>
  );
}

/**
 * The revoke button.
 *
 * Behind a confirm, because it silently kills every printed copy of the poster
 * — including the one on the door that nobody has looked at in a month.
 */
export function ResetCodeButton() {
  const router = useRouter();
  const { pending, run } = useAction();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" size="sm" className="mt-3" onClick={() => setOpen(true)}>
        <RotateCcw /> Issue a new code
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Issue a new check-in code?"
        description="Every printed poster with the old code stops working the moment you do this. You will need to print this page again."
        confirmLabel="Issue new code"
        destructive
        loading={pending}
        onConfirm={() =>
          run(() => resetCheckInCodeAction(), {
            onSuccess: () => {
              setOpen(false);
              router.refresh();
            },
          })
        }
      />
    </>
  );
}
