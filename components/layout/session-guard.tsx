"use client";

import { useEffect } from "react";

/**
 * Makes Back mean Back after a sign-out.
 *
 * Browsers keep a live copy of a rendered page in the back/forward cache and
 * restore it without asking the server, so pressing Back after signing out puts
 * somebody's dashboard — their members, their revenue — straight back on
 * screen, on what is very often a shared front-desk machine. Only
 * `Cache-Control: no-store` prevents that, and Next rewrites the header on
 * dynamic pages, so the reliable fix is here: when a page is restored from the
 * cache rather than loaded, reload it and let the server decide who is asking.
 *
 * The reload is free when the session is still good — the page comes straight
 * back — and sends a signed-out visitor to /login, which is the point.
 */
export function SessionGuard() {
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  return null;
}
