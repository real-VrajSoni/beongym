import { AppShell } from "@/components/layout/app-shell";
import { requireAdmin } from "@/lib/auth";
import { SessionGuard } from "@/components/layout/session-guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <>
      <SessionGuard />
      <AppShell
        portal="admin"
        user={{
          name: session.name,
          email: session.email,
          roleLabel: "Platform admin",
        }}
        brand={{
          name: "BeOnGym",
          subtitle: "PLATFORM CONSOLE",
          mark: "B",
          accentColor: "#e0483c",
        }}
      >
        {children}
      </AppShell>
    </>
  );
}
