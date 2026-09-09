import { cn } from "@/lib/utils";

/** The gym's own colour and initials, used everywhere a gym is listed. */
export function GymMark({
  name,
  logoText,
  imageUrl,
  accentColor,
  size = "md",
  className,
}: {
  name: string;
  logoText?: string | null;
  imageUrl?: string | null;
  accentColor?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "size-8 text-[11px] rounded-lg",
    md: "size-10 text-[13px] rounded-xl",
    lg: "size-14 text-[18px] rounded-2xl",
  }[size];

  if (imageUrl) {
    return (
      // Data URL already sized to 320px — next/image would add nothing.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        aria-hidden
        className={cn("inline-block shrink-0 object-cover", sizes, className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-bold text-white select-none",
        sizes,
        className,
      )}
      style={{ background: accentColor ?? "var(--brand)" }}
    >
      {logoText ?? name.slice(0, 2).toUpperCase()}
    </span>
  );
}
