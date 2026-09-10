# Marketing photography

Three files, referenced by `components/marketing/niches.tsx`:

| File | What it should show |
| --- | --- |
| `gym-floor.jpg` | A working gym floor — free weights, people mid-set |
| `studios.jpg` | A multi-discipline space — yoga, dance, MMA, CrossFit in one frame |
| `chain.jpg` | A large branded club, ideally multi-level, reception in view |

## What happens to them

They are served through `next/image`, which re-encodes to AVIF (WebP behind it),
generates the widths each breakpoint actually needs, and serves the smallest one
that fits. So drop in the largest, cleanest original you have — **2000–2400px
wide is ideal** — and let the build do the compressing. Shipping a
pre-squashed 400 KB JPEG only means starting from a worse source; the optimiser
cannot put back detail that has already been thrown away.

Landscape. File size of the original does not matter much (a few MB is fine);
what reaches a visitor is the re-encoded version, typically well under 100 KB.

## If a file is missing

Each card is painted with a gradient behind the photograph, and the image
element removes itself on error — so a missing file degrades to artwork rather
than a broken-image icon. That is why the section still looks finished before
these are added.
