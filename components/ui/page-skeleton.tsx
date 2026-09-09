import { Skeleton, SkeletonRows } from "./skeleton";

/** Route-level placeholder that mirrors the real page's shape. */
export function PageSkeleton({
  stats = 4,
  variant = "table",
}: {
  stats?: number;
  variant?: "table" | "cards" | "split" | "detail";
}) {
  return (
    <div className="animate-in-up">
      <div className="mb-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-2.5 h-3.5 w-72" />
      </div>

      {stats > 0 ? (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: stats }).map((_, i) => (
            <div
              key={i}
              className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-4 h-7 w-28" />
              <Skeleton className="mt-3 h-3 w-20" />
            </div>
          ))}
        </div>
      ) : null}

      {variant === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-3 w-28" />
              <Skeleton className="mt-4 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-4/5" />
              <Skeleton className="mt-6 h-6 w-24" />
            </div>
          ))}
        </div>
      ) : variant === "split" ? (
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
              <div className="border-b border-[var(--border)] px-5 py-4">
                <Skeleton className="h-4 w-32" />
              </div>
              <SkeletonRows rows={4} />
            </div>
            <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-5 h-56 w-full" />
            </div>
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <Skeleton className="h-4 w-36" />
            </div>
            <SkeletonRows rows={5} />
          </div>
        </div>
      ) : variant === "detail" ? (
        <div className="space-y-5">
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-3/4" />
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5">
            <Skeleton className="h-56 w-full" />
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-5 py-3">
            <Skeleton className="h-3 w-full max-w-md" />
          </div>
          <SkeletonRows rows={8} />
        </div>
      )}
    </div>
  );
}
