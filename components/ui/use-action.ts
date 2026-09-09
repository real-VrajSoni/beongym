"use client";

import { useCallback, useState, useTransition } from "react";
import type { ActionResult } from "@/lib/action-result";
import { useToast } from "./toast";

type RunOptions = {
  onSuccess?: (result: Extract<ActionResult, { ok: true }>) => void;
  /** Suppress the success toast (e.g. optimistic inline toggles). */
  silent?: boolean;
};

/**
 * Runs a server action with pending state, field-level errors and toasts.
 * Keeps every form in the app behaving identically.
 */
export function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const reset = useCallback(() => {
    setError(null);
    setFieldErrors({});
  }, []);

  const run = useCallback(
    (action: () => Promise<ActionResult>, options: RunOptions = {}) => {
      reset();
      startTransition(async () => {
        const result = await action();
        if (result.ok) {
          if (!options.silent && result.message) {
            toast({ title: result.message });
          }
          options.onSuccess?.(result);
        } else {
          setFieldErrors(result.fieldErrors ?? {});
          if (result.error) {
            setError(result.error);
            toast({ title: result.error, tone: "error" });
          }
        }
      });
    },
    [reset, toast],
  );

  return { pending, error, fieldErrors, run, reset };
}
