import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]">
          <Compass className="size-5 text-[var(--subtle-foreground)]" />
        </div>
        <h1 className="mt-4 text-[17px] font-semibold">Page not found</h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
          This page doesn&rsquo;t exist, or it belongs to someone else&rsquo;s workspace.
        </p>
        <div className="mt-5 flex justify-center">
          <Button asChild>
            <Link href="/">Back to your dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
