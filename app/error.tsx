"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]">
          <AlertTriangle className="size-5 text-[var(--warning)]" />
        </div>
        <h1 className="mt-4 text-[17px] font-semibold">Something went wrong</h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
          That page failed to load. Trying again usually fixes it — if it doesn&rsquo;t, head back to your
          dashboard.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-[11.5px] text-[var(--subtle-foreground)]">
            {error.digest}
          </p>
        ) : null}
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="secondary">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
