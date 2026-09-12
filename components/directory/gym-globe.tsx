"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { geoContains, geoDistance, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import type { Feature, FeatureCollection } from "geojson";
import { ArrowRight, LocateFixed, MapPin, Minus, Plus, X } from "lucide-react";
import type { DirectoryGym } from "@/lib/data/directory";
import { GymLinks } from "./gym-links";
import { layoutMarkers, type LaidOut, type LaidOutCity } from "@/lib/geo/globe-layout";
import { businessType } from "@/lib/business-types";
import { cn } from "@/lib/utils";

/**
 * Idle drift, in degrees per millisecond.
 *
 * Roughly a full turn a minute — brisk enough that the globe reads as the live
 * thing it is rather than a still image with pins on it. It was a third of this
 * and looked static on a page somebody scrolls past in seconds.
 *
 * The drift stops the moment anybody takes hold of the globe and never resumes,
 * so this only governs how it behaves while nobody is touching it: nothing here
 * can make a pin harder to click.
 */
const SPIN_PER_MS = 0.006;
/**
 * Pin diameter at the centre of the globe, in CSS pixels.
 *
 * Small on purpose. A logo big enough to admire is a logo big enough to bury
 * its neighbours, and at world scale the whole of India is only a few hundred
 * pixels across — so pins stay modest until you zoom in, and grow with the
 * globe rather than with the reader's attention.
 */
const PIN_MIN = 20;
const PIN_MAX = 36;
/**
 * How far in the globe goes.
 *
 * Far enough that neighbouring cities separate: at world zoom Mumbai and Pune
 * are six pixels apart, and only around 40x does the gap become the couple of
 * hundred pixels two rosettes need.
 */
const ZOOM_MAX = 60;
/** ISO 3166-1 numeric for India, whose outline we replace wholesale. */
const INDIA_ID = "356";

type Placed = DirectoryGym & { lat: number; lng: number };

export function hasPin(g: DirectoryGym): g is Placed {
  return typeof g.lat === "number" && typeof g.lng === "number";
}

/**
 * Where the globe opens.
 *
 * A gym owner arriving from their own dashboard wants to see their pin, so a
 * `focus` code wins outright. Failing that, the mean of the pins — crude, since
 * it would sit in the ocean for a directory split across two continents, but it
 * beats hard-coding a country on a global product.
 */
function startRotation(gyms: DirectoryGym[], focus?: string | null): [number, number] {
  const pins = gyms.filter(hasPin);
  if (pins.length === 0) return [0, -15];

  const wanted = focus ? pins.find((g) => g.code === focus) : null;
  if (wanted) return [-wanted.lng, -wanted.lat];

  const lng = pins.reduce((a, g) => a + g.lng, 0) / pins.length;
  const lat = pins.reduce((a, g) => a + g.lat, 0) / pins.length;
  return [-lng, -lat];
}

/**
 * A pin as drawn.
 *
 * Gyms cluster in cities and a city is a handful of pixels wide at world zoom,
 * so overlapping pins are fanned out onto a ring around where they really are,
 * with a leader line back to the spot. Every gym keeps its own logo, its own
 * hover and its own click — hiding nine gyms behind a "+9" badge is a worse
 * answer than showing all ten, and a city with fifteen gyms on it is the whole
 * point of the map.
 *
 * `anchor` is the true projected position; `x`/`y` is where the pin sits after
 * fanning. They are equal for a gym that had the space to itself.
 */
type Marker = LaidOut<Placed>;

