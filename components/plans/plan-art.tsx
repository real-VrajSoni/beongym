/**
 * Per-card visual identity for programmes.
 *
 * Each card gets its own colourway and a line-art motif drawn from gym
 * equipment. Everything is inline SVG and CSS gradients — no photography, so
 * it stays sharp at any size, themes correctly in light and dark, and adds no
 * network weight. Motifs sit behind the content at low opacity and are
 * aria-hidden.
 */

export type PlanTheme = {
  key: string;
  /** Gradient behind the whole card. */
  surface: string;
  /** Glow tint used for the hover state and the price. */
  accent: string;
  /** Tint for the motif strokes. */
  ink: string;
};

export const PLAN_THEMES: PlanTheme[] = [
  {
    key: "violet",
    surface:
      "radial-gradient(30rem 16rem at 88% -10%, rgba(143,128,255,0.40), transparent 62%), linear-gradient(160deg, rgba(143,128,255,0.15), transparent 55%)",
    accent: "#9f92ff",
    ink: "#b3a8ff",
  },
  {
    key: "ember",
    surface:
      "radial-gradient(30rem 16rem at 88% -10%, rgba(255,138,76,0.40), transparent 62%), linear-gradient(160deg, rgba(255,138,76,0.15), transparent 55%)",
    accent: "#ff8a4c",
    ink: "#ffa876",
  },
  {
    key: "teal",
    surface:
      "radial-gradient(30rem 16rem at 88% -10%, rgba(45,212,191,0.36), transparent 62%), linear-gradient(160deg, rgba(45,212,191,0.13), transparent 55%)",
    accent: "#2dd4bf",
    ink: "#5eead4",
  },
  {
    key: "coral",
    surface:
      "radial-gradient(30rem 16rem at 88% -10%, rgba(240,115,106,0.38), transparent 62%), linear-gradient(160deg, rgba(240,115,106,0.14), transparent 55%)",
    accent: "#f0736a",
    ink: "#f5978f",
  },
  {
    key: "sky",
    surface:
      "radial-gradient(30rem 16rem at 88% -10%, rgba(90,162,245,0.34), transparent 62%), linear-gradient(160deg, rgba(90,162,245,0.13), transparent 55%)",
    accent: "#5aa2f5",
    ink: "#8dc0f9",
  },
  {
    key: "rose",
    surface:
      "radial-gradient(30rem 16rem at 88% -10%, rgba(240,112,159,0.34), transparent 62%), linear-gradient(160deg, rgba(240,112,159,0.13), transparent 55%)",
    accent: "#f0709f",
    ink: "#f59ec0",
  },
];

export function themeFor(index: number): PlanTheme {
  return PLAN_THEMES[index % PLAN_THEMES.length];
}

const STROKE = {
  fill: "none",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Barbell across a rack. */
function Barbell({ c }: { c: string }) {
  return (
    <g stroke={c} {...STROKE}>
      <path d="M14 40h132" />
      <rect x="30" y="28" width="12" height="24" rx="3" />
      <rect x="46" y="20" width="16" height="40" rx="4" />
      <rect x="98" y="20" width="16" height="40" rx="4" />
      <rect x="118" y="28" width="12" height="24" rx="3" />
      <path d="M8 24v32M152 24v32" />
    </g>
  );
}

/** Dumbbell at an angle. */
function Dumbbell({ c }: { c: string }) {
  return (
    <g stroke={c} {...STROKE}>
      <path d="M46 64 114 20" />
      <rect x="16" y="60" width="14" height="26" rx="4" transform="rotate(-33 23 73)" />
      <rect x="32" y="52" width="18" height="34" rx="5" transform="rotate(-33 41 69)" />
      <rect x="110" y="0" width="18" height="34" rx="5" transform="rotate(-33 119 17)" />
      <rect x="128" y="-6" width="14" height="26" rx="4" transform="rotate(-33 135 7)" />
    </g>
  );
}

/** Kettlebell. */
function Kettlebell({ c }: { c: string }) {
  return (
    <g stroke={c} {...STROKE}>
      <path d="M60 34a20 20 0 0 1 40 0" />
      <path d="M62 34c-16 8-26 24-26 42a44 44 0 0 0 88 0c0-18-10-34-26-42z" />
      <path d="M66 46h28" />
    </g>
  );
}

/** Stacked weight plates. */
function Plates({ c }: { c: string }) {
  return (
    <g stroke={c} {...STROKE}>
      <circle cx="52" cy="48" r="34" />
      <circle cx="52" cy="48" r="12" />
      <circle cx="118" cy="48" r="26" />
      <circle cx="118" cy="48" r="9" />
      <path d="M86 48h6" />
    </g>
  );
}

/** Heart-rate trace. */
function Pulse({ c }: { c: string }) {
  return (
    <g stroke={c} {...STROKE}>
      <path d="M4 52h30l10-26 14 52 12-38 10 20h16l10-14 12 22h40" />
    </g>
  );
}

/** Running track lanes. */
function Track({ c }: { c: string }) {
  return (
    <g stroke={c} {...STROKE}>
      <rect x="10" y="16" width="140" height="64" rx="32" />
      <rect x="26" y="30" width="108" height="36" rx="18" />
      <path d="M80 16v14M80 66v14" />
    </g>
  );
}

const MOTIFS = [Barbell, Dumbbell, Kettlebell, Plates, Pulse, Track];

export function PlanMotif({ index, className }: { index: number; className?: string }) {
  const Motif = MOTIFS[index % MOTIFS.length];
  const theme = themeFor(index);
  return (
    <svg
      aria-hidden
      viewBox="0 0 160 96"
      className={className}
      style={{ opacity: 0.32 }}
      preserveAspectRatio="xMidYMid meet"
    >
      <Motif c={theme.ink} />
    </svg>
  );
}
