import Link from "next/link";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import { listUnclaimedGyms } from "@/lib/data/directory";
import { BRAND } from "@/lib/brand";
import { CLAIM_PRICE_USD } from "@/lib/platform-plans";
import { Logo } from "@/components/brand/logo";
import { ThemeSwitch } from "@/components/brand/theme-switch";

export const metadata = {
  title: `Claim your gym — ${BRAND.name}`,
  description:
    "Take over your gym's listing on BeOnGym. Edit every detail and receive the enquiries it brings in.",
};

const STEPS = [
  {
    title: "Find your gym",
    body: "We build listings from public information so members can find gyms today. Yours may already be here.",
  },
  {
    title: `Claim it for $${CLAIM_PRICE_USD}`,
    body: "That puts the pin on the globe and switches the whole platform on straight away. We call the number you give us to confirm you run the gym.",
  },
  {
    title: "It's yours",
    body: "Edit the name, photos, timings, programmes and contact details. Setting the store up takes about three minutes.",
  },
];

export default async function ClaimIndexPage() {
  const gyms = await listUnclaimedGyms();

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
              className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-[var(--mk-fg-muted)] hover:bg-[var(--mk-panel-strong)] hover:text-[var(--mk-fg)]"
            >
              Back to the map
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-[var(--mk-border)]" style={{ background: "var(--mk-hero)" }}>
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand)]/30 bg-[var(--brand)]/10 px-2.5 py-1 text-[11.5px] font-medium text-[var(--brand)]">
            <Sparkles className="size-3" /> ${CLAIM_PRICE_USD} — the listing, the store and the
            whole workspace
          </p>
          <h1 className="mt-4 text-[34px] leading-tight font-semibold tracking-[-0.02em] sm:text-[42px]">
            Claim your gym.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--mk-fg-muted)]">
            Your gym may already be on the {BRAND.name} map. Claiming it hands you the listing and
            opens your gym store on Pro — edit every detail, and take the enquiries it brings in.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="rounded-2xl border border-[var(--mk-border-strong)] bg-[var(--mk-panel)] p-5"
              >
                <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--brand)]/12 text-[12.5px] font-semibold text-[var(--brand)]">
                  {i + 1}
                </span>
                <p className="mt-3 text-[14.5px] font-semibold">{s.title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--mk-fg-muted)]">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="text-[20px] font-semibold tracking-[-0.01em]">
          {gyms.length > 0 ? "Listings waiting for an owner" : "Every listing has an owner"}
        </h2>
        <p className="mt-2 text-[13.5px] text-[var(--mk-fg-muted)]">
          {gyms.length > 0
            ? "Nobody has taken these over yet."
            : "Can't find your gym on the map? List it yourself instead — it takes about three minutes."}
        </p>

        {gyms.length > 0 ? (
          <ul className="mt-6 divide-y divide-[var(--mk-border)] overflow-hidden rounded-2xl border border-[var(--mk-border-strong)] bg-[var(--mk-panel)]">
            {gyms.map((gym) => (
              <li key={gym.code}>
                <Link
                  href={`/gyms/${gym.code}/claim`}
                  className="group flex items-center gap-4 px-5 py-4 hover:bg-[var(--mk-panel-strong)]"
                >
                  {gym.imageUrl ? (
                    // Data URL already sized to 320px — next/image would add nothing.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={gym.imageUrl} alt="" className="size-11 rounded-xl object-cover" />
                  ) : (
                    <span
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl text-[14px] font-bold text-white"
                      style={{ background: gym.accentColor }}
                    >
                      {gym.logoText ?? gym.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold">{gym.name}</p>
                    <p className="mt-0.5 flex items-center gap-3 text-[12.5px] text-[var(--mk-fg-subtle)]">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-3.5" />
                        {gym.city ?? "—"}
                      </span>
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-[var(--brand)]">
                    Claim
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="mt-8 text-[13.5px] text-[var(--mk-fg-muted)]">
          Gym not on the map?{" "}
          <Link href="/list" className="font-medium text-[var(--brand)] hover:underline">
            List it yourself
          </Link>{" "}
          — same price, same three minutes.
        </p>
      </main>
    </div>
  );
}
