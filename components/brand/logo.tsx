import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

/**
 * BeOnGym mark.
 *
 * A power ring — the "be on" half — with a barbell bar running through it and
 * plates on either side. Drawn as inline SVG so it stays crisp at every size,
 * inherits currentColor, and adds no network request.
 */
export function LogoMark({
  className,
  title = BRAND.name,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label={title}
      className={cn("size-8", className)}
      fill="none"
    >
      {/* power ring, open at the top */}
      <path
        d="M15.5 13.2a13 13 0 1 0 17 0"
        stroke="currentColor"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      {/* the "on" stroke, doubling as the barbell bar */}
      <path d="M24 6.5v13.2" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" />
      {/* plates */}
      <rect x="5" y="29.5" width="4.6" height="11" rx="2.3" fill="currentColor" />
      <rect x="11.4" y="26.5" width="5.4" height="17" rx="2.7" fill="currentColor" />
      <rect x="31.2" y="26.5" width="5.4" height="17" rx="2.7" fill="currentColor" />
      <rect x="38.4" y="29.5" width="4.6" height="11" rx="2.3" fill="currentColor" />
    </svg>
  );
}

/** Mark in a filled tile — the app-shell and auth-header treatment. */
export function LogoTile({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-[var(--brand-foreground)]",
        className,
      )}
    >
      <LogoMark className="size-5" />
    </span>
  );
}

/** Mark plus wordmark. */
export function Logo({
  className,
  tileClassName,
  wordClassName,
}: {
  className?: string;
  tileClassName?: string;
  wordClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoTile className={tileClassName} />
      <span className={cn("text-[15px] font-semibold tracking-tight", wordClassName)}>
        {BRAND.name}
      </span>
    </span>
  );
}
