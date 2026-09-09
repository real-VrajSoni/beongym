import { redirect } from "next/navigation";
import { Activity, CreditCard, LineChart, Users } from "lucide-react";
import { AuthPanel } from "@/components/auth/auth-panel";
import { AuthBackdrop } from "@/components/auth/auth-backdrop";
import { Logo } from "@/components/brand/logo";
import { getValidSession, homeFor } from "@/lib/auth";

export const metadata = { title: "Sign in" };

const POINTS = [
  {
    icon: Users,
    title: "Members and staff in one roster",
    body: "Auto member IDs, plans, dues and progress — no spreadsheet in sight.",
  },
  {
    icon: Activity,
    title: "Attendance that tells you something",
    body: "Live occupancy, peak hours and who has stopped turning up.",
  },
  {
    icon: CreditCard,
    title: "Payments and renewals tracked",
    body: "Know exactly what came in this month and what lapses next week.",
  },
  {
    icon: LineChart,
    title: "Progress you can show them",
    body: "Weight, body fat and measurements charted from day one.",
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const session = await getValidSession();
  if (session) redirect(homeFor(session.role));

  const { next, error } = await searchParams;
  const notice =
    error === "stale-session"
      ? "Your session referred to an account that no longer exists. Please sign in again."
      : error === "missing-profile"
        ? "That account is not attached to a gym. Please sign in again."
        : null;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <AuthBackdrop
        eyebrow="Gym & fitness management"
        headline={
          <>
            The operating system
            <br />
            for your gym.
          </>
        }
        sub="Members, attendance, plans, payments and progress — one platform for the front desk, the floor and the office."
        points={POINTS}
        footer="Built for gyms, studios and personal trainers, wherever they are."
      />

      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="mb-9 lg:hidden">
          <Logo />
        </div>
        <AuthPanel next={next} notice={notice} />
      </div>
    </div>
  );
}
