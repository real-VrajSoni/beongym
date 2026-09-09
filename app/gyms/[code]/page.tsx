import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { getPublicGym, recordGymView } from "@/lib/data/directory";
import { getValidSession } from "@/lib/auth";
import { num } from "@/lib/data/serialize";
import { formatDate } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { CLAIM_PRICE_USD } from "@/lib/platform-plans";
import { GymLinks } from "@/components/directory/gym-links";
import { ProgrammeCard } from "@/components/directory/programme-card";
import { themeFor } from "@/components/plans/plan-art";
import { Logo } from "@/components/brand/logo";
import { ThemeSwitch } from "@/components/brand/theme-switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const gym = await getPublicGym(code);
  if (!gym) return { title: "Gym not found" };
  return {
    title: `${gym.name}${gym.city ? ` · ${gym.city}` : ""}`,
    description: gym.tagline ?? `${gym.name} on ${BRAND.name}. See what they offer and get in touch.`,
  };
}

export default async function GymProfilePage({ params }: { params: Promise<{ code: string }> }) {
  const [{ code }, session] = await Promise.all([params, getValidSession()]);
  const gym = await getPublicGym(code);
  if (!gym) notFound();

  // Social proof for the next searcher. Not awaited into the render path — a
  // counter must never be the reason a profile fails to load.
  void recordGymView(gym.id);

  // An unclaimed listing is a placeholder built from public information: it is
  // reachable by link so somebody can claim it, but there is no owner behind it
  // and so nothing to present as a store.
  const managed = gym.claimed;
  const store = managed;

  // Every "contact" affordance on the page points at the same best available
  // channel, so a visitor never hits a button that goes nowhere.
  const contactHref = gym.phone
    ? `tel:${gym.phone.replace(/\s/g, "")}`
    : gym.email
      ? `mailto:${gym.email}`
      : (gym.links[0]?.url ?? null);

  const stats: { label: string; value: string }[] = [
    { label: "Profile views", value: gym.viewCount.toLocaleString() },
    ...(store && gym._count.members > 0
      ? [{ label: "Members", value: gym._count.members.toLocaleString() }]
      : []),
    ...(store && gym.plans.length > 0
      ? [{ label: "Programmes", value: String(gym.plans.length) }]
      : []),
    ...(gym.amenities.length > 0
      ? [{ label: "Facilities", value: String(gym.amenities.length) }]
      : []),
    { label: "On BeOnGym since", value: formatDate(gym.createdAt) },
  ].slice(0, 4);

  // A gym that has written nothing has no left column, and a half-empty grid
  // reads as a broken page rather than a quiet one.
  const hasDetail =
    Boolean(gym.description) || gym.amenities.length > 0 || (store && gym.plans.length > 0);

  return (
    <div className="min-h-dvh bg-[var(--mk-bg)] text-[var(--mk-fg)]">
      <header className="sticky top-0 z-40 border-b border-[var(--mk-border)] bg-[var(--mk-bg)]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/">
              <Logo />
            </Link>
            <Link
              href="/gyms"
              // Icon-only on a phone: the label is the first thing to collide
              // with the theme toggle at 375px.
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--mk-border-strong)] bg-[var(--mk-panel)] px-2 py-1.5 text-[12.5px] font-medium whitespace-nowrap text-[var(--mk-fg-muted)] hover:bg-[var(--mk-panel-strong)] hover:text-[var(--mk-fg)] sm:px-2.5"
              aria-label="All gyms"
            >
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">All gyms</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitch />
            <Link
              href={session ? "/" : "/login"}
              className="rounded-lg px-3 py-2 text-[13.5px] font-medium whitespace-nowrap text-[var(--mk-fg-muted)] hover:bg-[var(--mk-panel-strong)] hover:text-[var(--mk-fg)]"
            >
              {session ? "My account" : "Sign in"}
            </Link>
          </div>
        </div>
      </header>

      {/* The gym's own colour, used properly: a lit cover with the accent
          bleeding through a grid, so the page belongs to the gym rather than
          to us. No photography — nothing to load, nothing to break. */}
      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `radial-gradient(46rem 22rem at 18% -30%, ${gym.accentColor}66, transparent 62%), radial-gradient(38rem 20rem at 92% 0%, ${gym.accentColor}33, transparent 60%), var(--mk-panel-strong)`,
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--mk-border) 1px, transparent 1px), linear-gradient(to bottom, var(--mk-border) 1px, transparent 1px)",
            backgroundSize: "38px 38px",
            maskImage: "linear-gradient(to bottom, black, transparent)",
          }}
        />

        <div className="relative mx-auto max-w-5xl px-6 pt-10 pb-8 sm:pt-14 sm:pb-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
              {gym.imageUrl ? (
                // Data URL already sized to 320px — next/image would add nothing.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={gym.imageUrl}
                  alt=""
                  className="size-20 shrink-0 rounded-2xl object-cover shadow-xl ring-4 ring-[var(--mk-bg)] sm:size-24"
                />
              ) : (
                <span
                  className="flex size-20 shrink-0 items-center justify-center rounded-2xl text-[24px] font-bold text-white shadow-xl ring-4 ring-[var(--mk-bg)] sm:size-24 sm:text-[28px]"
                  style={{
                    background: `linear-gradient(145deg, ${gym.accentColor}, ${gym.accentColor}bb)`,
                  }}
                >
                  {gym.logoText ?? gym.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em] sm:text-[36px]">
                    {gym.name}
                  </h1>
                  {!gym.claimed ? (
                    <Badge tone="warning">Unclaimed</Badge>
                  ) : managed ? (
                    <Badge tone="brand">Gym store</Badge>
                  ) : null}
                </div>
                {gym.tagline ? (
                  <p className="mt-1.5 text-[15px] text-[var(--mk-fg-muted)]">{gym.tagline}</p>
                ) : null}
                {gym.city ? (
                  <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-[var(--mk-fg-subtle)]">
                    <MapPin className="size-3.5" />
                    {[gym.city, gym.country].filter(Boolean).join(", ")}
                  </p>
                ) : null}
              </div>
            </div>

            {contactHref ? (
              <a
                href={contactHref}
                className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-medium text-white shadow-lg transition-transform hover:scale-[1.02] sm:w-auto"
                style={{
                  background: `linear-gradient(145deg, ${gym.accentColor}, ${gym.accentColor}cc)`,
                }}
              >
                <Phone className="size-4" /> Contact the gym
              </a>
            ) : null}
          </div>

          {/* Facts a searcher scans before they read anything. */}
          <dl
            className={cn(
              "mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--mk-border-strong)] bg-[var(--mk-border)]",
              stats.length === 2 && "sm:grid-cols-2",
              stats.length === 3 && "sm:grid-cols-3",
              stats.length >= 4 && "sm:grid-cols-4",
            )}
          >
            {stats.map((stat) => (
              <div key={stat.label} className="bg-[var(--mk-bg)]/85 px-4 py-3.5 backdrop-blur">
                <dt className="text-[11px] tracking-[0.12em] text-[var(--mk-fg-subtle)] uppercase">
                  {stat.label}
                </dt>
                <dd className="mt-1 truncate text-[15px] font-semibold">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 pb-16">

        {!gym.claimed ? (
          <div className="mt-7 flex flex-col gap-4 rounded-2xl border border-[var(--brand)]/25 bg-[var(--brand)]/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />
              <div>
                <p className="text-[13.5px] font-medium">This listing has no owner yet.</p>
                <p className="mt-0.5 text-[12.5px] text-[var(--mk-fg-muted)]">
                  We built it from public information so members could find the gym. If you run it,
                  take it over and edit every detail.
                </p>
              </div>
            </div>
            <Link
              href={`/gyms/${gym.code}/claim`}
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] px-4 py-2.5 text-[13px] font-medium text-[var(--brand-foreground)] hover:bg-[var(--brand-hover)]"
            >
              Claim this gym — ${CLAIM_PRICE_USD}
            </Link>
          </div>
        ) : null}

        {!store && gym.links.length > 0 ? (
          <section className="mt-7 rounded-2xl border border-[var(--mk-border-strong)] bg-[var(--mk-panel)] p-5">
            <h2 className="text-[15px] font-semibold">Reach {gym.name}</h2>
            <p className="mt-1 text-[12.5px] text-[var(--mk-fg-subtle)]">
              Straight to the gym&rsquo;s own channels. {BRAND.name} takes no cut.
            </p>
            <GymLinks links={gym.links} className="mt-4" />
          </section>
        ) : null}

        <div className={cn("mt-8 grid gap-6", hasDetail && "lg:grid-cols-[1.6fr_1fr]")}>
          {/* Detail */}
          <div className="space-y-6">
            {gym.description ? (
              <section>
                <h2 className="text-[17px] font-semibold">About</h2>
                <div
                  className="mt-3.5 rounded-2xl border p-5"
                  style={{
                    borderColor: `${gym.accentColor}2e`,
                    background: `linear-gradient(150deg, ${gym.accentColor}12, transparent 60%), var(--mk-panel)`,
                  }}
                >
                  <p className="text-[14px] leading-relaxed whitespace-pre-line text-[var(--mk-fg-muted)]">
                    {gym.description}
                  </p>
                </div>
              </section>
            ) : null}

            {gym.amenities.length > 0 ? (
              <section>
                <h2 className="text-[17px] font-semibold">What&rsquo;s here</h2>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {gym.amenities.map((a, i) => {
                    const tone = themeFor(i);
                    return (
                      <span
                        key={a}
                        className="inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12.5px] font-medium"
                        style={{
                          borderColor: `${tone.accent}40`,
                          background: `${tone.accent}12`,
                          color: "var(--mk-fg)",
                        }}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ background: tone.accent }}
                          aria-hidden
                        />
                        {a}
                      </span>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {store && gym.plans.length > 0 ? (
              <section>
                <h2 className="text-[17px] font-semibold">Programmes</h2>
                <p className="mt-1 text-[13px] text-[var(--mk-fg-subtle)]">
                  {gym.plans.some((p) => p.showPrice)
                    ? "Prices are set by the gym. Get in touch to join."
                    : "Prices change with intake and season, so the gym quotes them directly."}
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {gym.plans.map((p, i) => (
                    <ProgrammeCard
                      key={p.id}
                      index={i}
                      contactHref={contactHref}
                      gymName={gym.name}
                      programme={{
                        id: p.id,
                        name: p.name,
                        description: p.description,
                        price: num(p.price) ?? 0,
                        showPrice: p.showPrice,
                        durationDays: p.durationDays,
                        billingInterval: p.billingInterval,
                        planType: p.planType,
                      }}
                    />
                  ))}
                </div>

                {contactHref ? (
                  <a
                    href={contactHref}
                    className="mt-4 flex flex-col items-start gap-3 rounded-2xl border p-5 transition-colors sm:flex-row sm:items-center sm:justify-between"
                    style={{
                      borderColor: `${gym.accentColor}40`,
                      background: `linear-gradient(120deg, ${gym.accentColor}1f, transparent 70%), var(--mk-panel)`,
                    }}
                  >
                    <span className="flex items-start gap-3">
                      <MessageCircle
                        className="mt-0.5 size-4 shrink-0"
                        style={{ color: gym.accentColor }}
                      />
                      <span>
                        <span className="block text-[14.5px] font-semibold">
                          Contact the gym for latest membership prices
                        </span>
                        <span className="mt-0.5 block text-[12.5px] text-[var(--mk-fg-muted)]">
                          Straight through to {gym.name}. {BRAND.name} takes no cut and no
                          commission.
                        </span>
                      </span>
                    </span>
                    <span
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 text-[13px] font-medium text-white"
                      style={{ background: gym.accentColor }}
                    >
                      {gym.phone ? "Call the gym" : "Get in touch"}
                      <ArrowRight className="size-3.5" />
                    </span>
                  </a>
                ) : null}
              </section>
            ) : null}
          </div>

          {/* Contact */}
          <aside
            className={cn(
              hasDetail ? "lg:sticky lg:top-24 lg:self-start" : "mx-auto w-full max-w-md",
            )}
          >
            <div className="overflow-hidden rounded-2xl border border-[var(--mk-border-strong)] bg-[var(--mk-panel)]">
              <div
                className="px-5 pt-5 pb-4"
                style={{
                  background: `linear-gradient(140deg, ${gym.accentColor}26, transparent 70%)`,
                }}
              >
                <h2 className="text-[16px] font-semibold">Get in touch</h2>
                <p className="mt-1 text-[12.5px] text-[var(--mk-fg-muted)]">
                  Straight to the gym. {BRAND.name} takes no cut and no commission.
                </p>
              </div>

              <div className="space-y-2.5 px-5 pt-4">
                {gym.phone ? (
                  <a
                    href={`tel:${gym.phone.replace(/\s/g, "")}`}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-lg text-[14px] font-medium text-white transition-transform hover:scale-[1.01]"
                    style={{
                      background: `linear-gradient(145deg, ${gym.accentColor}, ${gym.accentColor}cc)`,
                    }}
                  >
                    <Phone className="size-4" /> Call {gym.phone}
                  </a>
                ) : null}
                {gym.email ? (
                  <a
                    href={`mailto:${gym.email}`}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--mk-border-strong)] bg-[var(--mk-panel-strong)] text-[14px] font-medium transition-colors hover:bg-[var(--brand)] hover:text-[var(--brand-foreground)]"
                  >
                    <Mail className="size-4" /> Email the gym
                  </a>
                ) : null}
                {!gym.phone && !gym.email ? (
                  <p className="rounded-lg border border-[var(--mk-border)] px-3 py-2.5 text-[12.5px] text-[var(--mk-fg-subtle)]">
                    This gym hasn&rsquo;t added contact details yet.
                  </p>
                ) : null}
              </div>

              {/* A store's own links, if it has them, under the two big buttons. */}
              {store && gym.links.length > 0 ? (
                <div className="px-5 pt-3">
                  <GymLinks links={gym.links} size="sm" />
                </div>
              ) : null}

              <dl className="mt-5 space-y-3 border-t border-[var(--mk-border)] px-5 pt-4 text-[13px]">
                {gym.address ? (
                  <div className="flex gap-2.5">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-[var(--mk-fg-subtle)]" />
                    <dd className="text-[var(--mk-fg-muted)]">{gym.address}</dd>
                  </div>
                ) : null}
                {gym.openingHours ? (
                  <div className="flex gap-2.5">
                    <Clock className="mt-0.5 size-3.5 shrink-0 text-[var(--mk-fg-subtle)]" />
                    <dd className="text-[var(--mk-fg-muted)]">{gym.openingHours}</dd>
                  </div>
                ) : null}
                {/* An unclaimed listing has no roster to speak of — the count
                    would be a fact about our database, not about the gym. */}
                {store ? (
                  <div className="flex gap-2.5">
                    <Users className="mt-0.5 size-3.5 shrink-0 text-[var(--mk-fg-subtle)]" />
                    <dd className="text-[var(--mk-fg-muted)]">
                      {gym._count.members > 0
                        ? `${gym._count.members} members training here`
                        : "New on BeOnGym"}
                      {gym._count.staff > 0 ? ` · ${gym._count.staff} staff` : ""}
                    </dd>
                  </div>
                ) : null}
                <div className="flex gap-2.5">
                  <Building2 className="mt-0.5 size-3.5 shrink-0 text-[var(--mk-fg-subtle)]" />
                  <dd className="text-[var(--mk-fg-muted)]">
                    Listed since {formatDate(gym.createdAt)}
                  </dd>
                </div>
              </dl>

              {managed ? (
                <p className="mt-4 mb-5 flex items-start gap-2 border-t border-[var(--mk-border)] px-5 pt-4 text-[12px] leading-relaxed text-[var(--mk-fg-muted)]">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[var(--brand)]" />
                  This gym runs its memberships on {BRAND.name} — plans, attendance and progress
                  all tracked, so ask them what they offer and they can tell you on the spot.
                </p>
              ) : (
                <div className="h-5" />
              )}
            </div>

            <p className="mt-4 px-1 text-[11.5px] text-[var(--mk-fg-subtle)]">
              Details are published by the gym. {BRAND.name} does not verify them.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}
