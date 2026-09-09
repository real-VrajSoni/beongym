import Link from "next/link";
import { requireProspect } from "@/lib/auth";
import { Logo } from "@/components/brand/logo";
import { UserMenuCompact } from "@/components/layout/user-menu";
import { SessionGuard } from "@/components/layout/session-guard";

/**
 * The between-place: the visitor has an account but no gym yet. Deliberately
 * chrome-light — there is nothing to navigate to until they have bought.
 */
export default async function StartLayout({ children }: { children: React.ReactNode }) {
  const session = await requireProspect();

  return (
    <>
      <SessionGuard />
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
            <Link href="/start/plans">
              <Logo />
            </Link>
            <UserMenuCompact
              user={{
                name: session.name,
                email: session.email,
                roleLabel: "Setting up",
              }}
            />
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">{children}</main>
      </div>
    </>
  );
}
