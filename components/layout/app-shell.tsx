"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV, GYM_NAV, type NavGroup } from "./nav-config";
import { UserMenu, UserMenuCompact } from "./user-menu";

export type Portal = "admin" | "gym";

export type ShellUser = { name: string; email: string | null; roleLabel: string };
export type BadgeCounts = Partial<
  Record<"followUpsDue" | "queuedMessages" | "insideNow", number>
>;

/** Tenant identity shown in the sidebar. Absent for the platform admin. */
export type ShellBrand = {
  name: string;
  /** Gym code, shown so staff can read it out to a member. */
  subtitle: string;
  /** One or two letters used as the mark. */
  mark: string;
  /** Owner-uploaded image; falls back to the letters when absent. */
  imageUrl?: string | null;
  accentColor?: string | null;
};

/** The tenant's own image if they set one, otherwise initials on their colour. */
function BrandMark({
  brand,
  className,
}: {
  brand: ShellBrand;
  className: string;
}) {
  if (brand.imageUrl) {
    return (
      // Data URL already sized to 320px — next/image would add nothing.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={brand.imageUrl}
        alt=""
        className={cn("shrink-0 object-cover", className)}
      />
    );
  }
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center font-bold text-white", className)}
      style={{ background: brand.accentColor ?? "var(--brand)" }}
    >
      {brand.mark}
    </span>
  );
}

function NavLinks({
  groups,
  badges,
  pathname,
  isOwner,
  hasAccess,
  onNavigate,
}: {
  groups: NavGroup[];
  badges: BadgeCounts;
  pathname: string;
  isOwner: boolean;
  /** False once paid access lapses — the workspace links come out of the nav. */
  hasAccess: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-6 px-3 py-4">
      {groups.map((group, gi) => (
        <div key={gi}>
          {group.label ? (
            <p className="mb-1.5 px-2.5 text-[11px] font-medium tracking-wider text-[var(--subtle-foreground)] uppercase">
              {group.label}
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {group.items
              .filter((item) => (!item.ownerOnly || isOwner) && (!item.workspaceOnly || hasAccess))
              .map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const count = item.badge ? (badges[item.badge] ?? 0) : 0;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors",
                      active
                        ? "bg-[var(--brand-soft)] text-[var(--brand-soft-foreground)]"
                        : "text-muted-foreground hover:bg-[var(--surface-muted)] hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        active ? "opacity-100" : "opacity-70 group-hover:opacity-100",
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {count > 0 ? (
                      <span
                        className={cn(
                          "tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                          active
                            ? "bg-[var(--brand)] text-[var(--brand-foreground)]"
                            : "bg-[var(--surface-muted)] text-muted-foreground",
                        )}
                      >
                        {count}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({
  portal,
  user,
  brand,
  badges = {},
  isOwner = false,
  hasAccess = true,
  children,
}: {
  portal: Portal;
  user: ShellUser;
  brand: ShellBrand;
  badges?: BadgeCounts;
  isOwner?: boolean;
  /** False on a free gym, which has a listing but no workspace. */
  hasAccess?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const groups = portal === "admin" ? ADMIN_NAV : GYM_NAV;

  const sidebar = (
    <>
      <div className="flex h-14 items-center gap-2.5 border-b border-[var(--border)] px-4">
        <BrandMark brand={brand} className="size-7 rounded-lg text-[11px]" />
        <div className="min-w-0">
          <p className="truncate text-[14px] leading-none font-semibold tracking-tight">
            {brand.name}
          </p>
          <p className="mt-0.5 truncate font-mono text-[10.5px] tracking-wide text-muted-foreground">
            {brand.subtitle}
          </p>
        </div>
      </div>
      <NavLinks
        groups={groups}
        badges={badges}
        pathname={pathname}
        isOwner={isOwner}
        hasAccess={hasAccess}
        onNavigate={() => setMobileOpen(false)}
      />
      <div className="border-t border-[var(--border)] p-2">
        <UserMenu user={user} />
      </div>
    </>
  );

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] lg:flex">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="animate-in-up absolute inset-y-0 left-0 flex w-[270px] flex-col border-r border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-overlay)]">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3.5 right-3 rounded-md p-1.5 text-muted-foreground hover:bg-[var(--surface-muted)]"
              aria-label="Close navigation"
            >
              <X className="size-4" />
            </button>
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)]/85 px-4 backdrop-blur lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="-ml-1.5 rounded-lg p-2 text-muted-foreground hover:bg-[var(--surface-muted)]"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <BrandMark brand={brand} className="size-6 rounded-md text-[10px]" />
            <span className="truncate text-[14px] font-semibold tracking-tight">{brand.name}</span>
          </div>
          <div className="ml-auto">
            <UserMenuCompact user={user} />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

