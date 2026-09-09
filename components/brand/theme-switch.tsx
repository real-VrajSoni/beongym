"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/layout/use-theme";
import { cn } from "@/lib/utils";

/**
 * Standalone light/dark toggle for the marketing header.
 *
 * The app's toggle lives inside the account menu, which the landing page does
 * not have — so this is the same `useTheme` store behind a plain button.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      title={`Switch to ${next} mode`}
      aria-label={`Switch to ${next} mode`}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg border border-[var(--mk-border-strong)] bg-[var(--mk-panel-strong)] text-[var(--mk-fg-muted)] transition-colors hover:text-[var(--mk-fg)]",
        className,
      )}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