export function GymGlobe({ gyms, focus }: { gyms: DirectoryGym[]; focus?: string | null }) {
  const placed = useMemo(() => gyms.filter(hasPin), [gyms]);
  // Arriving with a gym in mind means arriving on it, card open and still.
  const opened = focus && placed.some((g) => g.code === focus) ? focus : null;

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // useRef keeps only the first value, so this runs once for real.
  const rotation = useRef<[number, number]>(startRotation(gyms, focus));
  const dragging = useRef(false);
  const lastPoint = useRef<[number, number] | null>(null);
  const spinning = useRef(!opened);
  /** Once someone has taken hold of the globe it never spins on its own again. */
  const interacted = useRef(Boolean(opened));
  /**
   * The city the reader has opened, read inside the draw loop.
   *
   * A ref rather than state because the loop runs every frame and re-creating
   * it on each change would restart the animation.
   */
  const openCityRef = useRef<string | null>(null);
  const tween = useRef<{ from: [number, number]; to: [number, number]; start: number } | null>(
    null,
  );

  const [world, setWorld] = useState<FeatureCollection | null>(null);
  /**
   * India, as India draws it.
   *
   * The Natural Earth set every web map reaches for shows India without
   * Jammu & Kashmir and Ladakh, which is wrong here and not a detail to wave
   * at. This is Natural Earth's own India point-of-view edition, extracted and
   * simplified, drawn over the top of the default outline.
   */
  const [india, setIndia] = useState<Feature | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(opened ? 1.8 : 1);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [selected, setSelected] = useState<string | null>(opened);
  const [hovered, setHovered] = useState<string | null>(null);
  /** Bumped when the theme changes, to re-read the canvas colour tokens. */
  const [themeTick, setThemeTick] = useState(0);

  const selectedGym = placed.find((g) => g.code === selected) ?? null;
  const exploreGyms = useMemo(
    () => [...placed].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 5),
    [placed],
  );

  // Land outlines are 105 KB and never change, so they are a static asset the
  // browser caches rather than part of every server render.
  useEffect(() => {
    let live = true;
    fetch("/geo/countries-110m.json")
      .then((r) => r.json())
      .then((topo: Topology) => {
        if (!live) return;
        setWorld(feature(topo, topo.objects.countries) as unknown as FeatureCollection);
      })
      .catch(() => null);
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    fetch("/geo/india.json")
      .then((r) => r.json())
      .then((f: Feature) => {
        if (live) setIndia(f);
      })
      .catch(() => null);
    return () => {
      live = false;
    };
  }, []);

  /**
   * Countries with at least one listed gym, tinted so the map says where the
   * platform actually is. Derived from the pins rather than a country column,
   * so it is right the moment a gym lists itself anywhere on Earth.
   */
  const occupied = useMemo(() => {
    if (!world) return new Set<string>();
    const found = new Set<string>();
    for (const country of world.features as Feature[]) {
      if (placed.some((g) => geoContains(country, [g.lng, g.lat]))) {
        found.add(String(country.id));
      }
    }
    // A gym in Ladakh sits outside the default India polygon, so India's own
    // outline decides whether India counts as occupied.
    if (india && placed.some((g) => geoContains(india, [g.lng, g.lat]))) found.add(INDIA_ID);
    return found;
  }, [world, india, placed]);

  // The canvas paints with resolved token values, so it has to be told when
  // those values change — CSS alone cannot repaint a canvas.
  useEffect(() => {
    const bump = () => setThemeTick((t) => t + 1);
    const observer = new MutationObserver(bump);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", bump);
    return () => {
      observer.disconnect();
      scheme.removeEventListener("change", bump);
    };
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const projection = useMemo(() => {
    // Deliberately larger than the panel: the globe bleeds past the top and
    // bottom edges, which is what makes a country big enough to pick a pin
    // out of.
    const radius = Math.min(size.w * 0.42, size.h * 0.82) * zoom;
    return geoOrthographic()
      .scale(Math.max(radius, 1))
      .translate([size.w / 2, size.h / 2])
      .clipAngle(90);
  }, [size, zoom]);

  /** Spin to put a point in the middle of the visible face. */
  const spinTo = useCallback((lng: number, lat: number) => {
    tween.current = {
      from: [...rotation.current] as [number, number],
      to: [-lng, -lat],
      start: performance.now(),
    };
    spinning.current = false;
  }, []);

  const openGym = useCallback(
    (gym: Placed) => {
      interacted.current = true;
      setSelected(gym.code);
      spinTo(gym.lng, gym.lat);
    },
    [spinTo],
  );

  // Pins grow with the globe: unobtrusive at world scale, comfortable once
  // somebody has zoomed into a city.
  // Grows quickly over the first few steps, then settles — a pin the size of a
  // city is no more use than one too small to see.
  const pinSize = useMemo(
    () => Math.round(Math.min(PIN_MAX, PIN_MIN + Math.log2(zoom) * 5)),
    [zoom],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !world || size.w === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const styles = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;
    const ocean = token("--globe-ocean", "#101827");
    const land = token("--globe-land", "#26263a");
    const landEdge = token("--globe-land-edge", "rgba(255,255,255,0.10)");
    const grat = token("--globe-graticule", "rgba(255,255,255,0.06)");
    const brand = token("--brand", "#7c6cff");

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const graticule = geoGraticule10();
    let frame = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = now - last;
      last = now;

      if (tween.current) {
        const t = Math.min((now - tween.current.start) / 700, 1);
        // easeOutCubic — fast away, gentle arrival on the pin.
        const e = 1 - Math.pow(1 - t, 3);
        const [fx, fy] = tween.current.from;
        const ty = tween.current.to[1];
        let tx = tween.current.to[0];
        // Always take the short way round the sphere.
        while (tx - fx > 180) tx -= 360;
        while (tx - fx < -180) tx += 360;
        rotation.current = [fx + (tx - fx) * e, fy + (ty - fy) * e];
        if (t === 1) tween.current = null;
      } else if (spinning.current && !dragging.current) {
        rotation.current = [rotation.current[0] + dt * SPIN_PER_MS, rotation.current[1]];
      }

      const path = geoPath(projection.rotate(rotation.current), ctx);
      const r = projection.scale();
      const [cx, cy] = projection.translate();

      ctx.clearRect(0, 0, size.w, size.h);

      // Atmosphere: a halo just outside the limb, so the sphere sits in space
      // rather than being a flat disc pasted on the page.
      const halo = ctx.createRadialGradient(cx, cy, r * 0.96, cx, cy, r * 1.14);
      halo.addColorStop(0, `${brand}2e`);
      halo.addColorStop(1, `${brand}00`);
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.14, 0, Math.PI * 2);
      ctx.fillStyle = halo;
      ctx.fill();

      // Ocean, lit from the upper left so the sphere reads as a sphere.
      const sphere = ctx.createRadialGradient(
        cx - r * 0.35,
        cy - r * 0.4,
        r * 0.1,
        cx,
        cy,
        r * 1.05,
      );
      sphere.addColorStop(0, land);
      sphere.addColorStop(0.55, ocean);
      sphere.addColorStop(1, ocean);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = sphere;
      ctx.fill();

      ctx.beginPath();
      path(graticule);
      ctx.strokeStyle = grat;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      for (const country of world.features) {
        // Skipped and redrawn below from India's own boundaries.
        if (india && String(country.id) === INDIA_ID) continue;
        const live = occupied.has(String(country.id));
        ctx.beginPath();
        path(country);
        ctx.fillStyle = live ? `${brand}55` : land;
        ctx.fill();
        ctx.strokeStyle = live ? `${brand}dd` : landEdge;
        ctx.lineWidth = live ? 1.1 : 0.5;
        ctx.stroke();
      }

      if (india) {
        const live = occupied.has(INDIA_ID);
        ctx.beginPath();
        path(india);
        ctx.fillStyle = live ? `${brand}55` : land;
        ctx.fill();
        ctx.strokeStyle = live ? `${brand}dd` : landEdge;
        ctx.lineWidth = live ? 1.1 : 0.5;
        ctx.stroke();
      }

      // Shade the limb so the near side reads as facing the viewer.
      const shade = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.2, cx, cy, r);
      shade.addColorStop(0, "rgba(0,0,0,0)");
      shade.addColorStop(0.72, "rgba(0,0,0,0)");
      shade.addColorStop(1, "rgba(0,0,0,0.32)");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = shade;
      ctx.fill();

      // Rim light.
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `${brand}55`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pins live in the DOM so they stay clickable and readable. Anything on
      // the far side of the sphere is dropped rather than hidden, so a pin
      // behind the Earth cannot be tabbed to.
      const centre: [number, number] = [-rotation.current[0], -rotation.current[1]];
      const front = placed
        .map((gym) => {
          const point = projection([gym.lng, gym.lat]);
          const dist = geoDistance([gym.lng, gym.lat], centre);
          return {
            gym,
            x: point?.[0] ?? 0,
            y: point?.[1] ?? 0,
            dist,
            depth: Math.max(0.55, Math.cos(dist)),
          };
        })
        .filter((p) => p.dist < Math.PI / 2.15)
        // Nearest the centre first: that pin keeps its spot and absorbs the rest.
        .sort((a, b) => a.dist - b.dist || a.gym.name.localeCompare(b.gym.name));

      const {
        markers: laid,
        leaders,
        centres,
      } = layoutMarkers(
        front.map((p) => ({ gym: p.gym, x: p.x, y: p.y, depth: p.depth })),
        pinSize,
        openCityRef.current,
      );

      // Leader lines, drawn under the pins so a rosette reads as one place.
      if (leaders.length) {
        ctx.beginPath();
        for (const [ax, ay, px, py] of leaders) {
          ctx.moveTo(ax, ay);
          ctx.lineTo(px, py);
        }
        ctx.strokeStyle = `${brand}66`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // And a dot at the true location each rosette belongs to.
        for (const [rx, ry] of centres) {
          ctx.beginPath();
          ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = brand;
          ctx.fill();
        }
      }

      setMarkers(laid);

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [world, india, size, projection, placed, occupied, pinSize, themeTick]);

  // Respect a reader who does not want the thing spinning at them.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (query.matches) spinning.current = false;
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    spinning.current = false;
    interacted.current = true;
    tween.current = null;
    lastPoint.current = [e.clientX, e.clientY];
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !lastPoint.current) return;
    const [px, py] = lastPoint.current;
    const dx = e.clientX - px;
    const dy = e.clientY - py;
    // Slower drag on a bigger globe, so the feel is the same at any size.
    const k = 0.28 * (400 / Math.max(projection.scale(), 1));
    rotation.current = [
      rotation.current[0] + dx * k,
      Math.max(-80, Math.min(80, rotation.current[1] - dy * k)),
    ];
    lastPoint.current = [e.clientX, e.clientY];
  };

  const endDrag = () => {
    dragging.current = false;
    lastPoint.current = null;
  };

  // A pin on a spinning globe is a moving target, so hovering stops it.
  const hold = () => {
    spinning.current = false;
  };
  const release = () => {
    if (!interacted.current && !dragging.current && !selected) {
      spinning.current = true;
    }
  };

  /**
   * Zoom multiplies rather than adds, and goes a long way in.
   *
   * Two cities an hour apart are a pixel apart at world zoom; separating them
   * needs the globe an order of magnitude bigger, not a few percent. Additive
   * steps with a low ceiling meant the reader could never actually get down to
   * street level, so the map could only ever show them city markers.
   */
  const nudgeZoom = (factor: number) => {
    interacted.current = true;
    spinning.current = false;
    // Pulling back out drops the forced-open city, or its rosette would sit on
    // top of the neighbours it was expanded past.
    if (factor < 1) openCityRef.current = null;
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(1, z * factor)));
  };

  /** Spin to wherever the visitor is, when they ask for it. */
  const [locating, setLocating] = useState(false);
  const findMe = () => {
    if (!navigator.geolocation) return;
    interacted.current = true;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setZoom((z) => Math.max(z, 12));
        spinTo(pos.coords.longitude, pos.coords.latitude);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  };

  return (
    <div
      ref={wrapRef}
      className="relative size-full touch-none select-none"
      onPointerEnter={hold}
      onPointerLeave={release}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size.w, height: size.h }}
        className="cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        aria-label="Globe showing every gym listed on BeOnGym"
        role="img"
      />

      {markers.map((marker) => {
        if (marker.kind === "city") {
          return (
            <CityPin
              key={marker.key}
              marker={marker}
              size={pinSize}
              onOpen={() => {
                interacted.current = true;
                spinning.current = false;
                openCityRef.current = marker.key;
                // Fly in far enough that the rosette has room to open by
                // itself, rather than snapping it open at world zoom.
                setZoom((z) => Math.min(ZOOM_MAX, Math.max(z * 2.5, 14)));
                spinTo(marker.lng, marker.lat);
              }}
            />
          );
        }

        const { gym, x, y, depth, fanned } = marker;
        const isSelected = selected === gym.code;
        const isHovered = hovered === gym.code;
        const scale = depth * (isHovered || isSelected ? 1.4 : 1);
        const diameter = pinSize * scale;

        return (
          <button
            key={gym.code}
            type="button"
            onClick={() => {
              interacted.current = true;
              spinning.current = false;
              openGym(gym);
            }}
            onPointerEnter={() => setHovered(gym.code)}
            onPointerLeave={() => setHovered((h) => (h === gym.code ? null : h))}
            onFocus={() => setHovered(gym.code)}
            onBlur={() => setHovered((h) => (h === gym.code ? null : h))}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-lg outline-none",
              "focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mk-bg)]",
              isSelected || isHovered ? "z-30" : "z-10",
            )}
            style={{
              left: x,
              top: y,
              width: diameter,
              height: diameter,
              opacity: 0.5 + depth * 0.5,
              // Transitioning the size would fight the per-frame repositioning,
              // so only the lift is animated.
              filter: isHovered || isSelected ? "brightness(1.05)" : undefined,
            }}
            aria-label={`${gym.name}${gym.city ? `, ${gym.city}` : ""}`}
            title={gym.name}
          >
            <span
              className="block size-full overflow-hidden rounded-lg border border-white/80 bg-[var(--mk-panel-strong)]"
              style={{
                boxShadow: `0 1px 6px rgba(0,0,0,0.5)${
                  isHovered || isSelected
                    ? `, 0 0 ${14 * depth}px ${gym.accentColor ?? "#7c6cff"}`
                    : ""
                }`,
              }}
            >
              {gym.imageUrl ? (
                // Data URL already sized to 320px — next/image would add nothing.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={gym.imageUrl} alt="" className="size-full object-cover" />
              ) : (
                <span
                  className="flex size-full items-center justify-center font-bold text-white"
                  style={{
                    background: gym.accentColor ?? "var(--brand)",
                    fontSize: Math.max(8, diameter * 0.34),
                  }}
                >
                  {gym.logoText ?? gym.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </span>

            {isHovered ? (
              <span className="pointer-events-none absolute top-full left-1/2 mt-1.5 -translate-x-1/2 rounded-md border border-[var(--mk-border-strong)] bg-[var(--mk-bg)]/95 px-2 py-1 text-[11.5px] font-medium whitespace-nowrap shadow-lg backdrop-blur">
                {gym.name}
                <span className="text-[var(--mk-fg-subtle)]">
                  {" · "}
                  {businessType(gym.businessType).short}
                  {fanned && gym.city ? ` · ${gym.city}` : ""}
                </span>
              </span>
            ) : null}
          </button>
        );
      })}

      {/* Zoom and locate, bottom-right of the canvas */}
      <div className="absolute right-3 bottom-3 z-20 flex flex-col gap-1.5 sm:right-6 sm:bottom-6">
        <GlobeControl label="Zoom in" onClick={() => nudgeZoom(1.8)} disabled={zoom >= ZOOM_MAX}>
          <Plus className="size-4" />
        </GlobeControl>
        <GlobeControl label="Zoom out" onClick={() => nudgeZoom(1 / 1.8)} disabled={zoom <= 1}>
          <Minus className="size-4" />
        </GlobeControl>
        <GlobeControl label="Find gyms near me" onClick={findMe} disabled={locating}>
          <LocateFixed className={cn("size-4", locating && "animate-pulse")} />
        </GlobeControl>
      </div>

      {exploreGyms.length > 0 ? (
        <div className="pointer-events-none absolute inset-0 hidden p-4 sm:block sm:p-6">
          <div className="mx-auto flex h-full max-w-7xl items-end justify-end">
            <div className="pointer-events-auto mr-12 w-[260px] rounded-2xl border border-[var(--mk-border-strong)] bg-[var(--mk-bg)]/80 p-3 backdrop-blur-xl">
              <p className="px-1 pb-2 text-[11px] font-semibold tracking-[0.14em] text-[var(--mk-fg-subtle)] uppercase">
                Explore businesses
              </p>
              <ul className="space-y-0.5">
                {exploreGyms.map((gym, i) => (
                  <li key={gym.code}>
                    <button
                      type="button"
                      onClick={() => openGym(gym)}
                      onPointerEnter={() => setHovered(gym.code)}
                      onPointerLeave={() => setHovered((h) => (h === gym.code ? null : h))}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-[var(--mk-panel-strong)]",
                        selected === gym.code && "bg-[var(--mk-panel-strong)]",
                      )}
                    >
                      <span className="w-3 shrink-0 text-[11px] tabular-nums text-[var(--mk-fg-subtle)]">
                        {i + 1}
                      </span>
                      <GymAvatar gym={gym} className="size-6 rounded-md text-[9px]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium">{gym.name}</span>
                        <span className="block truncate text-[11px] text-[var(--mk-fg-subtle)]">
                          {gym.city}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {selectedGym ? (
        <div className="absolute inset-x-3 bottom-3 z-30 sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[320px]">
          <GlobeGymCard gym={selectedGym} onClose={() => setSelected(null)} />
        </div>
      ) : (
        <p className="pointer-events-none absolute inset-x-0 bottom-3 z-10 text-center text-[12px] text-[var(--mk-fg-subtle)] sm:bottom-4">
          Drag to spin · tap a gym to see it
        </p>
      )}
    </div>
  );
}

/**
 * A city too dense to draw gym by gym at this zoom.
 *
 * It shows what it is — the place, the count, and a glimpse of the logos
 * underneath — and nothing that could be mistaken for a single gym. Clicking it
 * flies in until the rosette fits.
 */
function CityPin({
  marker,
  size,
  onOpen,
}: {
  marker: LaidOutCity<Placed>;
  size: number;
  onOpen: () => void;
}) {
  const preview = marker.members.slice(0, 3);
  const chip = Math.round(size * 0.82);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mk-bg)]"
      style={{ left: marker.x, top: marker.y, opacity: 0.6 + marker.depth * 0.4 }}
      aria-label={`${marker.city}: ${marker.members.length} gyms. Zoom in to see them.`}
      title={`${marker.city} · ${marker.members.length} gyms`}
    >
      <span className="flex items-center gap-1.5 rounded-full border border-[var(--mk-border-strong)] bg-[var(--mk-bg)]/92 py-1 pr-2.5 pl-1 shadow-lg backdrop-blur-xl transition-transform hover:scale-105">
        <span className="flex -space-x-2">
          {preview.map((gym) => (
            <span
              key={gym.code}
              className="flex items-center justify-center overflow-hidden rounded-full border border-[var(--mk-bg)] font-bold text-white"
              style={{
                width: chip,
                height: chip,
                background: gym.accentColor ?? "var(--brand)",
                fontSize: Math.max(7, chip * 0.4),
              }}
            >
              {gym.imageUrl ? (
                // Data URL already sized to 320px — next/image would add nothing.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={gym.imageUrl} alt="" className="size-full object-cover" />
              ) : (
                (gym.logoText ?? gym.name.slice(0, 2).toUpperCase())
              )}
            </span>
          ))}
        </span>
        <span className="text-[11.5px] leading-none font-semibold whitespace-nowrap">
          {marker.city}
          <span className="ml-1 text-[var(--mk-fg-subtle)]">{marker.members.length}</span>
        </span>
      </span>
    </button>
  );
}

