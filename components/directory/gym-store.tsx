"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Eye, Search, Sparkles, X } from "lucide-react";
import type { DirectoryGym } from "@/lib/data/directory";
import { GymGlobe, hasPin } from "./gym-globe";
import { LiveNumber, useLiveGyms, useLiveStats } from "./live-count";
import type { LiveStats } from "@/app/actions/stats";
import { ENTRY_PRICE } from "@/lib/platform-plans";
import { EmptyState } from "@/components/ui/empty-state";
import { businessType } from "@/lib/business-types";
import { cn } from "@/lib/utils";

/**
 * The shopfront: a globe of every paying gym, and the shelf of cards
 * underneath it. Filtering is client-side because the whole directory is a few
 * dozen rows — a round trip per keystroke would be slower and worse.
 */
export function GymStore({
  gyms: initialGyms,
  focus,
  initialStats,
}: {
  gyms: DirectoryGym[];
  focus?: string | null;
  initialStats: LiveStats;
}) {
  // The headline numbers keep counting while the page is open, and the pins
  // keep up with them: a gym that lists itself now shows up on the globe
  // without anybody reloading.
  const stats = useLiveStats(initialStats);
  const gyms = useLiveGyms(initialGyms, stats.gyms);
  const [query, setQuery] = useState("");
  /**
   * Country and city are separate.
   *
   * They used to share one "place" slot, which meant picking a city stopped the
   * selection from matching any country — and the row of cities you had just
   * picked from vanished underneath you. Two fields, so narrowing to a city
   * keeps its country selected and the row on screen.
   */
  const [country, setCountry] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);

  // Cities alone stop scaling once the directory crosses a border, so the
  // filter row is countries first and narrows to cities within one.
  const countries = useMemo(
    () => [...new Set(gyms.map((g) => g.country).filter((c): c is string => !!c))].sort(),
    [gyms],
  );
  const cityChips = useMemo(() => {
    if (!country) return [] as string[];
    return [
      ...new Set(
        gyms
          .filter((g) => g.country === country)
          .map((g) => g.city)
          .filter((c): c is string => !!c),
      ),
    ].sort();
  }, [gyms, country]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return gyms.filter((g) => {
      if (country && g.country !== country) return false;
      if (city && g.city !== city) return false;
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) ||
        (g.city ?? "").toLowerCase().includes(q) ||
        (g.country ?? "").toLowerCase().includes(q) ||
        (g.tagline ?? "").toLowerCase().includes(q) ||
        g.amenities.some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [gyms, query, country, city]);

  // The map answers to the filter too, so the globe and the shelf below it are
  // never showing two different sets of gyms.
  const pinned = useMemo(() => filtered.filter(hasPin), [filtered]);
  const where = city ?? country;

  return (
    <>
      {/* ── The map ─────────────────────────────────────────── */}
      <section className="relative border-b border-[var(--mk-border)]">
        {/* On a phone the panels would sit on top of the pins, so the copy
            runs above the globe in normal flow instead. */}
        <div className="px-6 pt-8 pb-5 sm:hidden">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--mk-fg-subtle)] uppercase">
            The gym store
          </p>
          <h1 className="mt-2 text-[27px] leading-tight font-semibold tracking-[-0.02em]">
            Every gym on Earth, one map.
          </h1>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-[var(--mk-fg-muted)]">
            Spin the globe, open a gym, call it. No fees, no middleman, no sign-up.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Stat value={stats.gyms} label={stats.gyms === 1 ? "gym live" : "gyms live"} live />
            <Stat value={stats.countries} label={stats.countries === 1 ? "country" : "countries"} />
            <Stat value={stats.views} label="views" icon={Eye} />
          </div>
          <Link
            href="/list"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3.5 py-2 text-[13.5px] font-medium text-[var(--brand-foreground)]"
          >
            <Sparkles className="size-3.5" /> Put your gym on the map — ${ENTRY_PRICE}
          </Link>
        </div>
        <div className="relative h-[52vh] max-h-[820px] min-h-[380px] overflow-hidden sm:h-[76vh] sm:min-h-[560px]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: "var(--mk-hero)" }}
          />
          <GymGlobe gyms={pinned} focus={focus} />

          {/* Overlay panels, in the manner of a live map dashboard. The globe
              owns the leaderboard, because clicking a row moves the globe. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 hidden p-4 sm:block sm:p-6">
            <div className="mx-auto max-w-7xl">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="pointer-events-auto max-w-sm rounded-2xl border border-[var(--mk-border-strong)] bg-[var(--mk-bg)]/80 p-5 backdrop-blur-xl">
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--mk-fg-subtle)] uppercase">
                    The gym store
                  </p>
                  <h1 className="mt-2 text-[26px] leading-tight font-semibold tracking-[-0.02em] sm:text-[30px]">
                    Every gym on Earth,
                    <br />
                    one map.
                  </h1>
                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-[var(--mk-fg-muted)]">
                    Spin the globe, open a gym, call it — no fees, no middleman, no sign-up. Every
                    pin belongs to a gym that pays to be on here, which is why the numbers you dial
                    get answered.
                  </p>
                  <Link
                    href="/list"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3.5 py-2 text-[13.5px] font-medium text-[var(--brand-foreground)] hover:bg-[var(--brand-hover)]"
                  >
                    <Sparkles className="size-3.5" /> Put your gym on the map — ${ENTRY_PRICE}
                  </Link>
                </div>

                <div className="pointer-events-auto flex flex-wrap gap-2">
                  <Stat
                    value={stats.gyms}
                    label={stats.gyms === 1 ? "gym live" : "gyms live"}
                    live
                  />
                  <Stat
                    value={stats.countries}
                    label={stats.countries === 1 ? "country" : "countries"}
                  />
                  <Stat value={stats.cities} label={stats.cities === 1 ? "city" : "cities"} />
                  <Stat value={stats.views} label="profile views" icon={Eye} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The shelf ───────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--mk-fg-subtle)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search gyms, cities, facilities"
              aria-label="Search gyms"
              className="w-full rounded-xl border border-[var(--mk-border-strong)] bg-[var(--mk-panel)] py-2.5 pr-9 pl-9 text-[13.5px] text-[var(--mk-fg)] outline-none placeholder:text-[var(--mk-fg-subtle)] focus:border-[var(--brand)]"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-[var(--mk-fg-subtle)] hover:text-[var(--mk-fg)]"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={!country && !city}
              onClick={() => {
                setCountry(null);
                setCity(null);
              }}
            >
              Everywhere
            </FilterChip>
            {countries.map((c) => (
              <FilterChip
                key={c}
                active={country === c}
                onClick={() => {
                  // Switching country drops a city that belongs to the old one.
                  setCountry((current) => (current === c ? null : c));
                  setCity(null);
                }}
              >
                {c}
              </FilterChip>
            ))}
            {cityChips.length > 1 ? (
              <>
                <span
                  aria-hidden
                  className="mx-0.5 hidden w-px self-stretch bg-[var(--mk-border-strong)] sm:block"
                />
                {cityChips.map((c) => (
                  <FilterChip
                    key={c}
                    subtle
                    active={city === c}
                    // Clicking the chosen city again goes back to the country.
                    onClick={() => setCity((current) => (current === c ? null : c))}
                  >
                    {c}
                  </FilterChip>
                ))}
              </>
            ) : null}
          </div>
        </div>

        <p className="mt-6 mb-5 text-[13px] text-[var(--mk-fg-subtle)]">
          {filtered.length} {filtered.length === 1 ? "gym" : "gyms"}
          {where ? ` in ${where}` : " on the map"}
          {!where && !query ? " · every one of them paid to be here" : ""}
        </p>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-[var(--mk-border-strong)] bg-[var(--mk-panel)]">
            <EmptyState
              icon={query ? Search : Building2}
              title={query ? `Nothing matches “${query}”` : "No gyms listed yet"}
              description={`Run a gym? $${ENTRY_PRICE} puts yours on the map — members find you and call you directly, and we take no cut.`}
            />
          </div>
        ) : (
          /* A search result is a short list of names, not a wall of cards: the
             globe above is where a gym is actually chosen, and duplicating it
             here only made the map look decorative. */
          <ul className="divide-y divide-[var(--mk-border)] overflow-hidden rounded-2xl border border-[var(--mk-border-strong)] bg-[var(--mk-panel)]">
            {filtered.map((gym) => (
              <li key={gym.code}>
                <Link
                  href={`/gyms/${gym.code}`}
                  className="group flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--mk-panel-strong)]"
                >
                  {gym.imageUrl ? (
                    // Data URL already sized to 320px — next/image would add nothing.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={gym.imageUrl} alt="" className="size-10 rounded-xl object-cover" />
                  ) : (
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold text-white"
                      style={{ background: gym.accentColor ?? "var(--brand)" }}
                    >
                      {gym.logoText ?? gym.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{gym.name}</p>
                    <p className="truncate text-[12.5px] text-[var(--mk-fg-subtle)]">
                      {/* What the place is, first. Somebody scanning a
                          directory for a yoga studio should not have to open
                          twelve listings called "gym" to find one. */}
                      <span className="font-medium text-[var(--mk-fg-muted)]">
                        {businessType(gym.businessType).short}
                      </span>
                      {" · "}
                      {[gym.city, gym.country].filter(Boolean).join(", ")}
                      {gym.tagline ? ` · ${gym.tagline}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[12.5px] font-medium text-[var(--brand)] opacity-0 transition-opacity group-hover:opacity-100">
                    Open
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function Stat({
  value,
  label,
  icon: Icon,
  live = false,
}: {
  value: number;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Only the headline count wears the pulse; four of them would be a disco. */
  live?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--mk-border-strong)] bg-[var(--mk-bg)]/80 px-3 py-2 backdrop-blur-xl">
      {Icon ? <Icon className="size-3.5 text-[var(--mk-fg-subtle)]" /> : null}
      <LiveNumber value={value} dot={live} className="text-[13px] font-semibold" />
      <span className="text-[12px] text-[var(--mk-fg-subtle)]">{label}</span>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  subtle = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** Cities sit a level below countries, and read that way. */
  subtle?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-lg border font-medium transition-colors",
        subtle ? "px-2.5 py-1.5 text-[12.5px]" : "px-3 py-1.5 text-[13px]",
        active
          ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]"
          : subtle
            ? "border-transparent bg-[var(--mk-panel-strong)] text-[var(--mk-fg-subtle)] hover:text-[var(--mk-fg)]"
            : "border-[var(--mk-border-strong)] text-[var(--mk-fg-muted)] hover:text-[var(--mk-fg)]",
      )}
    >
      {children}
    </button>
  );
}
