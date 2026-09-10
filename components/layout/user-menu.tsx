"use client";

import { LogOut, Moon, Sun } from "lucide-react";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTheme } from "./use-theme";

export type MenuUser = { name: string; email: string | null; roleLabel: string };

/**
 * Account menu.
 *
 * Sign-out is a plain link to /logout. Wrapping a form in `asChild` looked
 * simpler but was broken: Radix merges the item's props onto the child and
 * closes the menu on select, tearing down the form before the submit ran — so
 * sign-out silently did nothing. A navigation cannot be interrupted that way.
 */
function MenuItems({ user }: { user: MenuUser }) {
  const { theme, toggle } = useTheme();

  return (
    <DropdownContent align="start" className="w-56">
      <div className="px-2.5 py-2">
        <p className="truncate text-[13px] font-medium">{user.name}</p>
        <p className="truncate text-[11.5px] text-muted-foreground">
          {user.email ?? user.roleLabel}
        </p>
      </div>
      <DropdownSeparator />

      <DropdownItem
        onSelect={(event) => {
          // Keep the menu open so the icon visibly flips.
          event.preventDefault();
          toggle();
        }}
      >
        {theme === "dark" ? <Sun /> : <Moon />}
        <span className="text-[13px]">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
      </DropdownItem>

      <DropdownSeparator />

      {/* `replace`, not a link.
          A link pushes, which leaves the workspace sitting in history: press
          Back afterwards and the browser asks for a page you are no longer
          allowed to see. The proxy turns that away, so nothing leaks — but the
          visitor lands on the sign-in screen having asked for nothing, which
          reads as Back being broken. Replacing drops the workspace out of the
          stack, so Back goes to whatever came before it.

          It stays an anchor underneath so middle-click, and a browser with no
          JavaScript, still sign out. */}
      <DropdownItem destructive asChild>
        <a
          href="/logout"
          onClick={(e) => {
            e.preventDefault();
            window.location.replace("/logout");
          }}
        >
          <LogOut />
          <span className="text-[13px]">Sign out</span>
        </a>
      </DropdownItem>
    </DropdownContent>
  );
}

/** Full-width trigger used in the sidebar footer. */
export function UserMenu({ user }: { user: MenuUser }) {
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-[var(--surface-muted)]">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[11px] font-semibold text-[var(--brand-soft-foreground)]">
            {initials(user.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{user.name}</span>
            <span className="block truncate text-[11.5px] text-muted-foreground">
              {user.roleLabel}
            </span>
          </span>
        </button>
      </DropdownTrigger>
      <MenuItems user={user} />
    </Dropdown>
  );
}

/** Avatar-only trigger used in the mobile top bar. */
export function UserMenuCompact({ user, className }: { user: MenuUser; className?: string }) {
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button
          className={cn(
            "flex size-8 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[11px] font-semibold text-[var(--brand-soft-foreground)]",
            className,
          )}
          aria-label="Account menu"
        >
          {initials(user.name)}
        </button>
      </DropdownTrigger>
      <MenuItems user={user} />
    </Dropdown>
  );
}
