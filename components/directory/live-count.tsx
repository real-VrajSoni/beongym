"use client";

import { useEffect, useState } from "react";
import { getLiveStatsAction, getMapGymsAction, type LiveStats } from "@/app/actions/stats";
import type { DirectoryGym } from "@/lib/data/directory";

/** How often the numbers refresh while somebody is looking at them. */
const EVERY_MS = 20_000;

/**
 * The platform's numbers, kept current.
 *
 * They are rendered from the server on first paint so there is never a flash of
 * zero, then refreshed on an interval — a directory that says "13 gyms" in
 * hard-coded prose goes stale the moment the fourteenth signs up, and the whole
 * point of the number is that it is growing.
 *
 * It polls on a plain interval and also refreshes the moment the page becomes
 * visible again. It deliberately does not skip ticks on `document.hidden`:
 * embedded and previewed contexts report themselves hidden while plainly on
 * screen, and a counter that silently stops is worse than one aggregate query
 * every twenty seconds.
 */
export function useLiveStats(initial: LiveStats): LiveStats {
  const [stats, setStats] = useState(initial);

  useEffect(() => {
    let live = true;

    const tick = async () => {
      try {
        const next = await getLiveStatsAction();
        if (live) setStats(next);
      } catch {
        // A stale number is better than a broken page.
      }
    };

    const timer = setInterval(tick, EVERY_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      live = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  return stats;
}

/**
 * The pins, refetched whenever the gym count changes.
 *
 * Keyed off the count rather than a timer of its own: the stats poll is already
 * asking the server how many gyms there are, so the map only pays for a second
 * query on the ticks where the answer actually moved.
 */
export function useLiveGyms(initial: DirectoryGym[], count: number): DirectoryGym[] {
  const [gyms, setGyms] = useState(initial);
  const [known, setKnown] = useState(initial.length);

  useEffect(() => {
    if (count === known) return;
    let live = true;
    getMapGymsAction()
      .then((next) => {
        if (!live) return;
        setGyms(next);
        setKnown(count);
      })
      .catch(() => null);
    return () => {
      live = false;
    };
  }, [count, known]);

  return gyms;
}

/** A number that animates when it changes, with a live dot beside it. */
export function LiveNumber({
  value,
  className,
  dot = true,
}: {
  value: number;
  className?: string;
  dot?: boolean;
}) {
  const [previous, setPrevious] = useState(value);
  const [bumped, setBumped] = useState(false);

  // Adjusting state while rendering, which is what React prescribes for
  // "derive from a changed prop" — an effect here would paint the old number
  // first and flash.
  if (value !== previous) {
    setPrevious(value);
    setBumped(true);
  }

  useEffect(() => {
    if (!bumped) return;
    const timer = setTimeout(() => setBumped(false), 900);
    return () => clearTimeout(timer);
  }, [bumped]);

  return (
    <span className={className}>
      {dot ? (
        <span className="relative mr-1.5 inline-flex size-1.5 align-middle" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--success)] opacity-70" />
          <span className="relative inline-flex size-1.5 rounded-full bg-[var(--success)]" />
        </span>
      ) : null}
      <span
        className="tabular transition-colors duration-500"
        style={bumped ? { color: "var(--success)" } : undefined}
      >
        {value.toLocaleString()}
      </span>
    </span>
  );
}
