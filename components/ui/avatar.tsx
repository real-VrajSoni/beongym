import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

/**
 * Deterministic tint per person so avatars stay recognisable across screens
 * without storing an image.
 */
const TINTS = [
  "bg-[#EEF0FE] text-[#4A46C6] dark:bg-[#23234a] dark:text-[#a9a6ff]",
  "bg-[#E4F5F2] text-[#0d7a72] dark:bg-[#0f2f2c] dark:text-[#54cfc6]",
  "bg-[#FCEEE6] text-[#a55a1f] dark:bg-[#33210f] dark:text-[#e8a465]",
  "bg-[#FBE9F0] text-[#a63a68] dark:bg-[#331522] dark:text-[#f191b3]",
  "bg-[#E9EEF6] text-[#41597c] dark:bg-[#161f2c] dark:text-[#93aac9]",
  "bg-[#F0ECFB] text-[#6c46b8] dark:bg-[#241a3b] dark:text-[#bda2f5]",
];

function tintFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length];
}

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-[11px]",
  md: "size-9 text-[12px]",
  lg: "size-12 text-[15px]",
  xl: "size-16 text-[19px]",
} as const;

export function ClientAvatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none",
        SIZES[size],
        tintFor(name),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
