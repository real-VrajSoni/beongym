/**
 * Deciding what the globe can actually draw at a given zoom.
 *
 * Pulled out of the render loop so it is a pure function of "here are the
 * projected pins, here is how big a pin is" — which makes it testable, and
 * keeps a hundred lines of geometry out of a requestAnimationFrame callback.
 */

export type LayoutInput<G> = {
  gym: G;
  /** Projected screen position of the gym's true location. */
  x: number;
  y: number;
  depth: number;
};

export type LaidOutGym<G> = {
  kind: "gym";
  gym: G;
  x: number;
  y: number;
  /** Where the gym really is, for the leader line. */
  anchorX: number;
  anchorY: number;
  depth: number;
  /** Pushed off its true position, so it needs a leader line. */
  fanned: boolean;
};

export type LaidOutCity<G> = {
  kind: "city";
  key: string;
  city: string;
  members: G[];
  lng: number;
  lat: number;
  x: number;
  y: number;
  depth: number;
};

export type LaidOut<G> = LaidOutGym<G> | LaidOutCity<G>;

export type Layout<G> = {
  markers: LaidOut<G>[];
  /** [fromX, fromY, toX, toY] for each fanned pin. */
  leaders: [number, number, number, number][];
  /** True location of each rosette, for the dot under it. */
  centres: [number, number][];
};

const PER_RING = 8;

/**
 * The radius of ring `k`, counting from zero.
 *
 * Every ring is sized from a *full* ring's circumference, not from how many
 * pins happen to land on it. Sizing each ring by its own occupancy meant a
 * sparse outer ring — twenty-five gyms leaves one pin on ring three — got a
 * smaller radius than the packed ring inside it, and dropped its pin on top of
 * the ones already there.
 */
function ringRadius(k: number, count: number, pin: number): number {
  const onFullRing = Math.min(PER_RING, count);
  const spacing = pin * 1.42;
  const base = Math.max(pin * 1.05, (onFullRing * spacing) / (2 * Math.PI));
  return base * (1 + k * 0.8);
}

/** Outer radius a rosette of `count` pins needs, in pixels. */
export function rosetteRadius(count: number, pin: number): number {
  if (count <= 1) return pin / 2;
  const rings = Math.ceil(count / PER_RING);
  return ringRadius(rings - 1, count, pin) + pin / 2;
}

/**
 * Lay pins out, fanning what fits and collapsing what does not.
 *
 * Gyms are grouped by *city* rather than by screen distance. That distinction
 * is the whole point once a platform has gyms in Mumbai and Pune and Ahmedabad
 * at once: those are three places 150km apart, and merging them into one blob
 * because they are six pixels apart at world zoom would be a lie about where
 * anybody trains.
 *
 * Each city then either fans its gyms onto a ring — every logo drawn, every one
 * clickable — or collapses to a labelled place marker if the rosette would
 * collide with a neighbour. Biggest city gets first refusal, and a city the
 * reader has opened stays open regardless.
 */
export function layoutMarkers<
  G extends {
    code: string;
    city: string | null;
    country: string | null;
    lat: number;
    lng: number;
  },
