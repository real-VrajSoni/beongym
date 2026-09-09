"use client";

import { LiveNumber, useLiveStats } from "./live-count";
import type { LiveStats } from "@/app/actions/stats";

/**
 * The listing page's opening line, with the platform's real size in it.
 *
 * Written as a component rather than baked into the copy because the number is
 * the persuasion: a gym owner reading "13 gyms" wants to know that is today's
 * figure and not a sentence somebody typed a year ago.
 */
export function LiveHeadline({ initial }: { initial: LiveStats }) {
  const stats = useLiveStats(initial);

  return (
    <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--mk-fg-muted)]">
      <LiveNumber value={stats.gyms} className="font-semibold text-[var(--mk-fg)]" /> gyms across{" "}
      <LiveNumber
        value={stats.countries}
        dot={false}
        className="font-semibold text-[var(--mk-fg)]"
      />{" "}
      {stats.countries === 1 ? "country" : "countries"} have paid to be on the map. Yours takes
      about three minutes to join them, and you don&rsquo;t need an account to start.
    </p>
  );
}
