"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]">
          <AlertTriangle className="size-5 text-[var(--warning)]" />
        </div>
        <h2 className="mt-4 text-[16px] font-semibold">This page couldn&rsquo;t load</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
          Something failed while fetching the platform.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="secondary">
            <Link href="/admin/overview">Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