>(points: LayoutInput<G>[], pin: number, openCity: string | null): Layout<G> {
  const byCity = new Map<string, LayoutInput<G>[]>();
  for (const p of points) {
    const key = cityKeyOf(p.gym);
    const bucket = byCity.get(key);
    if (bucket) bucket.push(p);
    else byCity.set(key, [p]);
  }

  const cities = [...byCity.entries()].map(([key, members]) => ({
    key,
    members: [...members].sort((a, b) => a.gym.code.localeCompare(b.gym.code)),
    cx: members.reduce((a, m) => a + m.x, 0) / members.length,
    cy: members.reduce((a, m) => a + m.y, 0) / members.length,
    depth: Math.max(...members.map((m) => m.depth)),
    open: rosetteRadius(members.length, pin),
    shut: pin * 0.85,
  }));

  const decided = new Map<string, number>();
  const expanded = new Set<string>();
  for (const city of [...cities].sort((a, b) => b.members.length - a.members.length)) {
    if (city.members.length === 1 || openCity === city.key) {
      expanded.add(city.key);
      decided.set(city.key, city.members.length === 1 ? city.shut : city.open);
      continue;
    }

    const clears = cities.every((other) => {
      if (other.key === city.key) return true;
      const gap = Math.hypot(other.cx - city.cx, other.cy - city.cy);
      const theirs = decided.get(other.key) ?? other.shut;
      return gap >= city.open + theirs + pin * 0.35;
    });

    if (clears) expanded.add(city.key);
    decided.set(city.key, clears ? city.open : city.shut);
  }

  const markers: LaidOut<G>[] = [];
  const leaders: [number, number, number, number][] = [];
  const centres: [number, number][] = [];

  for (const city of cities) {
    if (!expanded.has(city.key)) {
      markers.push({
        kind: "city",
        key: city.key,
        city: city.members[0].gym.city ?? "This area",
        members: city.members.map((m) => m.gym),
        lng: city.members.reduce((a, m) => a + m.gym.lng, 0) / city.members.length,
        lat: city.members.reduce((a, m) => a + m.gym.lat, 0) / city.members.length,
        x: city.cx,
        y: city.cy,
        depth: city.depth,
      });
      continue;
    }

    if (city.members.length === 1) {
      const only = city.members[0];
      markers.push({
        kind: "gym",
        gym: only.gym,
        x: only.x,
        y: only.y,
        anchorX: only.x,
        anchorY: only.y,
        depth: only.depth,
        fanned: false,
      });
      continue;
    }

    centres.push([city.cx, city.cy]);
    city.members.forEach((m, i) => {
      const ring = Math.floor(i / PER_RING);
      const first = ring * PER_RING;
      const onThisRing = Math.min(PER_RING, city.members.length - first);
      const radius = ringRadius(ring, city.members.length, pin);
      // Spread whatever is on this ring evenly around it, so a half-empty
      // outer ring is airy rather than bunched at the top.
      const angle = ((i - first) / onThisRing) * Math.PI * 2 - Math.PI / 2;
      const x = city.cx + Math.cos(angle) * radius;
      const y = city.cy + Math.sin(angle) * radius;
      markers.push({
        kind: "gym",
        gym: m.gym,
        x,
        y,
        anchorX: city.cx,
        anchorY: city.cy,
        depth: m.depth,
        fanned: true,
      });
    });
  }

  // One gym in Mumbai and one in Pune are two different cities, so neither can
  // be folded into the other's rosette — but at world zoom they are still six
  // pixels apart. A short relaxation pass pushes any remaining overlaps apart
  // and gives each a leader line home, so no gym is ever drawn under another.
  separate(markers, pin);

  for (const m of markers) {
    if (m.kind !== "gym" || !m.fanned) continue;
    leaders.push([m.anchorX, m.anchorY, m.x, m.y]);
  }

  return { markers, leaders, centres };
}

/**
 * Push overlapping pins apart.
 *
 * Bounded and early-exiting: it is a handful of passes over the pins actually
 * on screen, and it stops the moment nothing is touching, so the common case of
 * a well-spread map costs one comparison sweep.
 */
function separate<G>(markers: LaidOut<G>[], pin: number, passes = 12): void {
  const pins = markers.filter((m): m is LaidOutGym<G> => m.kind === "gym");
  if (pins.length < 2) return;
  const want = pin * 1.08;

  for (let pass = 0; pass < passes; pass++) {
    let moved = false;
    for (let i = 0; i < pins.length; i++) {
      for (let j = i + 1; j < pins.length; j++) {
        const a = pins[i];
        const b = pins[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d >= want) continue;
        if (d < 0.001) {
          // Exactly coincident: nudge along a deterministic axis so the result
          // does not depend on floating-point noise.
          dx = 1;
          dy = 0;
          d = 1;
        }
        const push = (want - d) / 2;
        const ux = (dx / d) * push;
        const uy = (dy / d) * push;
        a.x -= ux;
        a.y -= uy;
        b.x += ux;
        b.y += uy;
        a.fanned = true;
        b.fanned = true;
        moved = true;
      }
    }
    if (!moved) break;
  }
}

/** Gyms in the same town belong together, whatever the projection says. */
export function cityKeyOf(gym: {
  city: string | null;
  country: string | null;
  lat: number;
  lng: number;
}): string {
  const city = (gym.city ?? "").trim().toLowerCase();
  if (city) return `${city}|${(gym.country ?? "").trim().toLowerCase()}`;
  // No city on the record: fall back to a coarse geographic bucket so two gyms
  // on the same street still group.
  return `@${gym.lat.toFixed(1)},${gym.lng.toFixed(1)}`;
}
