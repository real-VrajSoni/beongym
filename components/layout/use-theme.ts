"use client";

import { useCallback, useSyncExternalStore } from "react";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * The active theme lives on <html> (set server-side from a cookie) or, when
 * nothing is chosen, in the OS preference. Both are external to React, so it is
 * read through useSyncExternalStore rather than mirrored into state.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", onChange);
  };
}

function readTheme(): Theme {
  const root = document.documentElement;
  if (root.classList.contains("dark")) return "dark";
  if (root.classList.contains("light")) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  // The server cannot know the OS preference, so it assumes dark (the product
  // default); the first client read corrects it before the menu is visible.
  const theme = useSyncExternalStore(subscribe, readTheme, () => "dark" as Theme);

  const toggle = useCallback(() => {
    const next: Theme = readTheme() === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
    root.classList.toggle("light", next === "light");
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    for (const fn of listeners) fn();
  }, []);

  return { theme, toggle };
}
