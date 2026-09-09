import Link from "next/link";
import { Globe2, Phone, Sparkles, Zap } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { ENTRY_PRICE, planByKey } from "@/lib/platform-plans";
import { getLiveStatsAction } from "@/app/actions/stats";
import { Logo } from "@/components/brand/logo";
import { ThemeSwitch } from "@/components/brand/theme-switch";
import { ListGymForm } from "@/components/directory/list-gym-form";
import { LiveHeadline } from "@/components/directory/live-headline";

export const metadata = {
  title: `Put your gym on the map — ${BRAND.name}`,
  description:
    "Pay once and your gym goes on the world map, with the whole platform behind the pin. No account needed, no commission, ever.",
};

const POINTS = [
  {
    icon: Globe2,
    title: "Your logo on the world map",
    body: "A pin members can find, a store page of your own behind it, and the workspace that runs the gym — one price, all of it.",
  },
  {
    icon: Zap,
    title: "No account needed to start",
    body: "Pick a plan, fill the form, and you're on the map. Set a password afterwards to build your store.",
  },
  {
    icon: Phone,
    title: "Enquiries come straight to you",
    body: "Your own links and number, on your pin. We take no cut and no commission, ever.",
  },
];

export default async function ListGymPage() {
  const stats = await getLiveStatsAction();

  return (
    <div className="min-h-dvh bg-[var(--mk-bg)] text-[var(--mk-fg)]">
      <header className="border-b border-[var(--mk-border)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitch />
            <Link
              href="/gyms"
              className="rounded-lg px-3 py-2 text-[13.5px] font-medium whitespace-nowrap text-[var(--mk-fg-muted)] hover:bg-[var(--mk-panel-strong)] hover:text-[var(--mk-fg)]"
            >
              See the map
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-[var(--mk-border)]" style={{ background: "var(--mk-hero)" }}>
        <div className="mx-auto max-w-6xl px-6 py-14">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand)]/30 bg-[var(--brand)]/10 px-2.5 py-1 text-[11.5px] font-medium text-[var(--brand)]">
            <Sparkles className="size-3" /> ${ENTRY_PRICE} a month, or ${planByKey("ANNUAL").price}{" "}
            for the year
          </p>
          <h1 className="mt-4 text-[34px] leading-tight font-semibold tracking-[-0.02em] sm:text-[42px]">
            Put your gym on the map.
          </h1>
          <LiveHeadline initial={stats} />

          <div className="mt-9 grid gap-4 sm:grid-cols-3">
            {POINTS.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-[var(--mk-border-strong)] bg-[var(--mk-panel)] p-5"
              >
                <p.icon className="size-4 text-[var(--brand)]" />
                <p className="mt-3 text-[14.5px] font-semibold">{p.title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--mk-fg-muted)]">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <ListGymForm />

        <p className="mt-10 border-t border-[var(--mk-border)] pt-6 text-[13px] leading-relaxed text-[var(--mk-fg-subtle)]">
          Paying opens{" "}
          <Link href="/#pricing" className="font-medium text-[var(--brand)] hover:underline">
            everything
          </Link>{" "}
          straight away — your store, members, attendance, the diary, plans and payments. Already on
          the map and want to take over the listing?{" "}
          <Link href="/claim" className="font-medium text-[var(--brand)] hover:underline">
            Claim it here
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
