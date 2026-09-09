"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, Dumbbell, Home, LineChart, LogOut, Receipt } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

/**
 * The member app.
 *
 * Built phone-first — a member opens this standing at the door or on the bus,
 * not at a desk — so navigation is a bottom bar on small screens and a row of
 * tabs on large ones, and the gym's own colour and mark sit at the top rather
 * than ours. It is their gym's app; we are the plumbing.
 */

const TABS = [
  { href: "/me", label: "Home", icon: Home },
  { href: "/me/classes", label: "Classes", icon: CalendarRange },
  { href: "/me/attendance", label: "Attendance", icon: LineChart },
  { href: "/me/training", label: "Training", icon: Dumbbell },
  { href: "/me/payments", label: "Payments", icon: Receipt },
];

export type MemberBrand = {
  name: string;
  mark: string;
  accentColor: string | null;
  imageUrl: string | null;
};

export function MemberShell({
  brand,
  memberName,
  memberCode,
  children,
}: {
  brand: MemberBrand;
  memberName: string;
  memberCode: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const accent = brand.accentColor ?? "var(--brand)";

  return (
    <div
      className="flex min-h-dvh flex-col bg-[var(--background)]"
      style={{ "--member-accent": accent } as React.CSSProperties}
    >
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-5">
          {brand.imageUrl ? (
            // Data URL already sized to 320px — next/image would add nothing.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.imageUrl} alt="" className="size-9 rounded-xl object-cover" />
          ) : (
            <span
              className="flex size-9 items-center justify-center rounded-xl text-[13px] font-bold text-white"
              style={{ background: accent }}
            >
              {brand.mark}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold">{brand.name}</p>
            <p className="truncate text-[11.5px] text-muted-foreground">
              {memberName} · <span className="font-mono">{memberCode}</span>
            </p>
          </div>

          <nav className="hidden items-center gap-1 sm:flex">
            {TABS.map(({ href, label, icon: Icon }) => {
              const active = href === "/me" ? pathname === "/me" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-[var(--surface-muted)] text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  style={active ? { color: accent } : undefined}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg p-2 text-muted-foreground hover:bg-[var(--surface-muted)] hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-6 pb-28 sm:pb-10">{children}</main>

      {/* Bottom bar on phones. Sits above the safe area so it clears the home
          indicator on iOS rather than being swiped through. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-3xl">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = href === "/me" ? pathname === "/me" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium"
                style={{ color: active ? accent : "var(--subtle-foreground)" }}
              >
                <Icon className="size-[18px]" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
