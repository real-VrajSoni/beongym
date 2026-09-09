"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoEquirectangular, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import type { FeatureCollection } from "geojson";
import { Crosshair, Globe2, Loader2, MapPin, Minus, Plus } from "lucide-react";
import { geocodeCityAction, type GeocodeHit } from "@/app/actions/geocode";

/** Multiplier over the world-fitting scale when a city has been found. */
const CITY_ZOOM = 18;
/** Past this, the 110m outlines look like broken glass — load the finer set. */
const DETAIL_AT = 6;

/**
 * Drops the gym's pin on a world map.
 *
 * Typing a city moves the map to it and drops the pin — that is the path
 * almost everyone takes. Clicking is the escape hatch for a pin that belongs
 * on a particular street rather than a city centre, and for the places no
 * geocoder knows.
 */
export function MapPicker({
  latName = "latitude",
  lngName = "longitude",
  city,
  value,
  height = 220,
}: {
  latName?: string;
  lngName?: string;
  /** The city field this picker follows. */
  city?: string | null;
  value?: { lat: number | null; lng: number | null };
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [world, setWorld] = useState<FeatureCollection | null>(null);
  const [width, setWidth] = useState(0);
  const [themeTick, setThemeTick] = useState(0);

  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    value?.lat != null && value?.lng != null ? { lat: value.lat, lng: value.lng } : null,
  );
  const [centre, setCentre] = useState<[number, number]>(
    value?.lat != null && value?.lng != null ? [value.lng, value.lat] : [10, 20],
  );
  const [zoom, setZoom] = useState(value?.lat != null ? CITY_ZOOM : 1);
  /** The last lookup, tagged with the query it answers. */
  const [result, setResult] = useState<{ query: string; hit: GeocodeHit | null } | null>(null);
  const [looking, setLooking] = useState(false);

  const dragging = useRef(false);
  const moved = useRef(false);
  const last = useRef<[number, number] | null>(null);
  /** The city string whose pin the person has since overridden by hand. */
  const overridden = useRef<string | null>(null);

  // ── Follow the city field ────────────────────────────────
  const typed = (city ?? "").trim();
  useEffect(() => {
    if (typed.length < 2) return;
    let live = true;
    // Debounced: nobody wants a lookup per keystroke, least of all Nominatim.
    const timer = setTimeout(async () => {
      setLooking(true);
      const hit = await geocodeCityAction(typed);
      if (!live) return;
      setLooking(false);
      setResult({ query: typed, hit });
      if (!hit) return;
      // A pin the person placed by hand for this city stays where they put it.
      if (overridden.current === typed.toLowerCase()) return;
      setPin({ lat: hit.lat, lng: hit.lng });
      setCentre([hit.lng, hit.lat]);
      setZoom(CITY_ZOOM);
    }, 450);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [typed]);

  // Derived, so a half-typed city never shows the previous city's answer.
  const answered = result?.query === typed ? result : null;
  const found = answered?.hit ?? null;
  const missed = answered !== null && answered.hit === null;

  /**
   * 110 KB of coastline is plenty for a world view and loads instantly. The
   * 756 KB set only gets fetched if somebody actually zooms in far enough to
   * see the difference, and only once.
   */
  const detailed = useRef(false);
  const wantDetail = zoom >= DETAIL_AT;
  useEffect(() => {
    if (detailed.current && !wantDetail) return;
    const file = wantDetail ? "countries-50m.json" : "countries-110m.json";
    if (wantDetail) detailed.current = true;
    let live = true;
    fetch(`/geo/${file}`)
      .then((r) => r.json())
      .then((topo: Topology) => {
        if (!live) return;
        setWorld(feature(topo, topo.objects.countries) as unknown as FeatureCollection);
      })
      .catch(() => null);
    return () => {
      live = false;
    };
  }, [wantDetail]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const bump = () => setThemeTick((t) => t + 1);
    const observer = new MutationObserver(bump);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const projection = useMemo(() => {
    const base = Math.max(width / (2 * Math.PI), 1);
    return geoEquirectangular()
      .scale(base * zoom)
      .center(centre)
      .translate([width / 2, height / 2]);
  }, [width, height, zoom, centre]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !world || width === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const styles = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;
    const ocean = token("--globe-ocean", "#0a1020");
    const land = token("--globe-land", "#32324e");
    const edge = token("--globe-land-edge", "rgba(255,255,255,0.16)");

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, width, height);

    const path = geoPath(projection, ctx);
    for (const country of world.features) {
      ctx.beginPath();
      path(country);
      ctx.fillStyle = land;
      ctx.fill();
      ctx.strokeStyle = edge;
      ctx.lineWidth = zoom > 8 ? 0.8 : 0.4;
      ctx.stroke();
    }
  }, [world, width, height, projection, zoom, themeTick]);

  const point = pin ? projection([pin.lng, pin.lat]) : null;

  const panBy = useCallback(
    (dx: number, dy: number) => {
      const next = projection.invert?.([width / 2 - dx, height / 2 - dy]);
      if (next) setCentre([next[0], next[1]]);
    },
    [projection, width, height],
  );

  function onPointerDown(e: React.PointerEvent) {
    dragging.current = true;
    moved.current = false;
    last.current = [e.clientX, e.clientY];
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current || !last.current) return;
    const dx = e.clientX - last.current[0];
    const dy = e.clientY - last.current[1];
    if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
    panBy(dx, dy);
    last.current = [e.clientX, e.clientY];
  }

  function onPointerUp(e: React.PointerEvent) {
    const wasDrag = moved.current;
    dragging.current = false;
    last.current = null;
    if (wasDrag) return;

    // A plain click places the pin.
    const rect = e.currentTarget.getBoundingClientRect();
    const coords = projection.invert?.([e.clientX - rect.left, e.clientY - rect.top]);
    if (!coords) return;
    setPin({ lat: Number(coords[1].toFixed(4)), lng: Number(coords[0].toFixed(4)) });
    overridden.current = typed.toLowerCase() || null;
  }

  const nudge = (factor: number) => setZoom((z) => Math.min(220, Math.max(1, z * factor)));

  return (
    <div>
      <input type="hidden" name={latName} value={pin ? pin.lat : ""} />
      <input type="hidden" name={lngName} value={pin ? pin.lng : ""} />

      <div
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="relative touch-none cursor-crosshair overflow-hidden rounded-xl border border-[var(--border)] select-none active:cursor-grabbing"
        style={{ height }}
      >
        <canvas ref={canvasRef} style={{ width, height }} aria-hidden />

        {point ? (
          <span
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: point[0], top: point[1] }}
          >
            <span className="block size-3.5 rounded-full border-2 border-white bg-[var(--brand)] shadow-[0_0_12px_var(--brand)]" />
          </span>
        ) : null}

        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <PickerControl label="Zoom in" onClick={() => nudge(1.8)}>
            <Plus className="size-3.5" />
          </PickerControl>
          <PickerControl label="Zoom out" onClick={() => nudge(1 / 1.8)}>
            <Minus className="size-3.5" />
          </PickerControl>
          <PickerControl
            label="Whole world"
            onClick={() => {
              setZoom(1);
              setCentre([10, 20]);
            }}
          >
            <Globe2 className="size-3.5" />
          </PickerControl>
        </div>

        {!pin ? (
          <span className="pointer-events-none absolute inset-x-0 bottom-3 flex items-center justify-center gap-2 text-[12px] text-white/70">
            <Crosshair className="size-3.5" /> Type a city above, or click to place your gym
          </span>
        ) : null}
      </div>

      <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-muted-foreground">
        {looking ? (
          <>
            <Loader2 className="size-3 animate-spin" /> Looking up {typed}…
          </>
        ) : found ? (
          <>
            <MapPin className="size-3 text-[var(--brand)]" />
            <span className="font-medium text-foreground">{found.label}</span>
            {pin ? (
              <span className="font-mono">
                · {pin.lat.toFixed(3)}, {pin.lng.toFixed(3)}
              </span>
            ) : null}
            <span>— drag to pan, click to fine-tune.</span>
          </>
        ) : missed ? (
          <span className="text-[var(--warning)]">
            We couldn&rsquo;t find “{typed}”. Zoom out and click your spot on the map instead.
          </span>
        ) : pin ? (
          <>
            Pin at{" "}
            <span className="font-mono">
              {pin.lat.toFixed(3)}, {pin.lng.toFixed(3)}
            </span>{" "}
            — click anywhere to move it.
          </>
        ) : (
          "Type a city above and we'll find it for you."
        )}
      </p>
    </div>
  );
}

function PickerControl({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      // The map places a pin on click; these must not do both.
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded-md border border-white/15 bg-black/45 text-white/80 backdrop-blur hover:text-white"
    >
      {children}
    </button>
  );
}