function GlobeControl({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex size-8 items-center justify-center rounded-lg border border-[var(--mk-border-strong)] bg-[var(--mk-bg)]/80 text-[var(--mk-fg-muted)] backdrop-blur-xl hover:text-[var(--mk-fg)] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function GymAvatar({ gym, className }: { gym: DirectoryGym; className?: string }) {
  if (gym.imageUrl) {
    return (
      // Data URL already sized to 320px — next/image would add nothing.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={gym.imageUrl} alt="" className={cn("shrink-0 object-cover", className)} />
    );
  }
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center font-bold text-white", className)}
      style={{ background: gym.accentColor ?? "var(--brand)" }}
      aria-hidden
    >
      {gym.logoText ?? gym.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function GlobeGymCard({ gym, onClose }: { gym: Placed; onClose: () => void }) {
  return (
    <div className="rounded-2xl border border-[var(--mk-border-strong)] bg-[var(--mk-bg)]/92 p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <GymAvatar gym={gym} className="size-11 rounded-xl text-[14px]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-semibold">{gym.name}</p>
          {/* What the place actually is. The map used to call a Pilates studio
              a gym, which is the small wrongness that makes a directory feel
              like it was not built for you. */}
          <p className="mt-0.5 text-[11px] font-medium tracking-[0.06em] text-[var(--brand)] uppercase">
            {businessType(gym.businessType).short}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--mk-fg-muted)]">
            <MapPin className="size-3" />
            {[gym.city, gym.country].filter(Boolean).join(", ") || "On the map"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mt-1 -mr-1 rounded-lg p-1.5 text-[var(--mk-fg-subtle)] hover:bg-[var(--mk-panel-strong)] hover:text-[var(--mk-fg)]"
          aria-label="Close"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {gym.tagline ? (
        <p className="mt-3 line-clamp-2 text-[12.5px] text-[var(--mk-fg-muted)]">{gym.tagline}</p>
      ) : null}

      {/* Every pin on this globe belongs to a paying gym, so every pin has a
          store to open. The owner's own links sit under it when they added
          any — that is the shortest path from a searcher to the gym's phone. */}
      <div className="mt-3 flex items-center gap-2">
        <Link
          href={`/gyms/${gym.code}`}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-2 text-[13px] font-medium text-[var(--brand-foreground)] hover:bg-[var(--brand-hover)]"
        >
          View gym <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {gym.links.length > 0 ? <GymLinks links={gym.links} size="sm" className="mt-2.5" /> : null}
    </div>
  );
}
