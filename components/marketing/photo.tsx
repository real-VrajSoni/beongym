"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * A marketing photograph, optimised, over painted artwork.
 *
 * These were CSS `background-image`s, which meant the browser fetched whatever
 * file was on disk at whatever size and format it happened to be — a 2400px
 * JPEG served to a 400px card on a phone. `next/image` re-encodes to AVIF or
 * WebP, generates the sizes each breakpoint actually needs, and serves the
 * smallest one that fits. Same photograph, a fraction of the bytes, and
 * sharper on a retina screen because it can serve 2x where it matters.
 *
 * `onError` is the reason this is a client component. The painted gradient
 * behind each card is what shows when a photograph has not been dropped in
 * yet, and a plain <img> pointing at a missing file would put a broken-image
 * icon on top of it. Hiding the element on error keeps that graceful.
 */
export function MarketingPhoto({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      // Three across on a wide screen, one on a phone. Without this Next
      // assumes full-viewport width and ships a needlessly large file.
      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
      quality={82}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
