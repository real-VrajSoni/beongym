import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { listGyms } from "@/lib/data/directory";
import { getLiveStatsAction } from "@/app/actions/stats";
import { getValidSession } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { ENTRY_PRICE, INCLUDED, planByKey } from "@/lib/platform-plans";
import { Logo } from "@/components/brand/logo";
import { ThemeSwitch } from "@/components/brand/theme-switch";
import { GymStore } from "@/components/directory/gym-store";

export const metadata = {
  title: `Find a gym near you — ${BRAND.name}`,
  description:
    "Every gym listed on BeOnGym, on one map. Spin the globe, open a pin, and contact the gym directly.",
};

export default async function GymDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const [session, gyms, stats, { focus }] = await Promise.all([
    getValidSession(),
    listGyms(),
    getLiveStatsAction(),
    searchParams,
  ]);

  return (
    <div className="min-h-dvh bg-[var(--mk-bg)] text-[var(--mk-fg)]">
      <header className="sticky top-0 z-40 border-b border-[var(--mk-border)] bg-[var(--mk-bg)]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitch />
            <Link
              href={session ? "/" : "/login"}
              className="hidden rounded-lg px-3 py-2 text-[13.5px] font-medium whitespace-nowrap text-[var(--mk-fg-muted)] hover:bg-[var(--mk-panel-strong)] hover:text-[var(--mk-fg)] sm:inline-flex"
            >
              {session ? "My account" : "Sign in"}
            </Link>
            <Link
              href="/list"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3.5 py-2 text-[13.5px] font-medium whitespace-nowrap text-[var(--brand-foreground)] hover:bg-[var(--brand-hover)]"
            >
              List<span className="hidden sm:inline"> your</span> gym — ${ENTRY_PRICE}
            </Link>
          </div>
        </div>
      </header>

      <GymStore
        gyms={gyms}
        focus={focus ? focus.toUpperCase() : null}
        initialStats={stats}
      />

      {/* The pitch, right under the thing it is selling. Somebody who has just
          spun the globe and found their city empty is the readiest buyer there
          is — so the offer sits here rather than three clicks away. */}
      <section className="border-t border-[var(--mk-border)]">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="overflow-hidden rounded-3xl border border-[var(--brand)]/30 bg-[var(--brand)]/[0.07]">
            <div className="grid gap-8 p-8 sm:p-10 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand)]/30 bg-[var(--brand)]/10 px-2.5 py-1 text-[11.5px] font-medium text-[var(--brand)]">
                  <Sparkles className="size-3" /> Nobody is on this map for free
                </p>
                <h2 className="mt-3 text-[26px] leading-tight font-semibold tracking-[-0.02em] sm:text-[32px]">
                  Your gym isn&rsquo;t on here. Theirs is.
                </h2>
                <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-[var(--mk-fg-muted)]">
                  Every pin you just spun past belongs to an owner who paid $
                  {ENTRY_PRICE} to be found — and who gets the call when somebody searching this
                  map lands on their city instead of yours. The same ${ENTRY_PRICE} buys you the
                  pin and everything behind it: your store page, members, attendance, the diary,
                  programmes and payments. Three minutes, no account needed to start.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href="/list"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--brand)] px-5 py-3 text-[14px] font-medium text-[var(--brand-foreground)] hover:bg-[var(--brand-hover)]"
                  >
                    Put my gym on the map — ${ENTRY_PRICE} <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="/#pricing"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--mk-border-strong)] bg-[var(--mk-bg)] px-5 py-3 text-[14px] font-medium text-[var(--mk-fg)] hover:border-[var(--brand)]/50"
                  >
                    See both plans
                  </Link>
                </div>
                <p className="mt-3 text-[12.5px] text-[var(--mk-fg-subtle)]">
                  ${ENTRY_PRICE} for 30 days, or ${planByKey("ANNUAL").price} for a year
                </p>
              </div>

              <ul className="grid content-start gap-2.5 rounded-2xl border border-[var(--mk-border-strong)] bg-[var(--mk-bg)] p-6">
                {INCLUDED.slice(0, 6).map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px]">
                    <Check className="mt-0.5 size-4 shrink-0 text-[var(--success)]" />
                    <span className="text-[var(--mk-fg-muted)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--mk-border)]">
        <div className="mx-auto max-w-7xl px-6 pb-14">
          <div className="rounded-3xl border border-[var(--mk-border-strong)] bg-[var(--mk-panel)] p-8 sm:p-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mk-border-strong)] bg-[var(--mk-panel-strong)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--mk-fg-muted)]">
                  <Sparkles className="size-3" /> Already listed?
                </p>
                <h2 className="mt-3 text-[24px] leading-tight font-semibold tracking-[-0.02em] sm:text-[28px]">
                  Some gyms are here before their owners are.
                </h2>
                <p className="mt-3 text-[14px] leading-relaxed text-[var(--mk-fg-muted)]">
                  We build listings from public information so members can find those gyms today.
                  They sit off the globe until somebody claims them — ${ENTRY_PRICE} takes over the
                  profile, puts the pin on the map and sends every enquiry it brings in to you.
                </p>
              </div>
              <Link
                href="/claim"
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--brand)] px-5 py-3 text-[14px] font-medium text-[var(--brand-foreground)] hover:bg-[var(--brand-hover)]"
              >
                Claim your gym — ${ENTRY_PRICE}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--mk-border)]">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <p className="text-[12.5px] text-[var(--mk-fg-subtle)]">
            Own a gym?{" "}
            <Link href="/list" className="font-medium text-[var(--brand)] hover:underline">
              Put it on the map for ${ENTRY_PRICE}
            </Link>{" "}
            and start taking enquiries today.
          </p>
        </div>
      </footer>
    </div>
  );
}
