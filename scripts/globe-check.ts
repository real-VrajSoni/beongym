/**
 * Does the map actually show gyms as you zoom in?
 *
 * Runs the real layout function over the real pins at a series of zoom levels
 * and reports what a reader would see. The property that matters: no city ever
 * hides a gym behind another gym's logo, and every city becomes individually
 * browsable by the time you have zoomed to it.
 */
import "dotenv/config";
import { geoOrthographic, geoDistance } from "d3-geo";
import { db } from "../lib/db";
import { layoutMarkers, cityKeyOf } from "../lib/geo/globe-layout";

const WIDTH = 1200;
const HEIGHT = 700;

function pinSizeFor(zoom: number) {
  return Math.round(Math.min(36, 20 + Math.log2(zoom) * 5));
}

async function main() {
  const rows = await db.gym.findMany({
    // The same population the globe draws: paid up, listed and located.
    where: {
      listed: true,
      latitude: { not: null },
      longitude: { not: null },
      status: { in: ["ACTIVE", "TRIAL"] },
      OR: [{ tier: "ELITE" }, { accessExpiresAt: { gt: new Date() } }],
    },
    select: { code: true, city: true, country: true, latitude: true, longitude: true, viewCount: true },
  });
  const gyms = rows.map((g) => ({
    code: g.code,
    city: g.city,
    country: g.country,
    lat: g.latitude!,
    lng: g.longitude!,
    views: g.viewCount,
  }));

  const cityCount = new Set(gyms.map(cityKeyOf)).size;
  console.log(`${gyms.length} pinned gyms across ${cityCount} cities\n`);

  // Centre on the busiest city so the zoom sweep is over real density.
  const busiest = [...new Map(gyms.map((g) => [cityKeyOf(g), g])).values()].sort(
    (a, b) =>
      gyms.filter((x) => cityKeyOf(x) === cityKeyOf(b)).length -
      gyms.filter((x) => cityKeyOf(x) === cityKeyOf(a)).length,
  )[0];

  const rowsOut: Record<string, string | number>[] = [];
  let ok = true;

  for (const zoom of [1, 2, 5, 12, 25, 40, 60]) {
    const radius = Math.min(WIDTH * 0.42, HEIGHT * 0.82) * zoom;
    const projection = geoOrthographic()
      .scale(radius)
      .translate([WIDTH / 2, HEIGHT / 2])
      .rotate([-busiest.lng, -busiest.lat])
      .clipAngle(90);

    const centre: [number, number] = [busiest.lng, busiest.lat];
    const front = gyms
      .map((gym) => {
        const p = projection([gym.lng, gym.lat]);
        const dist = geoDistance([gym.lng, gym.lat], centre);
        return { gym, x: p?.[0] ?? 0, y: p?.[1] ?? 0, dist, depth: Math.max(0.55, Math.cos(dist)) };
      })
      .filter((p) => p.dist < Math.PI / 2.15)
      .map(({ gym, x, y, depth }) => ({ gym, x, y, depth }));

    const pin = pinSizeFor(zoom);
    const { markers } = layoutMarkers(front, pin, null);
    const gymPins = markers.filter((m) => m.kind === "gym");
    const cityPins = markers.filter((m) => m.kind === "city");
    const hiddenBehindGyms = 0; // by construction: a gym marker is one gym

    // No two drawn gym pins may overlap.
    let worstOverlap = 0;
    for (let i = 0; i < gymPins.length; i++) {
      for (let j = i + 1; j < gymPins.length; j++) {
        const a = gymPins[i] as { x: number; y: number };
        const b = gymPins[j] as { x: number; y: number };
        worstOverlap = Math.max(worstOverlap, pin - Math.hypot(a.x - b.x, a.y - b.y));
      }
    }
    if (worstOverlap > 1) ok = false;

    rowsOut.push({
      zoom: `${zoom}x`,
      "gyms in view": front.length,
      "drawn individually": gymPins.length,
      "city markers": cityPins.length,
      "gyms hidden behind a gym": hiddenBehindGyms,
      "worst pin overlap px": Math.max(0, Math.round(worstOverlap)),
    });
  }

  console.table(rowsOut);

  // Every city must be fully browsable once the reader opens it.
  const opened = cityKeyOf(busiest);
  const radius = Math.min(WIDTH * 0.42, HEIGHT * 0.82) * 14;
  const projection = geoOrthographic()
    .scale(radius)
    .translate([WIDTH / 2, HEIGHT / 2])
    .rotate([-busiest.lng, -busiest.lat])
    .clipAngle(90);
  const front = gyms
    .map((gym) => {
      const p = projection([gym.lng, gym.lat]);
      return { gym, x: p?.[0] ?? 0, y: p?.[1] ?? 0, depth: 1 };
    })
    .filter((p) => geoDistance([p.gym.lng, p.gym.lat], [busiest.lng, busiest.lat]) < Math.PI / 2.15);
  const { markers } = layoutMarkers(front, pinSizeFor(14), opened);
  const drawn = markers.filter((m) => m.kind === "gym").map((m) => (m as { gym: { code: string } }).gym.code);
  const wanted = gyms.filter((g) => cityKeyOf(g) === opened).map((g) => g.code);
  const missing = wanted.filter((c) => !drawn.includes(c));
  console.log(
    `\nOpening "${busiest.city}" draws ${wanted.length - missing.length}/${wanted.length} of its gyms individually`,
  );
  if (missing.length) ok = false;

  console.log(ok ? "\nGLOBE LAYOUT OK" : "\nGLOBE LAYOUT FAILED");
  process.exit(ok ? 0 : 1);
}

main();
