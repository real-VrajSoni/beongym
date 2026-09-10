/**
 * What the hero says, drawn in the space beside it.
 *
 * The headline is "Run your gym like it's 2026", so the empty columns either
 * side hold the year it is being run like instead: the register, the payment
 * notebook, the attendance sheet, the WhatsApp group. Struck through, drifting
 * slowly, tilted, the way a stack of forms sits on a desk nobody has time to
 * tidy.
 *
 * It is decoration, but it is decoration that argues. Filling that space with
 * abstract orbs would have been easier and would have said nothing; these are
 * the five things the product replaces, named, in the reader's periphery while
 * they read the sentence that promises to take them away.
 *
 * Server-rendered and CSS-only — no JavaScript, no layout shift, nothing to
 * hydrate. Hidden below `xl`, where there is no side space to use and the
 * chips would crowd the headline instead of framing it.
 */

type Drift = {
  label: string;
  /** Which side, and how far in from the page edge. */
  side: "left" | "right";
  inset: string;
  top: string;
  rotate: string;
  /** Seconds. Varied so the group never pulses in unison. */
  duration: number;
  delay: number;
  tint: string;
};

const PAPERS: Drift[] = [
  {
    label: "The register",
    side: "left",
    inset: "3.5rem",
    top: "16%",
    rotate: "-8deg",
    duration: 13,
    delay: 0,
    tint: "#7c6cff",
  },
  {
    label: "Payment notebook",
    side: "left",
    inset: "1.5rem",
    top: "44%",
    rotate: "5deg",
    duration: 17,
    delay: 1.6,
    tint: "#3ecf7e",
  },
  {
    label: "Attendance sheet",
    side: "left",
    inset: "5rem",
    top: "70%",
    rotate: "-4deg",
    duration: 15,
    delay: 3.1,
    tint: "#2dd4bf",
  },
  {
    label: "The spreadsheet",
    side: "right",
    inset: "3rem",
    top: "22%",
    rotate: "7deg",
    duration: 16,
    delay: 0.8,
    tint: "#e8a33d",
  },
  {
    label: "WhatsApp follow-ups",
    side: "right",
    inset: "1.25rem",
    top: "52%",
    rotate: "-6deg",
    duration: 14,
    delay: 2.4,
    tint: "#f0709f",
  },
  {
    label: "A drawer of forms",
    side: "right",
    inset: "4.5rem",
    top: "76%",
    rotate: "4deg",
    duration: 18,
    delay: 4,
    tint: "#8c8cff",
  },
];

export function HeroAmbience() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block">
      {/* Two slow washes of colour, so the columns are not simply flat. */}
      <div
        className="absolute top-[12%] -left-24 size-[28rem] rounded-full opacity-[0.55] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--brand) 26%, transparent), transparent 70%)",
          animation: "mk-float 22s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-[38%] -right-24 size-[26rem] rounded-full opacity-[0.5] blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(47, 198, 191, 0.28), transparent 70%)",
          animation: "mk-float 26s ease-in-out infinite reverse",
        }}
      />

      {PAPERS.map((p) => (
        <span
          key={p.label}
          className="absolute rounded-xl border px-3.5 py-2.5 text-[12.5px] font-medium whitespace-nowrap backdrop-blur-sm"
          style={{
            [p.side]: p.inset,
            top: p.top,
            borderColor: `color-mix(in srgb, ${p.tint} 30%, transparent)`,
            background: `color-mix(in srgb, ${p.tint} 9%, var(--mk-panel))`,
            color: "var(--mk-fg-muted)",
            // The tilt lives in the keyframes too, so the drift rotates around
            // the angle the chip already sits at rather than snapping upright.
            ["--tilt" as string]: p.rotate,
            transform: `rotate(${p.rotate})`,
            animation: `mk-drift ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        >
          <s className="opacity-70">{p.label}</s>
        </span>
      ))}
    </div>
  );
}
