"use client";

import { LiveNumber, useLiveStats } from "@/components/directory/live-count";
import type { LiveStats } from "@/app/actions/stats";

/**
 * The platform's real numbers, on the homepage.
 *
 * Every figure here is a count of paying gyms — nothing is rounded up, padded
 * with placeholders or written into the copy by hand. That is the only kind of
 * social proof worth printing: a gym owner can open the map and count them.
 */
export function LiveProof({ initial }: { initial: LiveStats }) {
  const stats = useLiveStats(initial);

  const cells: [React.ReactNode, string][] = [
    [<LiveNumber key="g" value={stats.gyms} />, "Gyms paying"],
    [<LiveNumber key="c" value={stats.cities} dot={false} />, "Cities"],
    [<LiveNumber key="n" value={stats.countries} dot={false} />, "Countries"],
    [<LiveNumber key="v" value={stats.views} dot={false} />, "Profile views"],
  ];

  return (
    <dl className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--mk-border-strong)] bg-[var(--mk-panel-strong)] sm:grid-cols-4">
      {cells.map(([value, labelText]) => (
        <div key={labelText} className="bg-[var(--mk-bg)] px-4 py-5">
          <dt className="text-[17px] font-semibold">{value}</dt>
          <dd className="mt-1 text-[11px] tracking-[0.14em] text-[var(--mk-fg-subtle)] uppercase">
            {labelText}
          </dd>
        </div>
      ))}
    </dl>
  );
}
