"use client";

import Link from "next/link";
import { ArrowRight, Eye, MapPin, Sparkles } from "lucide-react";
import type { DirectoryGym } from "@/lib/data/directory";
import type { LiveStats } from "@/app/actions/stats";
import { GymGlobe, hasPin } from "@/components/directory/gym-globe";
import { LiveNumber, useLiveGyms, useLiveStats } from "@/components/directory/live-count";

/**
 * The map, on the homepage.
 *
 * Secondary by design: it sits below the product, because being findable is
 * something the subscription includes, not the reason anybody buys. Nine gyms
 * on screen — enough to look alive, few enough to read.
 *
 * The proportions are golden — the copy column and the globe stand at 1 : 1.618
 * on a wide screen, and the band's height follows the same ratio against the
 * page's rhythm. It is not a rule anybody consciously notices; it is the reason
 * the section feels settled rather than arranged.
 */

/** How many gyms the homepage shows. Enough to look alive, few enough to read. */
export const HOMEPAGE_GYMS = 9;

export function GlobeBand({
  gyms: initialGyms,
  initialStats,
}: {
  gyms: DirectoryGym[];
  initialStats: LiveStats;
}) {
  const stats = useLiveStats(initialStats);
  const live = useLiveGyms(initialGyms, stats.gyms);

  // The newest nine that actually have a pin — a gym with no coordinates would
  // silently take one of the nine slots and never appear.
  const shown = live.filter(hasPin).slice(0, HOMEPAGE_GYMS);

  return (
    <section id="map" className="scroll-mt-16 border-t border-[var(--mk-border)]">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-[1fr_1.618fr] lg:gap-14">
        <div>
          <p className="text-[11.5px] font-semibold tracking-[0.18em] text-[var(--mk-fg-subtle)] uppercase">
            And one more thing
          </p>
          <h2 className="mt-3 text-[32px] leading-[1.1] font-semibold tracking-[-0.02em]">
            While you are here,
            <br />
            be findable.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--mk-fg-muted)]">
            Your subscription also puts your gym on a public map with your phone, your socials and
            your opening hours on it — so somebody searching your area finds you rather than the
            gym down the road. It is included, not the reason to buy.
          </p>

          <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-4">
            {[
              [<LiveNumber key="g" value={stats.gyms} />, stats.gyms === 1 ? "gym live" : "gyms live"],
              [<LiveNumber key="c" value={stats.cities} dot={false} />, "cities"],
              [<LiveNumber key="n" value={stats.countries} dot={false} />, "countries"],
            ].map(([value, labelText], i) => (
              <div key={i}>
                <dt className="text-[19px] font-semibold">{value}</dt>
                <dd className="mt-0.5 text-[11px] tracking-[0.14em] text-[var(--mk-fg-subtle)] uppercase">
                  {labelText}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/list"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--brand)] px-5 text-[14px] font-medium text-[var(--brand-foreground)] hover:bg-[var(--brand-hover)]"
            >
              <Sparkles className="size-4" /> Put my gym on the map
            </Link>
            <Link
              href="/claim"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-[var(--mk-border-strong)] px-5 text-[14px] font-medium text-[var(--mk-fg)] hover:border-[var(--brand)]/50"
            >
              Claim an existing listing
            </Link>
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-[12px] text-[var(--mk-fg-subtle)]">
            <Eye className="size-3.5" />
            <LiveNumber value={stats.views} dot={false} /> profile views so far
          </p>
        </div>

        {/* The globe. Squared off on its own so the sphere is never cropped by
            the column it sits in. */}
        <div className="relative">
          <div className="relative aspect-square w-full overflow-hidden rounded-[28px] border border-[var(--mk-border-strong)] bg-[var(--mk-panel)]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: "var(--mk-hero)" }}
            />
            <GymGlobe gyms={shown} />
          </div>

          {shown.length > 0 ? (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-[var(--mk-fg-subtle)]">
              <MapPin className="size-3.5" />
              Showing {shown.length} of {stats.gyms} — drag to spin, click a logo to open the gym
            </p>
          ) : null}

          <Link
            href="/gyms"
            className="mt-2 flex items-center justify-center gap-1.5 text-[12.5px] font-medium text-[var(--brand)] hover:underline"
          >
            Browse every gym <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
