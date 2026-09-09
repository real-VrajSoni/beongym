import { LogoMark } from "@/components/brand/logo";
import { BRAND } from "@/lib/brand";

/**
 * The dark showcase panel beside the auth forms.
 *
 * Built entirely from gradients and inline SVG: a soft spotlight, a plate-rack
 * motif and a faint contour field. No photography, so it stays crisp at any
 * size and adds nothing to the page weight.
 */
export function AuthBackdrop({
  eyebrow,
  headline,
  sub,
  points,
  footer,
}: {
  eyebrow: string;
  headline: React.ReactNode;
  sub: string;
  points: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }[];
  footer: string;
}) {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-[#07070c] p-10 text-white lg:flex xl:p-12">
      {/* Spotlight + colour wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(70rem 46rem at 10% -16%, rgba(143,128,255,0.36), transparent 56%), radial-gradient(48rem 34rem at 98% 106%, rgba(47,198,191,0.20), transparent 60%), radial-gradient(28rem 28rem at 82% 14%, rgba(240,112,159,0.10), transparent 66%), linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.5))",
        }}
      />

      {/* Contour field */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] w-full opacity-[0.10]"
        preserveAspectRatio="none"
        viewBox="0 0 600 400"
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <path
            key={i}
            d={`M-40 ${40 + i * 46} C 150 ${-10 + i * 46}, 320 ${130 + i * 46}, 660 ${30 + i * 46}`}
            fill="none"
            stroke="white"
            strokeWidth="1"
          />
        ))}
      </svg>

      {/* Plate rack */}
      <svg
        aria-hidden
        className="pointer-events-none absolute right-[-3rem] bottom-[-2rem] h-64 w-64 opacity-[0.18]"
        viewBox="0 0 200 200"
        fill="none"
        stroke="white"
        strokeWidth="2"
      >
        <circle cx="62" cy="120" r="46" />
        <circle cx="62" cy="120" r="15" />
        <circle cx="140" cy="132" r="34" />
        <circle cx="140" cy="132" r="11" />
        <path d="M20 176h170" strokeLinecap="round" />
      </svg>

      <div className="relative flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
          <LogoMark className="size-5" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">{BRAND.name}</span>
      </div>

      <div className="relative max-w-md">
        <p className="text-[11.5px] font-semibold tracking-[0.18em] text-white/45 uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-4 text-[32px] leading-[1.12] font-semibold tracking-[-0.02em] xl:text-[38px]">
          {headline}
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-white/55">{sub}</p>

        <ul className="mt-10 space-y-5">
          {points.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3.5">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] backdrop-blur">
                <Icon className="size-4 text-white/75" />
              </span>
              <div>
                <p className="text-[13.5px] font-medium">{title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-white/45">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-[12.5px] text-white/30">{footer}</p>
    </div>
  );
}
